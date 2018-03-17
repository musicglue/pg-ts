import { Pool, PoolConfig } from "pg";
import { ParserSetup, setupParsers, TypeParsers } from "./parser";
import { BeginTransaction, makeTransactionFactory } from "./transaction";

export interface ParsingPoolConfig extends PoolConfig {
  onError: (err: Error) => void;
  parsers?: TypeParsers;
}

export interface ParsingPool {
  beginTransaction: BeginTransaction;
  parserSetup: ParserSetup;
  pool: Pool;
}

export const makePool = (poolConfig: ParsingPoolConfig): ParsingPool => {
  const pool = new Pool(poolConfig);

  pool.on("error", poolConfig.onError);

  const parserSetup = setupParsers(pool, poolConfig.parsers);

  return {
    beginTransaction: makeTransactionFactory(pool, parserSetup),
    parserSetup,
    pool,
  };
};
