import { Task } from "fp-ts/lib/Task";
import { get } from "lodash";
import { compose } from "ramda";

import {
  AssertionPool,
  Pool,
  Transaction,
  TransactionPool,
  TransactionScope,
  TransactionTask,
  TxIsolationLevel,
  TxOptions,
} from "../types";

import { isTransactionScope } from "../guards";

const defaultTxOptions: TxOptions = {
  deferrable: false,
  isolation: "READ COMMITTED",
  readOnly: false,
};

const getIsolationStatement = (txOpts?: TxOptions): string => {
  const isolation: TxIsolationLevel = get(txOpts, "isolation", "READ COMMITTED");
  return `ISOLATION LEVEL ${isolation}`;
};

const transaction = (pool: AssertionPool): Transaction =>
  (x: TxOptions | TransactionScope, y?: TransactionScope | null): Promise<any> =>  {
    const opts = isTransactionScope(x) ? defaultTxOptions : x;
    const fn = isTransactionScope(x) ? x : y;

    return pool.acquire()
      .then(client => {
        const opening = ["BEGIN TRANSACTION", getIsolationStatement(opts)];

        if (opts.readOnly) { opening.push("READ ONLY"); }
        if (opts.deferrable) { opening.push("DEFERRABLE"); }

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
      });
   };

const transactionTask = (pool: TransactionPool): TransactionTask =>
  (x: TxOptions | TransactionScope, y?: TransactionScope): Task<any> =>
    new Task(() => pool.transaction(x, y));

const bindTransactionQuery = (pool: AssertionPool): TransactionPool =>
  Object.assign(pool, {
    transaction: transaction(pool),
  });

const bindTransactionTask = (pool: TransactionPool): Pool =>
  Object.assign(pool, {
    transactionTask: transactionTask(pool),
  });

export const bindTransaction = compose(bindTransactionTask, bindTransactionQuery);
