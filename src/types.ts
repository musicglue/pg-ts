import * as Bluebird from "bluebird";
import * as pg from "pg";
import { BTask } from "./task";

export type DbResponseTransformer = (result: DbResponse) => QueryResponse;
export type QueryResponse = void | any | any[];

export type Query = (query: pg.QueryConfig, txOpts?: TxOptions) => QueryResponse;
export type QueryTask = (query: pg.QueryConfig, txOpts?: TxOptions) => BTask<QueryResponse>;

export type TransactionScope = (tx: pg.Client) => Bluebird<any>;

export type QueryFragmentBuilder = (idxGen: Generator) => QueryFragment;

export interface Transaction {
  (x: TransactionScope, y?: null): Bluebird<any>;
  (x: TxOptions, y: TransactionScope): Bluebird<any>;
}

export interface TransactionTask {
  (x: TransactionScope, y?: null): BTask<any>;
  (x: TxOptions, y: TransactionScope): BTask<any>;
}

export type TxIsolationLevel = "READ UNCOMMITTED" | "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE";
export type TypeParser<T> = (val: string) => T;

export interface DbPool extends pg.Pool {
  any: Query;
  anyTask: QueryTask;
  none: Query;
  noneTask: QueryTask;
  one: Query;
  oneTask: QueryTask;
  oneOrMany: Query;
  oneOrManyTask: QueryTask;
  oneOrNone: Query;
  oneOrNoneTask: QueryTask;

  transaction: Transaction;
  transactionTask: TransactionTask;
}

export interface DbResponse {
  rows: any[];
}

export interface PgType {
  oid: number;
  typarray: number;
  typname: string;
}

export interface PoolConfig extends pg.PoolConfig {
  parsers?: TypeParsers;
}

export interface QueryResult {
  rows: PgType[];
}

export interface QueryFragment {
  __text: string;
  __values: any[];
}

export interface TxOptions {
  readonly deferrable?: boolean;
  readonly isolation?: TxIsolationLevel;
  readonly readOnly?: boolean;
  readonly tx?: pg.Client;
}

export interface TypeParsers {
  [key: string]: TypeParser<any>;
}
