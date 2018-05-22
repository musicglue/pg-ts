import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither";
import { Client, Pool, PoolClient, QueryConfig } from "pg";
import { mapCatchToError } from "./errors";

export interface PgType {
  oid: number;
  typarray: number;
  typname: string;
}

export interface PgQueryResult {
  rows: PgType[];
}

export type PgClient = Client | Pool | PoolClient;

export const executeQuery = (pg: PgClient, query: QueryConfig): TaskEither<Error, PgQueryResult> =>
  tryCatch(() => pg.query(query), mapCatchToError);
