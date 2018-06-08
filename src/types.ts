import { ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { TaskEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { Lens } from "monocle-ts";
import * as pg from "pg";

export interface Connection {
  query(config: pg.QueryConfig): TaskEither<Error, QueryResult>;
  release(err?: Error): void;
}

export interface ConnectionE<E> {
  connection: Connection;
  environment: E;
}

export interface ConnectionPool {
  end(): TaskEither<Error, void>;
  withConnection<E, A>(
    withConnection: ReaderTaskEither<ConnectionE<E>, Error, A>,
  ): ReaderTaskEither<E, Error, A>;
}

export interface ConnectionPoolConfig extends pg.PoolConfig {
  onError: (err: Error) => void;
  parsers?: TypeParsers;
}

export interface ErrorFailure {
  error: Error;
  result: "error";
}

export type QueryFailure<T extends t.Mixed> = ErrorFailure | ValidationFailure<T>;

export interface QueryResult extends pg.QueryResult {
  rows: t.mixed[];
}

export type RowTransformer = (x: t.mixed[]) => t.mixed[];

export type TxIsolationLevel =
  | "READ UNCOMMITTED"
  | "READ COMMITTED"
  | "REPEATABLE READ"
  | "SERIALIZABLE";

export interface TxOptions {
  readonly deferrable: boolean;
  readonly isolation: TxIsolationLevel;
  readonly readOnly: boolean;
}

export type TypeParser<T> = (val: string) => T;
export type TypeParsers = Record<string, TypeParser<any>>;

export interface ValidationFailure<T extends t.Mixed> {
  errors: t.Errors;
  result: "validationFailed";
  type: T;
  value: t.mixed;
}

export const connectionLens = Lens.fromProp<ConnectionE<any>, "connection">("connection");
