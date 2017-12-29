import { Task } from "fp-ts/lib/Task";
import { get } from "lodash";
import * as pg from "pg";

import setupPoolAssertions from "./assertions";
import setupPoolEvents from "./events";
import {
  DbPool,
  PoolConfig,
  Transaction,
  TransactionScope,
  TransactionTask,
  TxIsolationLevel,
  TxOptions,
} from "./index";
import setupParsers from "./parsing";
import { PostProcessingConfig } from "./types";

pg.defaults.poolSize = parseInt(process.env.PG_POOL_SIZE || "10", 10);

const defaultTxOptions: TxOptions = {
  deferrable: false,
  isolation: "READ COMMITTED",
  readOnly: false,
};

const getIsolationStatement = (txOpts?: TxOptions): string => {
  const isolation: TxIsolationLevel = get(txOpts, "isolation", "READ COMMITTED");
  return `ISOLATION LEVEL ${isolation}`;
};

const transaction = (pool: DbPool): Transaction => {
  return t;

  function t(x: TxOptions, y: TransactionScope): Promise<any>;
  function t(x: TransactionScope): Promise<any>;
  function t(x: any, y?: any) {
    const opts = typeof x === "function" ? defaultTxOptions : x;
    const fn = typeof x === "function" ? x : y;

    return pool.parsersReady.then(() =>
      pool.connect().then(client => {
        const opening = ["BEGIN TRANSACTION", getIsolationStatement(opts)];

        if (opts.readOnly) {
          opening.push("READ ONLY");
        }
        if (opts.deferrable) {
          opening.push("DEFERRABLE");
        }

        return Promise.resolve(opening.join(" "))
          .then(openings => client.query(openings))
          .then(() => fn(client))
          .then((results: any) => {
            client.query("COMMIT;");
            client.release();

            return results;
          })
          .catch(err => {
            client.query("ROLLBACK;");
            client.release();

            return Promise.reject(err);
          });
      }),
    );
  }
};

const transactionTask = (pool: DbPool): TransactionTask => {
  const transactionFactory = transaction(pool);
  return t;

  function t(x: TxOptions, y: TransactionScope): Task<any>;
  function t(x: TransactionScope, y?: null): Task<any>;
  function t(x: any, y?: any) {
    return new Task(() => transactionFactory(x, y));
  }
};

export default (poolConfig: PoolConfig, postProcessingConfig?: PostProcessingConfig): DbPool => {
  const pool = new pg.Pool(poolConfig) as DbPool;

  pool.parsersReady = setupParsers(pool, poolConfig.parsers);
  setupPoolEvents(pool);
  setupPoolAssertions(pool, postProcessingConfig);

  pool.transaction = transaction(pool);
  pool.transactionTask = transactionTask(pool);

  return pool;
};
