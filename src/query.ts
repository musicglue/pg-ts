import { identity } from "fp-ts/lib/function";
import { fromArray, NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { none, Option, some } from "fp-ts/lib/Option";
import { task } from "fp-ts/lib/Task";
import { fromEither, left, right, TaskEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { Errors, mixed } from "io-ts";
import { QueryConfig } from "pg";
import { Connection, executeQuery as driverExecuteQuery, QueryResult } from "./driver";
import { ParserSetup } from "./parser";

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

export const queryAny = (transformer: Transformer = identity) => <
  T extends t.Type<A, O, t.mixed>,
  A = any,
  O = A
>(
  type: T,
  query: QueryConfig,
) => (queryConnection: QueryConnection): TaskEither<Error | Errors, A[]> =>
  executeQuery(query, queryConnection)
    .mapLeft((err): Error | Errors => err)
    .chain(result =>
      fromEither(t.array(type).decode(transformer(result.rows))).mapLeft(
        (err): Error | Errors => err,
      ),
    );

export const queryNone = (query: QueryConfig) => (
  queryConnection: QueryConnection,
): TaskEither<Error, void> =>
  executeQuery(query, queryConnection).chain(result => {
    if (result.rows.length > 0) {
      return left<Error, void>(task.of(new ResponseNumberError(expectedNoneFoundSome)));
    }

    return right<Error, void>(task.of(undefined as any));
  });

export const queryOne = (transformer: Transformer = identity) => <
  T extends t.Type<A, O, t.mixed>,
  A = any,
  O = A
>(
  type: T,
  query: QueryConfig,
) => (queryConnection: QueryConnection): TaskEither<Error | Errors, A> =>
  executeQuery(query, queryConnection)
    .mapLeft((err): Error | Errors => err)
    .chain(result => {
      if (result.rows.length === 0) {
        return left<Error | Errors, A>(task.of(new ResponseNumberError(expectedOneNoneFound)));
      }

      if (result.rows.length > 1) {
        return left<Error | Errors, A>(task.of(new ResponseNumberError(expectedOneManyFound)));
      }

      return fromEither(type.decode(transformer(result.rows)[0]));
    });

export const queryOneOrMore = (transformer: Transformer = identity) => <
  T extends t.Type<A, O, t.mixed>,
  A = any,
  O = A
>(
  type: T,
  query: QueryConfig,
) => (queryConnection: QueryConnection): TaskEither<Error | Errors, NonEmptyArray<A>> =>
  executeQuery(query, queryConnection)
    .mapLeft((err): Error | Errors => err)
    .chain(result =>
      fromEither(t.array(type).decode(transformer(result.rows)))
        .mapLeft((err): Error | Errors => err)
        .chain(a =>
          fromArray(a).foldL(
            () =>
              left<Error | Errors, NonEmptyArray<A>>(
                task.of(new ResponseNumberError(expectedAtLeastOneRow)),
              ),
            array => right<Error | Errors, NonEmptyArray<A>>(task.of(array)),
          ),
        ),
    );

export const queryOneOrNone = (transformer: Transformer = identity) => <
  T extends t.Type<A, O, t.mixed>,
  A = any,
  O = A
>(
  type: T,
  query: QueryConfig,
) => (queryConnection: QueryConnection): TaskEither<Error | Errors, Option<A>> =>
  executeQuery(query, queryConnection)
    .mapLeft((err): Error | Errors => err)
    .chain(result => {
      if (result.rows.length > 1) {
        return left<Error | Errors, Option<A>>(task.of(new ResponseNumberError(expectedOneOrNone)));
      }

      if (result.rows.length === 0) {
        return right<Error | Errors, Option<A>>(task.of(none));
      }

      return fromEither(type.decode(transformer(result.rows)[0])).map(some);
    });
