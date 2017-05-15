import * as Bluebird from "bluebird";
import { curry, get } from "lodash";
import * as pg from "pg";

import { DbPool, PoolConfig, TaskFn, TxIsolationLevel, TxOptions } from ".";
import setupPoolAssertions from "./assertions";
import setupPoolEvents from "./events";
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

function transaction(pool: pg.Pool, txOpts: TaskFn, fn?: null): Bluebird<any>;
function transaction(pool: pg.Pool, txOpts: TxOptions, fn: TaskFn): Bluebird<any> {
  const opts = typeof txOpts === "function" ? defaultTxOptions : txOpts;
  const task = typeof txOpts === "function" ? txOpts : fn;

  if (opts.tx) { return task(opts.tx); }

  return Bluebird
    .using((pool as any)._connect(), (tx: pg.Client): Bluebird<any> => {
      const opening = ["BEGIN TRANSACTION", getIsolationStatement(opts)];
      if (opts.readOnly) { opening.push("READ ONLY"); }
      if (opts.deferrable) { opening.push("DEFERRABLE"); }

      return Bluebird
        .try(() => Bluebird.resolve(tx.query(opening.join(" "))))
        .then(() => task(tx))
        .tap(commit(tx))
        .catch(rollback(tx));
    });
}

export default (config: PoolConfig): DbPool => {
  const pool: DbPool = new pg.Pool(config);
  setupParsers(pool, config.parsers);
  setupPoolEvents(pool);
  setupPoolAssertions(pool);
  pool.transaction = curry(transaction)(pool);

  return pool;
};
