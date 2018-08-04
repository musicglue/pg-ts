import { tryCatch } from "fp-ts/lib/TaskEither";
import { QueryConfig } from "pg";
import * as pg from "pg";
import { makeDriverQueryError } from "./errors";
import { Connection } from "./types";

export const wrapPoolClient = (poolClient: pg.PoolClient): Connection => ({
  query: (config: QueryConfig) =>
    tryCatch(() => poolClient.query(config), makeDriverQueryError(config)),

  release: err => poolClient.release(err),
});
