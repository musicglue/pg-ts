import { ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { TaskEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { Lens } from "monocle-ts";
import * as pg from "pg";
import {
  PgDriverQueryError,
  PgPoolCheckoutError,
  PgPoolShutdownError,
  PgTransactionRollbackError,
  PgUnhandledConnectionError,
  PgUnhandledPoolError,
} from "./errors";

export interface Connection {
  query(config: pg.QueryConfig): TaskEither<PgDriverQueryError, QueryResult>;
  release(err?: Error): void;
}

export const ConnectionSymbol = Symbol("pg-ts connection");
export type ConnectionSymbol = typeof ConnectionSymbol;

export interface ConnectedEnvironment {
  [ConnectionSymbol]: Connection;
}

export type ConnectionError<L> = PgPoolCheckoutError | PgUnhandledConnectionError | L;

export interface ConnectionPool {
  end(): TaskEither<PgPoolShutdownError, void>;

  withConnection<L, A>(
    program: ReaderTaskEither<ConnectedEnvironment, L, A>,
  ): ReaderTaskEither<void, ConnectionError<L>, A>;

  withConnection<E, L, A>(
    program: ReaderTaskEither<E & ConnectedEnvironment, L, A>,
  ): ReaderTaskEither<E, ConnectionError<L>, A>;
}

export interface ConnectionPoolConfig extends pg.PoolConfig {
  onError: (err: PgUnhandledPoolError) => void;
  parsers?: TypeParsers;
}

export type ErrorPredicate<T> = (v: t.mixed) => v is T;

export interface QueryResult extends pg.QueryResult {
  rows: t.mixed[];
}

export type RowTransformer = (x: t.mixed[]) => t.mixed[];

export type TransactionError<L> =
  | PgDriverQueryError
  | PgTransactionRollbackError
  | PgUnhandledConnectionError
  | L;

export type TransactionIsolationLevel =
  | "READ UNCOMMITTED"
  | "READ COMMITTED"
  | "REPEATABLE READ"
  | "SERIALIZABLE";

export interface TransactionOptions {
  readonly deferrable: boolean;
  readonly isolation: TransactionIsolationLevel;
  readonly readOnly: boolean;
}

export type TypeParser<T> = (val: string) => T;
export type TypeParsers = Record<string, TypeParser<any>>;

export const connectionLens = Lens.fromProp<ConnectedEnvironment, ConnectionSymbol>(
  ConnectionSymbol,
);
