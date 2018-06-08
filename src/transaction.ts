import { Either } from "fp-ts/lib/Either";
import { constant } from "fp-ts/lib/function";
import { ask, fromTaskEither, ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { tryCatch } from "fp-ts/lib/TaskEither";
import {
  catchAsUnhandledTransactionError,
  ensureAsUnhandledTransactionError,
  PgTransactionRollbackError,
} from "./errors";
import { Connection, ConnectionE, QueryResult, TxOptions } from "./types";
import { eitherToPromise } from "./utils/eitherToPromise";
import { SQL } from "./utils/sql";

export const defaultTxOptions: TxOptions = {
  deferrable: false,
  isolation: "READ COMMITTED",
  readOnly: false,
};

const beginTransactionQuery = ({ deferrable, isolation, readOnly }: TxOptions) => SQL`
  BEGIN TRANSACTION
  ISOLATION LEVEL ${() => isolation}
  ${() => (readOnly ? "READ ONLY" : "")}
  ${() => (deferrable ? "DEFERRABLE" : "")}
`;

const executeTransaction = <A>(
  connection: Connection,
  opts: TxOptions,
  contents: () => Promise<Either<Error, A>>,
) =>
  connection.query(beginTransactionQuery(opts)).chain(() =>
    tryCatch(
      () =>
        contents()
          .then(eitherToPromise)
          .then(a =>
            connection
              .query(SQL`COMMIT;`)
              .run()
              .then(eitherToPromise)
              .then(constant(a)),
          )
          .catch(err =>
            connection
              .query(SQL`ROLLBACK;`)
              .run()
              .then(eitherToPromise)
              .catch(rollbackErr => Promise.reject(new PgTransactionRollbackError(rollbackErr)))
              .then(() => Promise.reject(err)),
          ),
      ensureAsUnhandledTransactionError,
    ),
  );

export function withTransaction<E, A>(
  x: Partial<TxOptions>,
  y: ReaderTaskEither<ConnectionE<E>, Error, A>,
): ReaderTaskEither<ConnectionE<E>, Error, A>;
export function withTransaction<E, A>(
  x: ReaderTaskEither<ConnectionE<E>, Error, A>,
): ReaderTaskEither<ConnectionE<E>, Error, A>;
export function withTransaction<E, A>(x: any, y?: any): ReaderTaskEither<ConnectionE<E>, Error, A> {
  const opts: TxOptions = y ? { ...defaultTxOptions, ...x } : defaultTxOptions;
  const contents: ReaderTaskEither<ConnectionE<E>, Error, A> = y || x;

  return ask<ConnectionE<E>, Error>()
    .map(e => executeTransaction(e.connection, opts, () => contents.run(e)))
    .chain(fromTaskEither);
}
