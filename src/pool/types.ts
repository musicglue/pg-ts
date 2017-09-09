import { Task } from "fp-ts/lib/Task";
import { Pool as GenericPool } from "generic-pool";
import { Client, QueryConfig, QueryResult } from "pg";
import { TypeParsers } from "../types";

export type DbResponseTransformer = (result: QueryResult) => QueryResponse;
export type QueryResponse = void | any | any[];
export type TxIsolationLevel = "READ UNCOMMITTED" | "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE";

export interface TxOptions {
  readonly deferrable?: boolean;
  readonly isolation?: TxIsolationLevel;
  readonly readOnly?: boolean;
  readonly tx?: Client;
}

export type Query = (query: QueryConfig, txOpts?: TxOptions) => QueryResponse;
export type QueryTask = (query: QueryConfig, txOpts?: TxOptions) => Task<QueryResponse>;

export type TransactionScope = (tx: Client) => Promise<any>;

export type Transaction = (x: TransactionScope | TxOptions, y?: TransactionScope) => Promise<any>;
export type TransactionTask = (x: TransactionScope | TxOptions, y?: TransactionScope) => Task<any>;

export interface IBasePool {
  query?: Query;
  queryTask?: QueryTask;
  any?: Query;
  anyTask?: QueryTask;
  none?: Query;
  noneTask?: QueryTask;
  one?: Query;
  oneTask?: QueryTask;
  oneOrMany?: Query;
  oneOrManyTask?: QueryTask;
  oneOrNone?: Query;
  oneOrNoneTask?: QueryTask;
  transaction?: Transaction;
  transactionTask?: TransactionTask;
}

export type BasePool = IBasePool & GenericPool<Client>;

export interface IQueryPool extends IBasePool {
  query: Query;
  queryTask: QueryTask;
}

export type QueryPool = IQueryPool & GenericPool<Client>;

export interface IAssertionPool extends IQueryPool {
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
}

export type AssertionPool = IAssertionPool & GenericPool<Client>;

export interface ITransactionPool extends IAssertionPool {
  transaction: Transaction;
}

export type TransactionPool = ITransactionPool & GenericPool<Client>;

export interface IPool extends ITransactionPool {
  transactionTask: TransactionTask;
}

export type Pool = IPool & GenericPool<Client>;

export interface SetupConfig {
  parsers?: TypeParsers;
}
