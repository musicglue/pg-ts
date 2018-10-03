import { Either } from "fp-ts/lib/Either";
import { constant, identity } from "fp-ts/lib/function";
import { ask, fromTaskEither, ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { fromEither, TaskEither, tryCatch } from "fp-ts/lib/TaskEither";
import { mixed } from "io-ts";
import {
  isDriverQueryError,
  isTransactionRollbackError,
  makeUnhandledConnectionError,
  PgTransactionRollbackError,
} from "./errors";
import {
  ConnectedEnvironment,
  Connection,
  connectionLens,
  TransactionError,
  TransactionOptions,
} from "./types";
import { eitherToPromise } from "./utils/eitherToPromise";
import { SQL } from "./utils/sql";

export const defaultTxOptions: TransactionOptions = {
  context: undefined,
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

const rollbackTransaction = (connection: Connection, context: mixed) => <L>(err: L) =>
  tryCatch(
    () =>
      connection
        .query(SQL`ROLLBACK;`, context)
        .run()
        .then(eitherToPromise)
        .catch(rollbackErr =>
          Promise.reject(new PgTransactionRollbackError(rollbackErr, err, context)),
        )
        .then(() => Promise.reject(err)),
    e => (isTransactionRollbackError(e) ? e : (e as L)),
  );

const commitTransaction = (connection: Connection, context: mixed) => <A>(a: A) =>
  tryCatch(
    () =>
      connection
        .query(SQL`COMMIT;`, context)
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
    .query(beginTransactionQuery(opts), opts.context)
    .mapLeft<TransactionError<L>>(identity)
    .chain(() =>
      tryCatch(
        () =>
          program().then(programE =>
            programE
              .fold<TaskEither<TransactionError<L>, A>>(
                rollbackTransaction(connection, opts.context),
                commitTransaction(connection, opts.context),
              )
              .run(),
          ),
        makeUnhandledConnectionError,
      ),
    )
    .chain(fromEither);

export function withTransaction<E, L, A>(
  x: Partial<TransactionOptions>,
  y: ReaderTaskEither<E & ConnectedEnvironment, L, A>,
): ReaderTaskEither<E & ConnectedEnvironment, TransactionError<L>, A>;
export function withTransaction<E, L, A>(
  x: ReaderTaskEither<E & ConnectedEnvironment, L, A>,
): ReaderTaskEither<E & ConnectedEnvironment, TransactionError<L>, A>;
export function withTransaction<E, L, A>(
  x: any,
  y?: any,
): ReaderTaskEither<E & ConnectedEnvironment, TransactionError<L>, A> {
  const opts: TransactionOptions = y ? { ...defaultTxOptions, ...x } : defaultTxOptions;
  const program: ReaderTaskEither<E & ConnectedEnvironment, L, A> = y || x;

  return ask<E & ConnectedEnvironment, TransactionError<L>>()
    .map(e => executeTransaction(connectionLens.get(e), opts, () => program.run(e)))
    .chain(fromTaskEither);
}
