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
import { wrapPoolClient } from "./connection";
import {
  isPoolCreationError,
  isTransactionRollbackError,
  makePoolCheckoutError,
  makePoolCreationError,
  makePoolShutdownError,
  makeUnhandledConnectionError,
  makeUnhandledPoolError,
  PgPoolCreationError,
  PgTypeParserSetupError,
  PgUnhandledConnectionError,
} from "./errors";
import { setupParsers } from "./parser";
import {
  ConnectedEnvironment,
  Connection,
  ConnectionError,
  ConnectionPool,
  ConnectionPoolConfig,
  ConnectionSymbol,
} from "./types";

export const makeConnectionPool = (
  poolConfig: ConnectionPoolConfig,
): TaskEither<PgPoolCreationError | PgTypeParserSetupError, ConnectionPool> => {
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
    .mapLeft<PgPoolCreationError | PgTypeParserSetupError>(identity)
    .chain(pool =>
      fromNullable(parsers)
        .map(setupParsers(pool))
        .getOrElse(taskEither.of<PgTypeParserSetupError, pg.Pool>(pool)),
    )
    .map(wrapConnectionPool);
};

const checkoutConnection = (pool: pg.Pool) =>
  taskEitherTryCatch(() => pool.connect(), makePoolCheckoutError);

const executeProgramWithConnection = <E extends {}, L, A>(
  environment: E,
  program: ReaderTaskEither<E & ConnectedEnvironment, L, A>,
) => (connection: Connection): TaskEither<PgUnhandledConnectionError | L, A> =>
  new TaskEither(
    taskEitherTryCatch(
      () => program.run(Object.assign({}, environment, { [ConnectionSymbol]: connection })),
      makeUnhandledConnectionError,
    )
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

const withConnectionFromPool = (pool: pg.Pool) => <L, A>(
  program: ReaderTaskEither<ConnectedEnvironment, L, A>,
) =>
  checkoutConnection(pool)
    .map(wrapPoolClient)
    .mapLeft<ConnectionError<L>>(identity)
    .chain(executeProgramWithConnection({}, program));

const withConnectionEFromPool = (pool: pg.Pool) => <E extends {}, L, A>(
  program: ReaderTaskEither<E & ConnectedEnvironment, L, A>,
) =>
  ask<E, ConnectionError<L>>()
    .map(environment =>
      checkoutConnection(pool)
        .map(wrapPoolClient)
        .mapLeft<ConnectionError<L>>(identity)
        .chain(executeProgramWithConnection(environment, program)),
    )
    .chain(fromTaskEither);

export const wrapConnectionPool = (pool: pg.Pool): ConnectionPool => ({
  end: () =>
    taskEitherTryCatch(
      () => ((pool as any).ending ? Promise.resolve<void>(undefined) : pool.end()),
      makePoolShutdownError,
    ),

  withConnection: withConnectionFromPool(pool),
  withConnectionE: withConnectionEFromPool(pool),
});
