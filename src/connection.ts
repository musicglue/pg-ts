import { tryCatch } from "fp-ts/lib/TaskEither";
import { mixed } from "io-ts";
import { QueryConfig } from "pg";
import * as pg from "pg";
import { makeDriverQueryError } from "./errors";
import { Connection } from "./types";

export const wrapPoolClient = (poolClient: pg.PoolClient): Connection => ({
  query: (config: QueryConfig, context: mixed) =>
    tryCatch(() => poolClient.query(config), makeDriverQueryError(config, context)),

  release: err => poolClient.release(err),
});
