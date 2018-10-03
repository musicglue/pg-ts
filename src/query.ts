import { head } from "fp-ts/lib/Array";
import { fromPredicate } from "fp-ts/lib/Either";
import { constant, identity, or, Predicate } from "fp-ts/lib/function";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { fromEither as optionFromEither, Option } from "fp-ts/lib/Option";
import { ask, fromEither, fromTaskEither, ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import * as t from "io-ts";
import { QueryConfig } from "pg";
import {
  makeRowValidationError,
  PgDriverQueryError,
  PgRowCountError,
  PgRowValidationError,
} from "./errors";
import {
  ConnectedEnvironment,
  Connection,
  connectionLens,
  QueryResult,
  RowTransformer,
} from "./types";
import { defaultCamelCaser } from "./utils/camelify";

const executeQuery = (query: QueryConfig, context: t.mixed) => (connection: Connection) =>
  connection.query(query, context);

const isNoneResult: Predicate<QueryResult> = ({ rows }) => rows.length === 0;
const isNonEmptyResult: Predicate<QueryResult> = ({ rows }) => rows.length > 0;
const isOneResult: Predicate<QueryResult> = ({ rows }) => rows.length === 1;
const isOneOrNoneResult: Predicate<QueryResult> = or(isNoneResult, isOneResult);

const expectedAtLeastOneErrorFailure = (query: QueryConfig, context: t.mixed) =>
  new PgRowCountError(query, ">= 1", "0", context);

const expectedNoneFoundSomeErrorFailure = (query: QueryConfig, context: t.mixed) =>
  new PgRowCountError(query, "0", ">= 1", context);

const expectedOneFoundManyErrorFailure = (query: QueryConfig, context: t.mixed) =>
  new PgRowCountError(query, "1", "> 1", context);

const expectedOneFoundNoneErrorFailure = (query: QueryConfig, context: t.mixed) =>
  new PgRowCountError(query, "1", "0", context);

const expectedOneOrNoneErrorFailure = (query: QueryConfig, context: t.mixed) =>
  new PgRowCountError(query, "0 or 1", "> 1", context);

export type QueryAnyError = PgDriverQueryError | PgRowValidationError;
export type QueryNoneError = PgDriverQueryError | PgRowCountError;
export type QueryOneError = PgDriverQueryError | PgRowValidationError | PgRowCountError;
export type QueryOneOrMoreError = PgDriverQueryError | PgRowValidationError | PgRowCountError;
export type QueryOneOrNoneError = PgDriverQueryError | PgRowValidationError | PgRowCountError;

const queryAny = (transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
  context?: t.mixed,
): ReaderTaskEither<ConnectedEnvironment, QueryAnyError, A[]> =>
  ask<ConnectedEnvironment, QueryAnyError>()
    .map(connectionLens.get)
    .map(executeQuery(query, context))
    .chain(fromTaskEither)
    .map(({ rows }) => transformer(rows))
    .map(rows =>
      t
        .array(type)
        .decode(rows)
        .mapLeft(makeRowValidationError(type, rows, context)),
    )
    .chain(fromEither);

const queryNone = (
  query: QueryConfig,
  context?: t.mixed,
): ReaderTaskEither<ConnectedEnvironment, QueryNoneError, void> =>
  ask<ConnectedEnvironment, QueryNoneError>()
    .map(connectionLens.get)
    .map(executeQuery(query, context))
    .chain(fromTaskEither)
    .map(fromPredicate(isNoneResult, constant(expectedNoneFoundSomeErrorFailure(query, context))))
    .chain(fromEither)
    .map<void>(() => {
      return;
    });

const queryOne = (transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
  context?: t.mixed,
): ReaderTaskEither<ConnectedEnvironment, QueryOneError, A> =>
  ask<ConnectedEnvironment, QueryOneError>()
    .map(connectionLens.get)
    .map(executeQuery(query, context))
    .chain(fromTaskEither)
    .map(
      fromPredicate(isOneResult, result =>
        fromPredicate(isNoneResult, identity)(result).fold(
          constant(expectedOneFoundManyErrorFailure(query, context)),
          constant(expectedOneFoundNoneErrorFailure(query, context)),
        ),
      ),
    )
    .chain(fromEither)
    .map(({ rows }) => transformer(rows)[0])
    .map(row => type.decode(row).mapLeft(makeRowValidationError(type, row, context)))
    .chain(fromEither);

const queryOneOrMore = (transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
  context?: t.mixed,
): ReaderTaskEither<ConnectedEnvironment, QueryOneOrMoreError, NonEmptyArray<A>> =>
  ask<ConnectedEnvironment, QueryOneOrMoreError>()
    .map(connectionLens.get)
    .map(executeQuery(query, context))
    .chain(fromTaskEither)
    .map(fromPredicate(isNonEmptyResult, constant(expectedAtLeastOneErrorFailure(query, context))))
    .chain(fromEither)
    .map(({ rows }) => transformer(rows))
    .map(rows =>
      t
        .array(type)
        .decode(rows)
        .mapLeft(makeRowValidationError(type, rows, context)),
    )
    .chain(fromEither)
    .map(rows => new NonEmptyArray(rows[0], rows.slice(1)));

const queryOneOrNone = (transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
  context?: t.mixed,
): ReaderTaskEither<ConnectedEnvironment, QueryOneOrNoneError, Option<A>> =>
  ask<ConnectedEnvironment, QueryOneOrNoneError>()
    .map(connectionLens.get)
    .map(executeQuery(query, context))
    .chain(fromTaskEither)
    .map(fromPredicate(isOneOrNoneResult, constant(expectedOneOrNoneErrorFailure(query, context))))
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
