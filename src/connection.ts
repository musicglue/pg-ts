import { ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { tryCatch } from "fp-ts/lib/TaskEither";
import { QueryConfig } from "pg";
import * as pg from "pg";
import { catchAsQueryError } from "./errors";
import { Connection, ConnectionE, connectionLens } from "./types";

export const withConnectionE = <E, A>(
  reader: ReaderTaskEither<Connection, Error, A>,
): ReaderTaskEither<ConnectionE<E>, Error, A> => reader.local<ConnectionE<E>>(connectionLens.get);

export const wrapPoolClient = (poolClient: pg.PoolClient): Connection => ({
  query: (config: QueryConfig) =>
    tryCatch(() => poolClient.query(config), catchAsQueryError(config)),

  release: err => poolClient.release(err),
});
