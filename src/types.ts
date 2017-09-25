import { Task } from "fp-ts/lib/Task";
import * as pg from "pg";

export type DbResponseTransformer = (result: DbResponse) => QueryResponse;
export type QueryResponse = void | any | any[];

export type Query = (query: pg.QueryConfig, txOpts?: TxOptions) => Promise<QueryResponse>;
export type QueryTask = (query: pg.QueryConfig, txOpts?: TxOptions) => Task<QueryResponse>;

export type TransactionScope = (tx: pg.Client) => Promise<any>;

export type QueryFragmentBuilder = (seqGen: IterableIterator<number>) => QueryFragment;

export interface Transaction {
  (x: TxOptions, y: TransactionScope): Promise<any>;
  (x: TransactionScope, y?: null): Promise<any>;
}

export interface TransactionTask {
  (x: TxOptions, y: TransactionScope): Task<any>;
  (x: TransactionScope, y?: null): Task<any>;
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
