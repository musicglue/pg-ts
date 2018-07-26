import { head } from "fp-ts/lib/Array";
import { fromPredicate } from "fp-ts/lib/Either";
import { constant, identity, or, Predicate } from "fp-ts/lib/function";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { fromEither as optionFromEither, Option } from "fp-ts/lib/Option";
import { ask, fromEither, fromTaskEither, ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import * as t from "io-ts";
import { QueryConfig } from "pg";
import { widenToConnectionE } from "./connection";
import {
  isDriverQueryError,
  isRowCountError,
  isRowValidationError,
  makeRowValidationError,
  PgDriverQueryError,
  PgRowCountError,
  PgRowValidationError,
} from "./errors";
import { Connection, ConnectionE, ErrorPredicate, QueryResult, RowTransformer } from "./types";
import { defaultCamelCaser } from "./utils/camelify";

const executeQuery = (query: QueryConfig) => (connection: Connection) => connection.query(query);

const isNoneResult: Predicate<QueryResult> = ({ rows }) => rows.length === 0;
const isNonEmptyResult: Predicate<QueryResult> = ({ rows }) => rows.length > 0;
const isOneResult: Predicate<QueryResult> = ({ rows }) => rows.length === 1;
const isOneOrNoneResult: Predicate<QueryResult> = or(isNoneResult, isOneResult);

const expectedAtLeastOneErrorFailure = (query: QueryConfig) =>
  new PgRowCountError(query, ">= 1", "0");

const expectedNoneFoundSomeErrorFailure = (query: QueryConfig) =>
  new PgRowCountError(query, "0", ">= 1");

const expectedOneFoundManyErrorFailure = (query: QueryConfig) =>
  new PgRowCountError(query, "1", "> 1");

const expectedOneFoundNoneErrorFailure = (query: QueryConfig) =>
  new PgRowCountError(query, "1", "0");

const expectedOneOrNoneErrorFailure = (query: QueryConfig) =>
  new PgRowCountError(query, "0 or 1", "> 1");

export type QueryAnyError = PgDriverQueryError | PgRowCountError | PgRowValidationError;
export type QueryNoneError = PgDriverQueryError | PgRowCountError;
export type QueryOneError = QueryAnyError;
export type QueryOneOrMoreError = QueryAnyError;
export type QueryOneOrNoneError = QueryAnyError;

const queryAny = (transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
): ReaderTaskEither<Connection, QueryAnyError, A[]> =>
  ask<Connection, QueryAnyError>()
    .map(executeQuery(query))
    .chain(fromTaskEither)
    .map(({ rows }) => transformer(rows))
    .map(rows =>
      t
        .array(type)
        .decode(rows)
        .mapLeft(makeRowValidationError(type, rows)),
    )
    .chain(fromEither);

const queryAnyE = (transformer: RowTransformer = identity) => {
  const transformedQueryAny = queryAny(transformer);

  return <E, A = any>(
    type: t.Type<A, any, t.mixed>,
    query: QueryConfig,
  ): ReaderTaskEither<ConnectionE<E>, QueryAnyError, A[]> =>
    widenToConnectionE(transformedQueryAny(type, query));
};

const queryNone = (query: QueryConfig): ReaderTaskEither<Connection, QueryNoneError, void> =>
  ask<Connection, QueryNoneError>()
    .map(executeQuery(query))
    .chain(fromTaskEither)
    .map(fromPredicate(isNoneResult, constant(expectedNoneFoundSomeErrorFailure(query))))
    .chain(fromEither)
    .map<void>(() => undefined as any);

const queryNoneE = <E>(
  query: QueryConfig,
): ReaderTaskEither<ConnectionE<E>, QueryNoneError, void> => widenToConnectionE(queryNone(query));

const queryOne = (transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
): ReaderTaskEither<Connection, QueryOneError, A> =>
  ask<Connection, QueryOneError>()
    .map(executeQuery(query))
    .chain(fromTaskEither)
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
    .map(row => type.decode(row).mapLeft(makeRowValidationError(type, row)))
    .chain(fromEither);

const queryOneE = (transformer: RowTransformer = identity) => {
  const transformedQueryOne = queryOne(transformer);

  return <E, A = any>(
    type: t.Type<A, any, t.mixed>,
    query: QueryConfig,
  ): ReaderTaskEither<ConnectionE<E>, QueryOneError, A> =>
    widenToConnectionE(transformedQueryOne(type, query));
};

const queryOneOrMore = (transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
): ReaderTaskEither<Connection, QueryOneOrMoreError, NonEmptyArray<A>> =>
  ask<Connection, QueryOneOrMoreError>()
    .map(executeQuery(query))
    .chain(fromTaskEither)
    .map(fromPredicate(isNonEmptyResult, constant(expectedAtLeastOneErrorFailure(query))))
    .chain(fromEither)
    .map(({ rows }) => transformer(rows))
    .map(rows =>
      t
        .array(type)
        .decode(rows)
        .mapLeft(makeRowValidationError(type, rows)),
    )
    .chain(fromEither)
    .map(rows => new NonEmptyArray(rows[0], rows.slice(1)));

const queryOneOrMoreE = (transformer: RowTransformer = identity) => {
  const transformedQueryOneOrMore = queryOneOrMore(transformer);

  return <E, A = any>(
    type: t.Type<A, any, t.mixed>,
    query: QueryConfig,
  ): ReaderTaskEither<ConnectionE<E>, QueryOneOrMoreError, NonEmptyArray<A>> =>
    widenToConnectionE(transformedQueryOneOrMore(type, query));
};

const queryOneOrNone = (transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
): ReaderTaskEither<Connection, QueryOneOrNoneError, Option<A>> =>
  ask<Connection, QueryOneOrNoneError>()
    .map(executeQuery(query))
    .chain(fromTaskEither)
    .map(fromPredicate(isOneOrNoneResult, constant(expectedOneOrNoneErrorFailure(query))))
    .chain(fromEither)
    .map(({ rows }) => transformer(rows))
    .map(rows =>
      head(rows)
        .map(row => type.decode(row))
        .chain(optionFromEither),
    );

const queryOneOrNoneE = (transformer: RowTransformer = identity) => {
  const transformedQueryOneOrNone = queryOneOrNone(transformer);

  return <E, A = any>(
    type: t.Type<A, any, t.mixed>,
    query: QueryConfig,
  ): ReaderTaskEither<ConnectionE<E>, QueryOneOrNoneError, Option<A>> =>
    widenToConnectionE(transformedQueryOneOrNone(type, query));
};

export const configurableQueries = {
  queryAny,
  queryAnyE,
  queryNone,
  queryNoneE,
  queryOne,
  queryOneE,
  queryOneOrMore,
  queryOneOrMoreE,
  queryOneOrNone,
  queryOneOrNoneE,
};

export const camelCasedQueries = {
  queryAny: queryAny(defaultCamelCaser),
  queryAnyE: queryAnyE(defaultCamelCaser),
  queryNone,
  queryNoneE,
  queryOne: queryOne(defaultCamelCaser),
  queryOneE: queryOneE(defaultCamelCaser),
  queryOneOrMore: queryOneOrMore(defaultCamelCaser),
  queryOneOrMoreE: queryOneOrMoreE(defaultCamelCaser),
  queryOneOrNone: queryOneOrNone(defaultCamelCaser),
  queryOneOrNoneE: queryOneOrNoneE(defaultCamelCaser),
};
