import { Either } from "fp-ts/lib/Either";
import { Predicate } from "fp-ts/lib/function";
import { TaskEither } from "fp-ts/lib/TaskEither";
import { PgConnection } from "./connection";
import {
  ask,
  fromEither,
  fromPredicate,
  fromTaskEither,
  ReaderTaskEither,
  readerTaskEither,
} from "./utils/readerTaskEither";

export type PgReaderTaskEither<L, R> = ReaderTaskEither<PgConnection, L, R>;

export const askConnection = <L = Error>() => ask<PgConnection, L>();

export const pgReaderFromEither = <L, R>(either: Either<L, R>) =>
  fromEither<PgConnection, L, R>(either);

export const pgReaderFromPredicate = <L, R>(predicate: Predicate<R>, whenFalse: (r: R) => L) => (
  r: R,
) => fromPredicate<PgConnection, L, R>(predicate, whenFalse)(r);

export const pgReaderFromTaskEither = <L, R>(taskEither: TaskEither<L, R>) =>
  fromTaskEither<PgConnection, L, R>(taskEither);

export const pgReaderTaskEitherOf = <A, L = Error>(a: A) =>
  readerTaskEither.of<PgConnection, L, A>(a);
