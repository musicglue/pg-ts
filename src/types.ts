import { ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { TaskEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { Lens } from "monocle-ts";
import * as pg from "pg";
import {
  PgDriverQueryError,
  PgPoolCheckoutError,
  PgPoolShutdownError,
  PgRowCountError,
  PgTransactionRollbackError,
  PgUnhandledConnectionError,
  PgUnhandledPoolError,
} from "./errors";

export interface Connection {
  query(config: pg.QueryConfig): TaskEither<PgDriverQueryError, QueryResult>;
  release(err?: Error): void;
}

export interface ConnectionE<E> {
  connection: Connection;
  environment: E;
}

export type ConnectionError<L> = PgPoolCheckoutError | PgUnhandledConnectionError | L;

export interface ConnectionPool {
  end(): TaskEither<PgPoolShutdownError, void>;

  withConnection<E, L, A>(
    program: ReaderTaskEither<Connection, L, A>,
  ): ReaderTaskEither<E, ConnectionError<L>, A>;

  withConnectionE<E, L, A>(
    program: ReaderTaskEither<ConnectionE<E>, L, A>,
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

export const connectionLens = Lens.fromProp<ConnectionE<any>, "connection">("connection");
