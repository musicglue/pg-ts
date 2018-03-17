import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither";
import { Client, Pool, PoolClient, QueryConfig } from "pg";
import { mapCatchToError } from "./errors";

export interface PgType {
  oid: number;
  typarray: number;
  typname: string;
}

export interface QueryResult {
  rows: PgType[];
}

export type Connection = Client | Pool | PoolClient;

export const executeQuery = (
  connection: Connection,
  query: QueryConfig,
): TaskEither<Error, QueryResult> => {
  return tryCatch(() => connection.query(query), mapCatchToError);
};
