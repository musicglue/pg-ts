import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither";
import { Pool } from "pg";
import { PgConnection } from "./connection";
import { mapCatchToError } from "./errors";
import { eitherToPromise } from "./utils/eitherToPromise";

export const defaultTxOptions: TxOptions = {
  deferrable: false,
  isolation: "READ COMMITTED",
  readOnly: false,
};

export type TxIsolationLevel =
  | "READ UNCOMMITTED"
  | "READ COMMITTED"
  | "REPEATABLE READ"
  | "SERIALIZABLE";

export interface TxOptions {
  readonly deferrable: boolean;
  readonly isolation: TxIsolationLevel;
  readonly readOnly: boolean;
}

export type TransactionScope<T> = (tx: PgConnection) => TaskEither<Error, T>;

const applyTransactionToClient = <T>(connection: PgConnection, scope: TransactionScope<T>) =>
  scope(connection)
    .run()
    .then(eitherToPromise);

const applyTransactionToPool = <T>(
  connection: PgConnection,
  pool: Pool,
  scope: TransactionScope<T>,
  opts: TxOptions,
) => {
  const opening = ["BEGIN TRANSACTION", `ISOLATION LEVEL ${opts.isolation}`];

  if (opts.readOnly) {
    opening.push("READ ONLY");
  }
  if (opts.deferrable) {
    opening.push("DEFERRABLE");
  }

  return pool.connect().then(client =>
    Promise.resolve(opening.join(" "))
      .then(openings => client.query(openings))
      .then(() =>
        scope(connection)
          .run()
          .then(eitherToPromise),
      )
      .then(results => {
        const commit = client.query("COMMIT;");

        commit.then(() => client.release());

        return commit.then(() => results);
      })
      .catch(err => {
        const rollback = client.query("ROLLBACK;");

        rollback.then(() => client.release());

        return Promise.reject(err);
      }),
  );
};

export function beginTransaction<T>(
  x: TxOptions,
  y: TransactionScope<T>,
): (connection: PgConnection) => TaskEither<Error, T>;
export function beginTransaction<T>(
  x: TransactionScope<T>,
): (connection: PgConnection) => TaskEither<Error, T>;
export function beginTransaction<T>(
  x: any,
  y?: any,
): (connection: PgConnection) => TaskEither<Error, T> {
  const opts: TxOptions = typeof x === "function" ? defaultTxOptions : x;
  const transactionScope: TransactionScope<T> = typeof x === "function" ? x : y;

  return connection => {
    const { pg } = connection;

    return connection.parserSetup.chain(() =>
      tryCatch(
        () =>
          pg instanceof Pool
            ? applyTransactionToPool(connection, pg, transactionScope, opts)
            : applyTransactionToClient(connection, transactionScope),
        mapCatchToError,
      ),
    );
  };
}
