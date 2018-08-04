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

export type QueryAnyError = PgDriverQueryError | PgRowValidationError;
export type QueryNoneError = PgDriverQueryError | PgRowCountError;
export type QueryOneError = PgDriverQueryError | PgRowValidationError | PgRowCountError;
export type QueryOneOrMoreError = PgDriverQueryError | PgRowValidationError | PgRowCountError;
export type QueryOneOrNoneError = PgDriverQueryError | PgRowValidationError | PgRowCountError;

const queryAny = <E = {}>(transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
): ReaderTaskEither<E & ConnectedEnvironment, QueryAnyError, A[]> =>
  ask<E & ConnectedEnvironment, QueryAnyError>()
    .map(connectionLens.get)
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

const queryNone = <E = {}>(
  query: QueryConfig,
): ReaderTaskEither<E & ConnectedEnvironment, QueryNoneError, void> =>
  ask<E & ConnectedEnvironment, QueryNoneError>()
    .map(connectionLens.get)
    .map(executeQuery(query))
    .chain(fromTaskEither)
    .map(fromPredicate(isNoneResult, constant(expectedNoneFoundSomeErrorFailure(query))))
    .chain(fromEither)
    .map<void>(() => {
      return;
    });

const queryOne = <E = {}>(transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
): ReaderTaskEither<E & ConnectedEnvironment, QueryOneError, A> =>
  ask<E & ConnectedEnvironment, QueryOneError>()
    .map(connectionLens.get)
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

const queryOneOrMore = <E = {}>(transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
): ReaderTaskEither<E & ConnectedEnvironment, QueryOneOrMoreError, NonEmptyArray<A>> =>
  ask<E & ConnectedEnvironment, QueryOneOrMoreError>()
    .map(connectionLens.get)
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

const queryOneOrNone = <E = {}>(transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
): ReaderTaskEither<E & ConnectedEnvironment, QueryOneOrNoneError, Option<A>> =>
  ask<E & ConnectedEnvironment, QueryOneOrNoneError>()
    .map(connectionLens.get)
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
