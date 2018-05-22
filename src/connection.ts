import { Task } from "fp-ts/lib/Task";
import { TaskEither } from "fp-ts/lib/TaskEither";
import { Pool, PoolConfig } from "pg";
import { PgClient } from "./driver";
import { ParserSetup, setupParsers, TypeParsers } from "./parser";
import { memoise } from "./utils/memoise";

export interface Connection {
  connectionPool: Pool;
  parserSetup: ParserSetup;
  pg: PgClient;
}

export interface ConnectionPoolConfig extends PoolConfig {
  onError: (err: Error) => void;
  parsers?: TypeParsers;
}

export const makeConnection = (poolConfig: ConnectionPoolConfig): Connection => {
  const pool = new Pool(poolConfig);

  pool.on("error", poolConfig.onError);

  const memoisedParserSetup = memoise(() => setupParsers(pool, poolConfig.parsers).run());
  const parserSetup = new TaskEither(new Task(memoisedParserSetup));

  return {
    connectionPool: pool,
    parserSetup,
    pg: pool,
  };
};
