import { Either, left, right } from "fp-ts/lib/Either";
import { compose, identity } from "fp-ts/lib/function";
import { tryCatch as ioTryCatch } from "fp-ts/lib/IOEither";
import { fromNullable } from "fp-ts/lib/Option";
import { ask, fromTaskEither, ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import {
  fromEither,
  fromIOEither,
  TaskEither,
  taskEither,
  tryCatch as taskEitherTryCatch,
} from "fp-ts/lib/TaskEither";
import * as pg from "pg";
import { widenToConnectionE, wrapPoolClient } from "./connection";
import {
  isPoolCreationError,
  isTransactionRollbackError,
  makePoolCheckoutError,
  makePoolCreationError,
  makePoolShutdownError,
  makeUnhandledConnectionError,
  makeUnhandledPoolError,
  PgPoolCreationError,
  PgUnhandledConnectionError,
} from "./errors";
import { setupParsers } from "./parser";
import {
  Connection,
  ConnectionE,
  ConnectionError,
  ConnectionPool,
  ConnectionPoolConfig,
  ErrorPredicate,
} from "./types";

export const makeConnectionPool = (
  poolConfig: ConnectionPoolConfig,
): TaskEither<PgPoolCreationError, ConnectionPool> => {
  const { onError, parsers } = poolConfig;

  const poolIo = ioTryCatch(() => {
    const pool = new pg.Pool(poolConfig);

    pool.on(
      "error",
      compose(
        onError,
        makeUnhandledPoolError,
      ),
    );

    return pool;
  }, makePoolCreationError).mapLeft(
    error => (isPoolCreationError(error) ? error : makePoolCreationError(error)),
  );

  return fromIOEither(poolIo)
    .chain(pool =>
      fromNullable(parsers)
        .map(setupParsers(pool))
        .getOrElse(taskEither.of(pool)),
    )
    .map(wrapConnectionPool);
};

const checkoutConnection = (pool: pg.Pool) =>
  taskEitherTryCatch(() => pool.connect(), makePoolCheckoutError);

const executeProgramWithConnection = <E, L, A>(
  environment: E,
  program: ReaderTaskEither<ConnectionE<E>, L, A>,
) => (connection: Connection): TaskEither<PgUnhandledConnectionError | L, A> =>
  new TaskEither(
    taskEitherTryCatch(() => program.run({ connection, environment }), makeUnhandledConnectionError)
      .mapLeft<PgUnhandledConnectionError | L>(identity)
      .chain(fromEither)
      .fold<Either<PgUnhandledConnectionError | L, A>>(
        err => {
          // If a rollback error reaches this point, we should assume the connection
          // is poisoned and ask the pool implementation to dispose of it.
          connection.release(isTransactionRollbackError(err) ? err : undefined);
          return left(err);
        },
        a => {
          connection.release();
          return right(a);
        },
      ),
  );

const withConnectionEFromPool = (pool: pg.Pool) => <E, L, A>(
  program: ReaderTaskEither<ConnectionE<E>, L, A>,
): ReaderTaskEither<E, ConnectionError<L>, A> =>
  ask<E, ConnectionError<L>>()
    .map(environment =>
      checkoutConnection(pool)
        .map(wrapPoolClient)
        .mapLeft<ConnectionError<L>>(identity)
        .chain(executeProgramWithConnection(environment, program)),
    )
    .chain(fromTaskEither);

export const wrapConnectionPool = (pool: pg.Pool): ConnectionPool => {
  const withConnectionE = withConnectionEFromPool(pool);

  return {
    end: () =>
      taskEitherTryCatch(
        () => ((pool as any).ending ? Promise.resolve<void>(undefined) : pool.end()),
        makePoolShutdownError,
      ),

    withConnection: <E, L, A>(program: ReaderTaskEither<Connection, L, A>) =>
      withConnectionE<E, L, A>(widenToConnectionE(program)),

    withConnectionE,
  };
};
