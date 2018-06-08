import { head } from "fp-ts/lib/Array";
import { fromPredicate } from "fp-ts/lib/Either";
import { constant, identity, or, Predicate } from "fp-ts/lib/function";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { fromEither as optionFromEither, Option } from "fp-ts/lib/Option";
import { ask, fromEither, fromTaskEither, ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import * as t from "io-ts";
import { QueryConfig } from "pg";
import { PgRowCountError } from "./errors";
import {
  Connection,
  ErrorFailure,
  QueryFailure,
  QueryResult,
  RowTransformer,
  ValidationFailure,
} from "./types";
import { defaultCamelCaser } from "./utils/camelify";

const mapToErrorFailure = (error: Error): ErrorFailure => ({
  error,
  result: "error",
});

const mapToValidationFailure = <T extends t.Mixed>(type: T, value: t.mixed) => (
  errors: t.Errors,
): ValidationFailure<T> => ({
  errors,
  result: "validationFailed",
  type,
  value,
});

const executeQuery = (query: QueryConfig) => (connection: Connection) => connection.query(query);

const isNoneResult: Predicate<QueryResult> = ({ rows }) => rows.length === 0;
const isNonEmptyResult: Predicate<QueryResult> = ({ rows }) => rows.length > 0;
const isOneResult: Predicate<QueryResult> = ({ rows }) => rows.length === 1;
const isOneOrNoneResult: Predicate<QueryResult> = or(isNoneResult, isOneResult);

const expectedAtLeastOneErrorFailure = (query: QueryConfig) =>
  mapToErrorFailure(new PgRowCountError(query, ">= 1", "0"));

const expectedNoneFoundSomeErrorFailure = (query: QueryConfig) =>
  mapToErrorFailure(new PgRowCountError(query, "0", ">= 1"));

const expectedOneFoundManyErrorFailure = (query: QueryConfig) =>
  mapToErrorFailure(new PgRowCountError(query, "1", "> 1"));

const expectedOneFoundNoneErrorFailure = (query: QueryConfig) =>
  mapToErrorFailure(new PgRowCountError(query, "1", "0"));

const expectedOneOrNoneErrorFailure = (query: QueryConfig) =>
  mapToErrorFailure(new PgRowCountError(query, "0 or 1", "> 1"));

const queryAny = (transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
): ReaderTaskEither<Connection, QueryFailure<typeof type>, A[]> =>
  ask<Connection, Error>()
    .map(executeQuery(query))
    .chain(fromTaskEither)
    .mapLeft<QueryFailure<typeof type>>(mapToErrorFailure)
    .map(({ rows }) => transformer(rows))
    .map(rows =>
      t
        .array(type)
        .decode(rows)
        .mapLeft(mapToValidationFailure(type, rows)),
    )
    .chain(fromEither);

const queryNone = (query: QueryConfig): ReaderTaskEither<Connection, ErrorFailure, void> =>
  ask<Connection, Error>()
    .map(executeQuery(query))
    .chain(fromTaskEither)
    .mapLeft(mapToErrorFailure)
    .map(fromPredicate(isNoneResult, constant(expectedNoneFoundSomeErrorFailure(query))))
    .chain(fromEither)
    .map<void>(() => undefined as any);

const queryOne = (transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
): ReaderTaskEither<Connection, QueryFailure<typeof type>, A> =>
  ask<Connection, Error>()
    .map(executeQuery(query))
    .chain(fromTaskEither)
    .mapLeft<QueryFailure<typeof type>>(mapToErrorFailure)
    .map(
      fromPredicate(isOneResult, result =>
        fromPredicate(isNoneResult, identity)(result).fold(
          constant(expectedOneFoundManyErrorFailure(query)),
          constant(expectedOneFoundNoneErrorFailure(query)),
        ),
      ),
    )
    .chain(fromEither)
    .map(({ rows }) => transformer(rows)[0])
    .map(row => type.decode(row).mapLeft(mapToValidationFailure(type, row)))
    .chain(fromEither);

const queryOneOrMore = (transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
): ReaderTaskEither<Connection, QueryFailure<typeof type>, NonEmptyArray<A>> =>
  ask<Connection, Error>()
    .map(executeQuery(query))
    .chain(fromTaskEither)
    .mapLeft<QueryFailure<typeof type>>(mapToErrorFailure)
    .map(fromPredicate(isNonEmptyResult, constant(expectedAtLeastOneErrorFailure(query))))
    .chain(fromEither)
    .map(({ rows }) => transformer(rows))
    .map(rows =>
      t
        .array(type)
        .decode(rows)
        .mapLeft(mapToValidationFailure(type, rows)),
    )
    .chain(fromEither)
    .map(rows => new NonEmptyArray(rows[0], rows.slice(1)));

const queryOneOrNone = (transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
): ReaderTaskEither<Connection, QueryFailure<typeof type>, Option<A>> =>
  ask<Connection, Error>()
    .map(executeQuery(query))
    .chain(fromTaskEither)
    .mapLeft<QueryFailure<typeof type>>(mapToErrorFailure)
    .map(fromPredicate(isOneOrNoneResult, constant(expectedOneOrNoneErrorFailure(query))))
    .chain(fromEither)
    .map(({ rows }) => transformer(rows))
    .map(rows =>
      head(rows)
        .map(row => type.decode(row))
        .chain(optionFromEither),
    );

export const configurableQueries = {
  queryAny,
  queryNone,
  queryOne,
  queryOneOrMore,
  queryOneOrNone,
};

export const camelCasedQueries = {
  queryAny: queryAny(defaultCamelCaser),
  queryNone,
  queryOne: queryOne(defaultCamelCaser),
  queryOneOrMore: queryOneOrMore(defaultCamelCaser),
  queryOneOrNone: queryOneOrNone(defaultCamelCaser),
};
