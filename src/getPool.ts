import * as Bluebird from "bluebird";
import { get } from "lodash";
import * as pg from "pg";

import { IO } from "fp-ts/lib/IO";
import { DbPool, PoolConfig, TaskFn, TaskIO, TransactableIO, TxIsolationLevel, TxOptions } from ".";
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

const transactionIO = (pool: pg.Pool): TransactableIO => {
  return t;

  function t(txOpts: TaskIO, fn?: null): IO<Bluebird<any>>;
  function t(txOpts: TxOptions, fn: TaskIO): IO<Bluebird<any>> {
    const opts = typeof txOpts === "function" ? defaultTxOptions : txOpts;
    const task = typeof txOpts === "function" ? txOpts : fn;

    if (opts.tx) { return task(opts.tx); }

    return new IO(() =>
      Bluebird
        .using((pool as any)._connect(), (tx: pg.Client): Bluebird<any> => {
          const opening = ["BEGIN TRANSACTION", getIsolationStatement(opts)];
          if (opts.readOnly) { opening.push("READ ONLY"); }
          if (opts.deferrable) { opening.push("DEFERRABLE"); }

          return Bluebird
            .try(() => Bluebird.resolve(tx.query(opening.join(" "))))
            .then(() => task(tx))
            .tap(commit(tx))
            .catch(rollback(tx));
        }));
  }
};

const unwrapTransactionIO = (transactable: TransactableIO) => {
  return t;

  function t(txOpts: TaskFn, fn?: null): Bluebird<any>;
  function t(txOpts: TxOptions, fn: TaskFn): Bluebird<any> {
    return (typeof txOpts === "function")
      ? transactable(tx => new IO(() => txOpts(tx))).run()
      : transactable(txOpts, tx => new IO(() => fn(tx))).run();
  }
};

export default (config: PoolConfig): DbPool => {
  const pool: DbPool = new pg.Pool(config);
  setupParsers(pool, config.parsers);
  setupPoolEvents(pool);
  setupPoolAssertions(pool);
  pool.transactionIO = transactionIO(pool);
  pool.transaction = unwrapTransactionIO(pool.transactionIO);

  return pool;
};
