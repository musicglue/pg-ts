import * as Bluebird from "bluebird";
import * as pg from "pg";
import getPool from "./getPool";

export type AssertMode = "any" | "none" | "one" | "oneOrMany" | "oneOrNone";
export type TaskFn = (tx: pg.Client) => Bluebird<any>;
export type TxIsolationLevel = "READ UNCOMMITTED" | "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE";
export type TypeParser<T> = (val: string) => T;

export interface DbPool extends pg.Pool {
  transaction?: TransactableFn;
  any?: (query: pg.QueryConfig, txOpts?: TxOptions) => Bluebird<any[]>;
  none?: (query: pg.QueryConfig, txOpts?: TxOptions) => Bluebird<void>;
  one?: (query: pg.QueryConfig, txOpts?: TxOptions) => Bluebird<any>;
  oneOrMany?: (query: pg.QueryConfig, txOpts?: TxOptions) => Bluebird<any[]>;
  oneOrNone?: (query: pg.QueryConfig, txOpts?: TxOptions) => Bluebird<any | void>;
}
export interface DbResponse {
  rows: any[];
}

export interface TransactableFn {
  (txOpts: TxOptions, fn: TaskFn): Bluebird<any>;
  (txOpts: TaskFn, fn?: void): Bluebird<any>;
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

export interface TxOptions {
  readonly deferrable?: boolean;
  readonly isolation?: TxIsolationLevel;
  readonly readOnly?: boolean;
  readonly tx?: pg.Client;
}

export interface TypeParsers {
  [key: string]: TypeParser<any>;
}

export const SQL = (parts: TemplateStringsArray, ...values: any[]) => ({
  text: parts.reduce((prev, curr, i) => `${prev}$${i}${curr}`),
  values,
});
export { default as parse } from "./utils/connection";
export default getPool;
