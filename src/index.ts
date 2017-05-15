import * as Bluebird from "bluebird";
import { IO } from "fp-ts/lib/IO";
import * as pg from "pg";
import getPool from "./getPool";

export type AssertMode = "any" | "none" | "one" | "oneOrMany" | "oneOrNone";
export type QueryIO = (query: pg.QueryConfig, txOpts?: TxOptions) => IO<Bluebird<QueryResponse>>;
export type Query = (query: pg.QueryConfig, txOpts?: TxOptions) => Bluebird<QueryResponse>;
export type QueryResponse = void | any | any[];
export type TaskFn = (tx: pg.Client) => Bluebird<any>;
export type TaskIO = (tx: pg.Client) => IO<Bluebird<any>>;
export type TxIsolationLevel = "READ UNCOMMITTED" | "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE";
export type TypeParser<T> = (val: string) => T;

export interface DbPool extends pg.Pool {
  transaction?: Transactable;
  transactionIO?: TransactableIO;
  any?: Query;
  anyIO?: QueryIO;
  none?: Query;
  noneIO?: QueryIO;
  one?: Query;
  oneIO?: QueryIO;
  oneOrMany?: Query;
  oneOrManyIO?: QueryIO;
  oneOrNone?: Query;
  oneOrNoneIO?: QueryIO;
}
export interface DbResponse {
  rows: any[];
}

export interface Transactable {
  (txOpts: TxOptions, fn: TaskFn): Bluebird<any>;
  (txOpts: TaskFn, fn?: void): Bluebird<any>;
}

export interface TransactableIO {
  (txOpts: TxOptions, fn: TaskIO): IO<Bluebird<any>>;
  (txOpts: TaskIO, fn?: void): IO<Bluebird<any>>;
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
