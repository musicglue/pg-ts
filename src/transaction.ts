import { Either } from "fp-ts/lib/Either";
import { constant, identity } from "fp-ts/lib/function";
import { ask, fromTaskEither, ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { fromEither, TaskEither, tryCatch } from "fp-ts/lib/TaskEither";
import { isError } from "lodash";
import { inspect } from "util";
import { widenToConnectionE } from "./connection";
import {
  isDriverQueryError,
  isRowCountError,
  isTransactionRollbackError,
  makeUnhandledConnectionError,
  PgDriverQueryError,
  PgRowCountError,
  PgTransactionRollbackError,
  PgUnhandledConnectionError,
} from "./errors";
import {
  Connection,
  ConnectionE,
  ErrorPredicate,
  QueryResult,
  TransactionError,
  TransactionOptions,
} from "./types";
import { eitherToPromise } from "./utils/eitherToPromise";
import { SQL } from "./utils/sql";

export const defaultTxOptions: TransactionOptions = {
  deferrable: false,
  isolation: "READ COMMITTED",
  readOnly: false,
};

const beginTransactionQuery = ({ deferrable, isolation, readOnly }: TransactionOptions) => SQL`
  BEGIN TRANSACTION
  ISOLATION LEVEL ${() => isolation}
  ${() => (readOnly ? "READ ONLY" : "")}
  ${() => (deferrable ? "DEFERRABLE" : "")}
`;

const rollbackTransaction = (connection: Connection) => <L>(err: L) =>
  tryCatch(
    () =>
      connection
        .query(SQL`ROLLBACK;`)
        .run()
        .then(eitherToPromise)
        .catch(rollbackErr => Promise.reject(new PgTransactionRollbackError(rollbackErr, err)))
        .then(() => Promise.reject(err)),
    e => (isTransactionRollbackError(e) ? e : (e as L)),
  );

const commitTransaction = (connection: Connection) => <A>(a: A) =>
  tryCatch(
    () =>
      connection
        .query(SQL`COMMIT;`)
        .run()
        .then(eitherToPromise)
        .then(constant(a)),
    e => (isDriverQueryError(e) ? e : makeUnhandledConnectionError(e)),
  );

const executeTransaction = <L, A>(
  connection: Connection,
  opts: TransactionOptions,
  program: () => Promise<Either<L, A>>,
): TaskEither<TransactionError<L>, A> =>
  connection
    .query(beginTransactionQuery(opts))
    .mapLeft<TransactionError<L>>(identity)
    .chain(() =>
      tryCatch(
        () =>
          program().then(programE =>
            programE
              .fold<TaskEither<TransactionError<L>, A>>(
                rollbackTransaction(connection),
                commitTransaction(connection),
              )
              .run(),
          ),
        makeUnhandledConnectionError,
      ),
    )
    .chain(fromEither);

export function withTransactionE<E, L, A>(
  x: Partial<TransactionOptions>,
  y: ReaderTaskEither<ConnectionE<E>, L, A>,
): ReaderTaskEither<ConnectionE<E>, TransactionError<L>, A>;
export function withTransactionE<E, L, A>(
  x: ReaderTaskEither<ConnectionE<E>, L, A>,
): ReaderTaskEither<ConnectionE<E>, TransactionError<L>, A>;
export function withTransactionE<E, L, A>(
  x: any,
  y?: any,
): ReaderTaskEither<ConnectionE<E>, TransactionError<L>, A> {
  const opts: TransactionOptions = y ? { ...defaultTxOptions, ...x } : defaultTxOptions;
  const program: ReaderTaskEither<ConnectionE<E>, L, A> = y || x;

  return ask<ConnectionE<E>, TransactionError<L>>()
    .map(e => executeTransaction(e.connection, opts, () => program.run(e)))
    .chain(fromTaskEither);
}

export function withTransaction<E, L, A>(
  x: Partial<TransactionOptions>,
  y: ReaderTaskEither<Connection, L, A>,
): ReaderTaskEither<ConnectionE<E>, TransactionError<L>, A>;
export function withTransaction<E, L, A>(
  x: ReaderTaskEither<Connection, L, A>,
): ReaderTaskEither<ConnectionE<E>, TransactionError<L>, A>;
export function withTransaction<E, L, A>(
  x: any,
  y?: any,
): ReaderTaskEither<ConnectionE<E>, TransactionError<L>, A> {
  const opts: TransactionOptions = y ? { ...defaultTxOptions, ...x } : defaultTxOptions;
  const program: ReaderTaskEither<Connection, L, A> = y || x;

  return withTransactionE(opts, widenToConnectionE(program));
}
