import { Either } from "fp-ts/lib/Either";
import { TaskEither } from "fp-ts/lib/TaskEither";
import { PgConnection } from "./connection";
import {
  ask,
  fromEither,
  fromTaskEither,
  ReaderTaskEither,
  readerTaskEither,
} from "./utils/readerTaskEither";

export type PgReaderTaskEither<L, R> = ReaderTaskEither<PgConnection, L, R>;

export const askConnection = <L = Error>() => ask<PgConnection, L>();

export const pgReaderFromEither = <L, R>(either: Either<L, R>) =>
  fromEither<PgConnection, L, R>(either);

export const pgReaderFromTaskEither = <L, R>(taskEither: TaskEither<L, R>) =>
  fromTaskEither<PgConnection, L, R>(taskEither);

export const pgReaderTaskEitherOf = <A, L = Error>(a: A) =>
  readerTaskEither.of<PgConnection, L, A>(a);
