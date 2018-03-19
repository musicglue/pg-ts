import { Either } from "fp-ts/lib/Either";
import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither";
import { Pool } from "pg";
import { mapCatchToError } from "./errors";
import { ParserSetup } from "./parser";
import { QueryConnection } from "./query";

const defaultTxOptions: TxOptions = {
  deferrable: false,
  isolation: "READ COMMITTED",
  readOnly: false,
};

const eitherToPromise = <L, R>(either: Either<L, R>) =>
  either.fold(l => Promise.reject(l), r => Promise.resolve(r));

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

export type TransactionScope<T> = (tx: QueryConnection) => TaskEither<Error, T>;

export interface BeginTransaction {
  <T>(x: TxOptions, y: TransactionScope<T>): TaskEither<Error, T>;
  <T>(x: TransactionScope<T>): TaskEither<Error, T>;
}

export const makeTransactionFactory = (pool: Pool, parserSetup: ParserSetup): BeginTransaction => {
  return t;

  function t<T>(x: TxOptions, y: TransactionScope<T>): TaskEither<Error, T>;
  function t<T>(x: TransactionScope<T>): TaskEither<Error, T>;
  function t<T>(x: any, y?: any): TaskEither<Error, T> {
    const opts: TxOptions = typeof x === "function" ? defaultTxOptions : x;
    const transactionScope: TransactionScope<T> = typeof x === "function" ? x : y;

    return parserSetup.chain(() =>
      tryCatch(
        () =>
          pool.connect().then(client => {
            const opening = ["BEGIN TRANSACTION", `ISOLATION LEVEL ${opts.isolation}`];

            if (opts.readOnly) {
              opening.push("READ ONLY");
            }
            if (opts.deferrable) {
              opening.push("DEFERRABLE");
            }

            return Promise.resolve(opening.join(" "))
              .then(openings => client.query(openings))
              .then(() =>
                transactionScope({ connection: client, parserSetup })
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
              });
          }),
        mapCatchToError,
      ),
    );
  }
};
