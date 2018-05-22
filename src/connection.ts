import { right } from "fp-ts/lib/Either";
import { fromNullable } from "fp-ts/lib/Option";
import { Task } from "fp-ts/lib/Task";
import { TaskEither } from "fp-ts/lib/TaskEither";
import { Pool, PoolConfig } from "pg";
import { PgClient } from "./driver";
import { ParserSetup, setupParsers, TypeParsers } from "./parser";
import { memoise } from "./utils/memoise";
import { ask, ReaderTaskEither, readerTaskEither } from "./utils/readerTaskEither";

export interface PgConnection {
  connectionPool: Pool;
  parserSetup: ParserSetup;
  pg: PgClient;
}

export interface PgConnectionPoolConfig extends PoolConfig {
  onError: (err: Error) => void;
  parsers?: TypeParsers;
}

export const makePgConnection = (poolConfig: PgConnectionPoolConfig): PgConnection => {
  const pool = new Pool(poolConfig);

  pool.on("error", poolConfig.onError);

  const memoisedParserSetup = memoise(() =>
    fromNullable(poolConfig.parsers)
      .map(parsers => setupParsers(pool, parsers).run())
      .getOrElseL(() => Promise.resolve(right<Error, void>(undefined as any))),
  );
  const parserSetup = new TaskEither(new Task(memoisedParserSetup));

  return {
    connectionPool: pool,
    parserSetup,
    pg: pool,
  };
};

export type PgReaderTaskEither<L, R> = ReaderTaskEither<PgConnection, L, R>;

export const askConnection = <L = Error>() => ask<PgConnection, L>();

export const pgReaderTaskEitherOf = <A, L = Error>(a: A) =>
  readerTaskEither.of<PgConnection, L, A>(a);
