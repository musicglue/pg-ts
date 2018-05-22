import { head } from "fp-ts/lib/Array";
import { fromPredicate } from "fp-ts/lib/Either";
import { constant, identity, or, Predicate } from "fp-ts/lib/function";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { fromEither as optionFromEither, Option } from "fp-ts/lib/Option";
import * as t from "io-ts";
import { QueryConfig } from "pg";
import { PgConnection } from "./connection";
import { executeQuery as driverExecuteQuery, PgQueryResult } from "./driver";
import { askConnection, PgReaderTaskEither } from "./pgReaderTaskEither";
import {
  ErrorFailure,
  mapToErrorFailure,
  mapToValidationFailure,
  QueryFailure,
} from "./queryFailure";
import { fromEither, fromTaskEither, ReaderTaskEither } from "./utils/readerTaskEither";

export interface DbResponse {
  rows: t.mixed[];
}

export type Transformer = (x: t.mixed[]) => t.mixed[];

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

export const queryAny = (transformer: Transformer = identity) => <A>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
): PgReaderTaskEither<QueryFailure<typeof type>, A[]> =>
  askConnection()
    .map(executeQuery(query).value)
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

export const queryNone = (query: QueryConfig): PgReaderTaskEither<ErrorFailure, void> =>
  askConnection()
    .map(executeQuery(query).value)
    .chain(fromTaskEither)
    .mapLeft(mapToErrorFailure)
    .map(fromPredicate(isNoneResult, constant(expectedNoneFoundSomeErrorFailure)))
    .chain(fromEither)
    .map<void>(() => undefined as any);

export const queryOne = (transformer: Transformer = identity) => <A>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
): PgReaderTaskEither<QueryFailure<typeof type>, A> =>
  askConnection()
    .map(executeQuery(query).value)
    .chain(fromTaskEither)
    .mapLeft<QueryFailure<typeof type>>(mapToErrorFailure)
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
    .map(x => x)
    .chain(fromEither);

export const queryOneOrMore = (transformer: Transformer = identity) => <A>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
): PgReaderTaskEither<QueryFailure<typeof type>, NonEmptyArray<A>> =>
  askConnection()
    .map(executeQuery(query).value)
    .chain(fromTaskEither)
    .mapLeft<QueryFailure<typeof type>>(mapToErrorFailure)
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
    .map(rows => new NonEmptyArray(rows[0], rows.slice(1)));

export const queryOneOrNone = (transformer: Transformer = identity) => <A>(
  type: t.Type<A, any, t.mixed>,
  query: QueryConfig,
): PgReaderTaskEither<QueryFailure<typeof type>, Option<A>> =>
  askConnection()
    .map(executeQuery(query).value)
    .chain(fromTaskEither)
    .mapLeft<QueryFailure<typeof type>>(mapToErrorFailure)
    .map(fromPredicate(isOneOrNoneResult, constant(expectedOneOrNoneErrorFailure)))
    .chain(fromEither)
    .map(({ rows }) => transformer(rows))
    .map(rows =>
      head(rows)
        .map(row => type.decode(row))
        .chain(optionFromEither),
    );
