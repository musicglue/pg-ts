import { identity } from "fp-ts/lib/function";
import { fromArray, NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { none, Option, some } from "fp-ts/lib/Option";
import { task } from "fp-ts/lib/Task";
import { fromEither, left, right, TaskEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { mixed } from "io-ts";
import { QueryConfig } from "pg";
import { Connection, executeQuery as driverExecuteQuery, QueryResult } from "./driver";
import { ParserSetup } from "./parser";
import {
  ErrorFailure,
  mapToErrorFailure,
  mapToValidationFailure,
  QueryFailure,
} from "./queryFailure";

export interface DbResponse {
  rows: mixed[];
}

export type Transformer = (x: mixed[]) => mixed[];

export interface QueryConnection {
  connection: Connection;
  parserSetup: ParserSetup;
}

const executeQuery = (
  query: QueryConfig,
  { connection, parserSetup }: QueryConnection,
): TaskEither<Error, QueryResult> => parserSetup.chain(() => driverExecuteQuery(connection, query));

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

export const queryAny = (transformer: Transformer = identity) => <T extends t.Mixed>(
  type: T,
  query: QueryConfig,
) => (queryConnection: QueryConnection): TaskEither<QueryFailure<T>, Array<t.TypeOf<T>>> =>
  executeQuery(query, queryConnection)
    .mapLeft<QueryFailure<T>>(mapToErrorFailure)
    .chain(result => {
      const transformedRows = transformer(result.rows);

      return fromEither(t.array(type).decode(transformedRows)).mapLeft(
        mapToValidationFailure(type, transformedRows),
      );
    });

export const queryNone = (query: QueryConfig) => (
  queryConnection: QueryConnection,
): TaskEither<ErrorFailure, void> =>
  executeQuery(query, queryConnection)
    .mapLeft(mapToErrorFailure)
    .chain((result): TaskEither<ErrorFailure, void> => {
      if (result.rows.length > 0) {
        return left<ErrorFailure, void>(
          task.of(mapToErrorFailure(new ResponseNumberError(expectedNoneFoundSome))),
        );
      }

      return right<ErrorFailure, void>(task.of(undefined as any));
    });

export const queryOne = (transformer: Transformer = identity) => <T extends t.Mixed>(
  type: T,
  query: QueryConfig,
) => (queryConnection: QueryConnection): TaskEither<QueryFailure<T>, t.TypeOf<T>> =>
  executeQuery(query, queryConnection)
    .mapLeft<QueryFailure<T>>(mapToErrorFailure)
    .chain(result => {
      if (result.rows.length === 0) {
        return left<QueryFailure<T>, t.TypeOf<T>>(
          task.of(mapToErrorFailure(new ResponseNumberError(expectedOneNoneFound))),
        );
      }

      if (result.rows.length > 1) {
        return left<QueryFailure<T>, t.TypeOf<T>>(
          task.of(mapToErrorFailure(new ResponseNumberError(expectedOneManyFound))),
        );
      }

      const transformedRow = transformer(result.rows)[0];

      return fromEither(type.decode(transformedRow)).mapLeft(
        mapToValidationFailure(type, transformedRow),
      );
    });

export const queryOneOrMore = (transformer: Transformer = identity) => <T extends t.Type<any>>(
  type: T,
  query: QueryConfig,
) => (queryConnection: QueryConnection): TaskEither<QueryFailure<T>, NonEmptyArray<t.TypeOf<T>>> =>
  executeQuery(query, queryConnection)
    .mapLeft<QueryFailure<T>>(mapToErrorFailure)
    .chain(result => {
      const transformedRows = transformer(result.rows);

      return fromEither(t.array(type).decode(transformedRows))
        .mapLeft<QueryFailure<T>>(mapToValidationFailure(type, transformedRows))
        .chain(a =>
          fromArray(a).foldL(
            () =>
              left<QueryFailure<T>, NonEmptyArray<t.TypeOf<T>>>(
                task.of(mapToErrorFailure(new ResponseNumberError(expectedAtLeastOneRow))),
              ),
            array => right<QueryFailure<T>, NonEmptyArray<t.TypeOf<T>>>(task.of(array)),
          ),
        );
    });

export const queryOneOrNone = (transformer: Transformer = identity) => <T extends t.Type<any>>(
  type: T,
  query: QueryConfig,
) => (queryConnection: QueryConnection): TaskEither<QueryFailure<T>, Option<t.TypeOf<T>>> =>
  executeQuery(query, queryConnection)
    .mapLeft<QueryFailure<T>>(mapToErrorFailure)
    .chain(result => {
      if (result.rows.length > 1) {
        return left<QueryFailure<T>, Option<t.TypeOf<T>>>(
          task.of(mapToErrorFailure(new ResponseNumberError(expectedOneOrNone))),
        );
      }

      if (result.rows.length === 0) {
        return right<QueryFailure<T>, Option<t.TypeOf<T>>>(task.of(none));
      }

      const transformedRow = transformer(result.rows)[0];

      return fromEither(type.decode(transformedRow))
        .mapLeft<QueryFailure<T>>(mapToValidationFailure(type, transformedRow))
        .map(some);
    });
