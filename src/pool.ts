import { Pool, PoolConfig } from "pg";
import { setupParsers, TypeParsers } from "./parser";
import { QueryConnection } from "./query";
import { BeginTransaction, makeTransactionFactory } from "./transaction";

export interface ParsingPoolConfig extends PoolConfig {
  onError: (err: Error) => void;
  parsers?: TypeParsers;
}

export interface ParsingPool extends QueryConnection {
  beginTransaction: BeginTransaction;
}

export const makePool = (poolConfig: ParsingPoolConfig): ParsingPool => {
  const pool = new Pool(poolConfig);

  pool.on("error", poolConfig.onError);

  const parserSetup = setupParsers(pool, poolConfig.parsers);

  return {
    beginTransaction: makeTransactionFactory(pool, parserSetup),
    connection: pool,
    parserSetup,
  };
};
