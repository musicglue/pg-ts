import * as Bluebird from "bluebird";
import { get } from "lodash";
import * as pg from "pg";
import setupPoolAssertions from "./assertions";
import setupPoolEvents from "./events";

import {
  BTask,
  DbPool,
  PoolConfig,
  Transaction,
  TransactionScope,
  TransactionTask,
  TxIsolationLevel,
  TxOptions,
} from "./index";

import setupParsers from "./parsing";

pg.defaults.poolSize = parseInt(process.env.PG_POOL_SIZE || 10, 10);
(pg.defaults as any).returnToHead = true;

(pg.Pool.prototype as any)._connect = function() {
  return (this.connect() as any).disposer((client: pg.Client) => client.release());
};

const defaultTxOptions: TxOptions = {
  deferrable: false,
  isolation: "READ COMMITTED",
  readOnly: false,
};

const getIsolationStatement = (txOpts?: TxOptions): string => {
  const isolation: TxIsolationLevel = get(txOpts, "isolation", "READ COMMITTED");
  return `ISOLATION LEVEL ${isolation}`;
};

const commit = (tx: pg.Client) => () => tx.query("COMMIT;");
const rollback = (tx: pg.Client) => (err: Error) => tx.query("ROLLBACK;").then(() => Bluebird.reject(err));

const transaction = (pool: DbPool): Transaction => {
  return t;

  function t(x: TransactionScope, y?: null): Bluebird<any>;
  function t(x: TxOptions, y: TransactionScope): Bluebird<any> {
    const opts = typeof x === "function" ? defaultTxOptions : x;
    const fn = typeof x === "function" ? x : y;

    return Bluebird
      .using((pool as any)._connect(), (tx: pg.Client): Bluebird<any> => {
        const opening = ["BEGIN TRANSACTION", getIsolationStatement(opts)];

        if (opts.readOnly) { opening.push("READ ONLY"); }
        if (opts.deferrable) { opening.push("DEFERRABLE"); }

        return Bluebird
          .try(() => Bluebird.resolve(tx.query(opening.join(" "))))
          .then(() => fn(tx))
          .tap(commit(tx))
          .catch(rollback(tx));
      });
  }
};

const transactionTask = (pool: DbPool): TransactionTask => {
  return t;

  function t(x: TransactionScope, y?: null): BTask<any>;
  function t(x: TxOptions, y: TransactionScope): BTask<any> {
    return new BTask(() => transaction(pool)(x, y));
  }
};

export default (config: PoolConfig): DbPool => {
  const pool: DbPool = new pg.Pool(config);

  setupParsers(pool, config.parsers);
  setupPoolEvents(pool);
  setupPoolAssertions(pool);

  pool.transaction = transaction(pool);
  pool.transactionTask = transactionTask(pool);

  return pool;
};
