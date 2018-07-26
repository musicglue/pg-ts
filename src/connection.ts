import { ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { tryCatch } from "fp-ts/lib/TaskEither";
import { QueryConfig } from "pg";
import * as pg from "pg";
import { makeDriverQueryError } from "./errors";
import { Connection, ConnectionE, connectionLens } from "./types";

export const widenToConnectionE = <E, L, A>(
  program: ReaderTaskEither<Connection, L, A>,
): ReaderTaskEither<ConnectionE<E>, L, A> => program.local<ConnectionE<E>>(connectionLens.get);

export const wrapPoolClient = (poolClient: pg.PoolClient): Connection => ({
  query: (config: QueryConfig) =>
    tryCatch(() => poolClient.query(config), makeDriverQueryError(config)),

  release: err => poolClient.release(err),
});
