import { head } from "fp-ts/lib/Array";
import { either, fromPredicate, right } from "fp-ts/lib/Either";
import { constant, identity, or, Predicate } from "fp-ts/lib/function";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { Option, option } from "fp-ts/lib/Option";
import { ask, fromTaskEither, ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { fromEither } from "fp-ts/lib/TaskEither";
import { sequence } from "fp-ts/lib/Traversable";
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

const sequenceEO = sequence(either, option);

const queryAny = (transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
  context?: t.mixed,
): ReaderTaskEither<ConnectedEnvironment, QueryAnyError, A[]> =>
  ask<ConnectedEnvironment, QueryAnyError>().chain(environment => {
    const connection = connectionLens.get(environment);
    const queryResultTE = executeQuery(query, context)(connection).mapLeft<QueryAnyError>(identity);

    const decodedQueryResultTE = queryResultTE.chain(({ rows }) => {
      const transformedRows = transformer(rows);

      return fromEither(
        t
          .array(type)
          .decode(transformedRows)
          .mapLeft(makeRowValidationError(type, transformedRows, context)),
      );
    });

    return fromTaskEither(decodedQueryResultTE);
  });

const queryNone = (
  query: QueryConfig,
  context?: t.mixed,
): ReaderTaskEither<ConnectedEnvironment, QueryNoneError, void> =>
  ask<ConnectedEnvironment, QueryNoneError>().chain(environment => {
    const connection = connectionLens.get(environment);
    const queryResultTE = executeQuery(query, context)(connection).mapLeft<QueryNoneError>(
      identity,
    );

    const decodedQueryResultTE = queryResultTE.chain(result =>
      fromEither(
        fromPredicate(isNoneResult, constant(expectedNoneFoundSomeErrorFailure(query, context)))(
          result,
        ).map<void>(() => void 0),
      ),
    );

    return fromTaskEither(decodedQueryResultTE);
  });

const queryOne = (transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
  context?: t.mixed,
): ReaderTaskEither<ConnectedEnvironment, QueryOneError, A> =>
  ask<ConnectedEnvironment, QueryOneError>().chain(environment => {
    const connection = connectionLens.get(environment);
    const queryResultTE = executeQuery(query, context)(connection).mapLeft<QueryOneError>(identity);

    const decodedQueryResultTE = queryResultTE.chain(result =>
      fromEither(
        fromPredicate(isOneResult, r =>
          fromPredicate(isNoneResult, identity)(r).fold(
            constant(expectedOneFoundManyErrorFailure(query, context)),
            constant(expectedOneFoundNoneErrorFailure(query, context)),
          ),
        )(result)
          .map(({ rows }) => transformer(rows)[0])
          .mapLeft<QueryOneError>(identity)
          .chain(row => type.decode(row).mapLeft(makeRowValidationError(type, row, context))),
      ),
    );

    return fromTaskEither(decodedQueryResultTE);
  });

const queryOneOrMore = (transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
  context?: t.mixed,
): ReaderTaskEither<ConnectedEnvironment, QueryOneOrMoreError, NonEmptyArray<A>> =>
  ask<ConnectedEnvironment, QueryOneOrMoreError>().chain(environment => {
    const connection = connectionLens.get(environment);
    const queryResultTE = executeQuery(query, context)(connection).mapLeft<QueryOneOrMoreError>(
      identity,
    );

    const decodedQueryResultTE = queryResultTE.chain(result =>
      fromEither(
        fromPredicate(isNonEmptyResult, constant(expectedAtLeastOneErrorFailure(query, context)))(
          result,
        )
          .map(({ rows }) => transformer(rows))
          .mapLeft<QueryOneOrMoreError>(identity)
          .chain(rows =>
            t
              .array(type)
              .decode(rows)
              .mapLeft(makeRowValidationError(type, rows, context)),
          )
          .map(rows => new NonEmptyArray(rows[0], rows.slice(1))),
      ),
    );

    return fromTaskEither(decodedQueryResultTE);
  });

const queryOneOrNone = (transformer: RowTransformer = identity) => <A = any>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
  context?: t.mixed,
): ReaderTaskEither<ConnectedEnvironment, QueryOneOrNoneError, Option<A>> =>
  ask<ConnectedEnvironment, QueryOneOrNoneError>().chain(environment => {
    const connection = connectionLens.get(environment);

    const queryResultTE = executeQuery(query, context)(connection).mapLeft<QueryOneOrNoneError>(
      identity,
    );

    const decodedQueryResultTE = queryResultTE.chain(result =>
      fromEither(
        fromPredicate(isOneOrNoneResult, constant(expectedOneOrNoneErrorFailure(query, context)))(
          result,
        )
          .mapLeft<QueryOneOrNoneError>(identity)
          .map(({ rows }) => transformer(rows))
          .chain(rows =>
            right<t.Errors, Option<t.mixed>>(head(rows))
              .chain(rowO => sequenceEO(rowO.map(row => type.decode(row))))
              .mapLeft(makeRowValidationError(type, rows, context)),
          ),
      ),
    );

    return fromTaskEither(decodedQueryResultTE);
  });

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
