import { fromArray, NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { none, Option, some } from "fp-ts/lib/Option";
import { of as taskOf } from "fp-ts/lib/Task";
import { fromEither, left, right, TaskEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { Errors, mixed } from "io-ts";
import { QueryConfig } from "pg";
import { Connection, executeQuery as driverExecuteQuery, QueryResult } from "./driver";
import { ParserSetup } from "./parser";
import { CamelifyOptions, makeCamelCaser as _makeCamelCaser } from "./utils/camelify";

export interface DbResponse {
  rows: mixed[];
}

export interface PostProcessingConfig {
  camelCaser: CamelifyOptions;
}

export interface QueryConnection {
  connection: Connection;
  parserSetup: ParserSetup;
}

const executeQuery = (
  query: QueryConfig,
  { connection, parserSetup }: QueryConnection,
): TaskEither<Error, QueryResult> => parserSetup.chain(() => driverExecuteQuery(connection, query));

const makeCamelCaser = (config: PostProcessingConfig) => {
  const camelcase = _makeCamelCaser(config.camelCaser);

  return (rows: mixed[]) => rows.map(camelcase);
};

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

export const queryAny = (config: PostProcessingConfig) => {
  const camelCase = makeCamelCaser(config);

  return <S, A>(type: t.Type<S, A>, query: QueryConfig) => (
    queryConnection: QueryConnection,
  ): TaskEither<Error | Errors, A[]> =>
    executeQuery(query, queryConnection)
      .mapLeft((err): Error | Errors => err)
      .chain(result =>
        fromEither(t.validate(camelCase(result.rows), t.array(type))).mapLeft(
          (err): Error | Errors => err,
        ),
      );
};

export const queryNone = (query: QueryConfig) => (
  queryConnection: QueryConnection,
): TaskEither<Error, void> =>
  executeQuery(query, queryConnection).chain(result => {
    if (result.rows.length > 0) {
      return left<Error, void>(taskOf(new ResponseNumberError(expectedNoneFoundSome)));
    }

    return right<Error, void>(taskOf(undefined as any));
  });

export const queryOne = (config: PostProcessingConfig) => {
  const camelCase = makeCamelCaser(config);

  return <S, A>(type: t.Type<S, A>, query: QueryConfig) => (
    queryConnection: QueryConnection,
  ): TaskEither<Error | Errors, A> =>
    executeQuery(query, queryConnection)
      .mapLeft((err): Error | Errors => err)
      .chain(result => {
        if (result.rows.length === 0) {
          return left<Error | Errors, A>(taskOf(new ResponseNumberError(expectedOneNoneFound)));
        }

        if (result.rows.length > 1) {
          return left<Error | Errors, A>(taskOf(new ResponseNumberError(expectedOneManyFound)));
        }

        return fromEither(t.validate(camelCase(result.rows)[0], type));
      });
};

export const queryOneOrMore = (config: PostProcessingConfig) => {
  const camelCase = makeCamelCaser(config);

  return <S, A>(type: t.Type<S, A>, query: QueryConfig) => (
    queryConnection: QueryConnection,
  ): TaskEither<Error | Errors, NonEmptyArray<A>> =>
    executeQuery(query, queryConnection)
      .mapLeft((err): Error | Errors => err)
      .chain(result =>
        fromEither(t.validate(camelCase(result.rows), t.array(type)))
          .mapLeft((err): Error | Errors => err)
          .chain(a =>
            fromArray(a).fold(
              () =>
                left<Error | Errors, NonEmptyArray<A>>(
                  taskOf(new ResponseNumberError(expectedAtLeastOneRow)),
                ),
              array => right<Error | Errors, NonEmptyArray<A>>(taskOf(array)),
            ),
          ),
      );
};

export const queryOneOrNone = (config: PostProcessingConfig) => {
  const camelCase = makeCamelCaser(config);

  return <S, A>(type: t.Type<S, A>, query: QueryConfig) => (
    queryConnection: QueryConnection,
  ): TaskEither<Error | Errors, Option<A>> =>
    executeQuery(query, queryConnection)
      .mapLeft((err): Error | Errors => err)
      .chain(result => {
        if (result.rows.length > 1) {
          return left<Error | Errors, Option<A>>(
            taskOf(new ResponseNumberError(expectedOneOrNone)),
          );
        }

        if (result.rows.length === 0) {
          return right<Error | Errors, Option<A>>(taskOf(none));
        }

        return fromEither(t.validate(camelCase(result.rows)[0], type)).map(some);
      });
};
