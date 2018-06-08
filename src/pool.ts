import { Either, left, right } from "fp-ts/lib/Either";
import { tryCatch as ioTryCatch } from "fp-ts/lib/IOEither";
import { fromNullable } from "fp-ts/lib/Option";
import {
  ask,
  fromTaskEither,
  ReaderTaskEither,
  tryCatch as readerTryCatch,
} from "fp-ts/lib/ReaderTaskEither";
import {
  fromIOEither,
  TaskEither,
  taskEither,
  tryCatch as taskEitherTryCatch,
} from "fp-ts/lib/TaskEither";
import { Pool } from "pg";
import * as pg from "pg";
import { wrapPoolClient } from "./connection";
import {
  catchAsPoolCheckoutError,
  catchAsPoolCreationError,
  catchAsPoolShutdownError,
  isPgTransactionRollbackError,
} from "./errors";
import { setupParsers } from "./parser";
import { ConnectionE, ConnectionPool, ConnectionPoolConfig } from "./types";

export const makeConnectionPool = (
  poolConfig: ConnectionPoolConfig,
): TaskEither<Error, ConnectionPool> => {
  const { onError, parsers } = poolConfig;

  const poolIo = ioTryCatch(() => {
    const pool = new Pool(poolConfig);

    pool.on("error", onError);

    return pool;
  }, catchAsPoolCreationError);

  return fromIOEither(poolIo)
    .chain(pool =>
      fromNullable(parsers)
        .map(setupParsers(pool))
        .getOrElse(taskEither.of(pool)),
    )
    .map(wrapConnectionPool);
};

export const wrapConnectionPool = (pool: pg.Pool): ConnectionPool => ({
  end: () =>
    taskEitherTryCatch(
      () => ((pool as any).ending ? Promise.resolve<void>(undefined) : pool.end()),
      catchAsPoolShutdownError,
    ),

  withConnection: <E, A>(withConnection: ReaderTaskEither<ConnectionE<E>, Error, A>) =>
    ask<E, Error>().chain(environment =>
      readerTryCatch<E, Error, pg.PoolClient>(() => pool.connect(), catchAsPoolCheckoutError)
        .map(wrapPoolClient)
        .map(connection =>
          withConnection.value({ connection, environment }).fold<Either<Error, A>>(
            err => {
              connection.release(isPgTransactionRollbackError(err) ? err : undefined);
              return left(err);
            },
            a => {
              connection.release();
              return right(a);
            },
          ),
        )
        .map(te => new TaskEither(te))
        .chain(fromTaskEither),
    ),
});
