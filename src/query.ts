import { head } from "fp-ts/lib/Array";
import { fromPredicate } from "fp-ts/lib/Either";
import { constant, identity, or, Predicate } from "fp-ts/lib/function";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { fromEither as optionFromEither, Option } from "fp-ts/lib/Option";
import { fromEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { mixed } from "io-ts";
import { QueryConfig } from "pg";
import { Connection } from "./connection";
import { executeQuery as driverExecuteQuery, PgQueryResult } from "./driver";
import {
  ErrorFailure,
  mapToErrorFailure,
  mapToValidationFailure,
  QueryFailure,
} from "./queryFailure";
import { ask, fromTaskEither, ReaderTaskEither } from "./utils/readerTaskEither";

export interface DbResponse {
  rows: mixed[];
}

export type PgReaderTaskEither<L, R> = ReaderTaskEither<Connection, L, R>;
export type Transformer = (x: mixed[]) => mixed[];

export const askConnection = <L = Error>() => ask<Connection, L>();

const executeQuery = (query: QueryConfig): PgReaderTaskEither<Error, PgQueryResult> =>
  askConnection<Error>()
    .map(({ parserSetup, pg }) => parserSetup.chain(() => driverExecuteQuery(pg, query)))
    .chain(fromTaskEither);

class ResponseNumberError extends Error {
  constructor(message: string) {
    super(message);

    this.message = message;
    this.name = "ResponseNumberError";
  }
}

const expectedNoneFoundSome = "Query returned rows but no rows were expected";
const expectedOneManyFound = "Query returned many rows but one row was expected";
const expectedOneNoneFound = "Query returned no rows but one row was expected";
const expectedOneOrNone = "Query returned more than one row but one or none were expected";
const expectedAtLeastOneRow = "Query returned no rows but rows were expected";

const constVoid = () => (undefined as any) as void;

const isNoneResult: Predicate<PgQueryResult> = ({ rows }) => rows.length === 0;
const isNonEmptyResult: Predicate<PgQueryResult> = ({ rows }) => rows.length > 0;
const isOneResult: Predicate<PgQueryResult> = ({ rows }) => rows.length === 1;
const isOneOrNoneResult: Predicate<PgQueryResult> = or(isNoneResult, isOneResult);

const expectedAtLeastOneErrorFailure = mapToErrorFailure(
  new ResponseNumberError(expectedAtLeastOneRow),
);
const expectedNoneFoundSomeErrorFailure = mapToErrorFailure(
  new ResponseNumberError(expectedNoneFoundSome),
);
const expectedOneFoundManyErrorFailure = mapToErrorFailure(
  new ResponseNumberError(expectedOneManyFound),
);
const expectedOneFoundNoneErrorFailure = mapToErrorFailure(
  new ResponseNumberError(expectedOneNoneFound),
);
const expectedOneOrNoneErrorFailure = mapToErrorFailure(new ResponseNumberError(expectedOneOrNone));

export const queryAny = (transformer: Transformer = identity) => <T extends t.Mixed>(
  type: T,
  query: QueryConfig,
): PgReaderTaskEither<QueryFailure<T>, Array<t.TypeOf<T>>> =>
  askConnection<QueryFailure<T>>()
    .map(connection =>
      executeQuery(query)
        .run(connection)
        .mapLeft<QueryFailure<T>>(mapToErrorFailure)
        .map(({ rows }) => transformer(rows))
        .map(rows =>
          t
            .array(type)
            .decode(rows)
            .mapLeft(mapToValidationFailure(type, rows)),
        )
        .chain(fromEither),
    )
    .chain(fromTaskEither);

export const queryNone = (query: QueryConfig): PgReaderTaskEither<ErrorFailure, void> =>
  askConnection<ErrorFailure>()
    .map(connection =>
      executeQuery(query)
        .run(connection)
        .mapLeft(mapToErrorFailure)
        .map(fromPredicate(isNoneResult, constant(expectedNoneFoundSomeErrorFailure)))
        .chain(fromEither)
        .map(constVoid),
    )
    .chain(fromTaskEither);

export const queryOne = (transformer: Transformer = identity) => <T extends t.Mixed>(
  type: T,
  query: QueryConfig,
): PgReaderTaskEither<QueryFailure<T>, t.TypeOf<T>> =>
  askConnection<QueryFailure<T>>()
    .map(connection =>
      executeQuery(query)
        .run(connection)
        .mapLeft<QueryFailure<T>>(mapToErrorFailure)
        .map(
          fromPredicate(isOneResult, result =>
            fromPredicate(isNoneResult, identity)(result).fold(
              constant(expectedOneFoundManyErrorFailure),
              constant(expectedOneFoundNoneErrorFailure),
            ),
          ),
        )
        .chain(fromEither)
        .map(({ rows }) => transformer(rows)[0])
        .map(row => type.decode(row).mapLeft(mapToValidationFailure(type, row)))
        .chain(fromEither),
    )
    .chain(fromTaskEither);

export const queryOneOrMore = (transformer: Transformer = identity) => <T extends t.Mixed>(
  type: T,
  query: QueryConfig,
): PgReaderTaskEither<QueryFailure<T>, NonEmptyArray<t.TypeOf<T>>> =>
  askConnection<QueryFailure<T>>()
    .map(connection =>
      executeQuery(query)
        .run(connection)
        .mapLeft<QueryFailure<T>>(mapToErrorFailure)
        .map(fromPredicate(isNonEmptyResult, constant(expectedAtLeastOneErrorFailure)))
        .chain(fromEither)
        .map(({ rows }) => transformer(rows))
        .map(rows =>
          t
            .array(type)
            .decode(rows)
            .mapLeft(mapToValidationFailure(type, rows)),
        )
        .chain(fromEither)
        .map(rows => new NonEmptyArray(rows[0], rows.slice(1))),
    )
    .chain(fromTaskEither);

export const queryOneOrNone = (transformer: Transformer = identity) => <T extends t.Mixed>(
  type: T,
  query: QueryConfig,
): PgReaderTaskEither<QueryFailure<T>, Option<t.TypeOf<T>>> =>
  askConnection<QueryFailure<T>>()
    .map(connection =>
      executeQuery(query)
        .run(connection)
        .mapLeft<QueryFailure<T>>(mapToErrorFailure)
        .map(fromPredicate(isOneOrNoneResult, constant(expectedOneOrNoneErrorFailure)))
        .chain(fromEither)
        .map(({ rows }) => transformer(rows))
        .map(rows =>
          head(rows)
            .map(row => type.decode(row))
            .chain(optionFromEither),
        ),
    )
    .chain(fromTaskEither);
