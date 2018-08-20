import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
import { Option } from "fp-ts/lib/Option";
import { ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import * as t from "io-ts";
import { QueryConfig } from "pg";
import { PgDriverQueryError, PgRowCountError, PgRowValidationError } from "./errors";
import { ConnectedEnvironment, RowTransformer } from "./types";
export declare type QueryAnyError = PgDriverQueryError | PgRowValidationError;
export declare type QueryNoneError = PgDriverQueryError | PgRowCountError;
export declare type QueryOneError = PgDriverQueryError | PgRowValidationError | PgRowCountError;
export declare type QueryOneOrMoreError = PgDriverQueryError | PgRowValidationError | PgRowCountError;
export declare type QueryOneOrNoneError = PgDriverQueryError | PgRowValidationError | PgRowCountError;
export declare const configurableQueries: {
    queryAny: (transformer?: RowTransformer) => <A = any>(type: t.Type<A, any, t.mixed>, query: QueryConfig) => ReaderTaskEither<ConnectedEnvironment, QueryAnyError, A[]>;
    queryNone: (query: QueryConfig) => ReaderTaskEither<ConnectedEnvironment, QueryNoneError, void>;
    queryOne: (transformer?: RowTransformer) => <A = any>(type: t.Type<A, any, t.mixed>, query: QueryConfig) => ReaderTaskEither<ConnectedEnvironment, QueryOneError, A>;
    queryOneOrMore: (transformer?: RowTransformer) => <A = any>(type: t.Type<A, any, t.mixed>, query: QueryConfig) => ReaderTaskEither<ConnectedEnvironment, QueryOneError, NonEmptyArray<A>>;
    queryOneOrNone: (transformer?: RowTransformer) => <A = any>(type: t.Type<A, any, t.mixed>, query: QueryConfig) => ReaderTaskEither<ConnectedEnvironment, QueryOneError, Option<A>>;
};
export declare const camelCasedQueries: {
    queryAny: <A = any>(type: t.Type<A, any, t.mixed>, query: QueryConfig) => ReaderTaskEither<ConnectedEnvironment, QueryAnyError, A[]>;
    queryNone: (query: QueryConfig) => ReaderTaskEither<ConnectedEnvironment, QueryNoneError, void>;
    queryOne: <A = any>(type: t.Type<A, any, t.mixed>, query: QueryConfig) => ReaderTaskEither<ConnectedEnvironment, QueryOneError, A>;
    queryOneOrMore: <A = any>(type: t.Type<A, any, t.mixed>, query: QueryConfig) => ReaderTaskEither<ConnectedEnvironment, QueryOneError, NonEmptyArray<A>>;
    queryOneOrNone: <A = any>(type: t.Type<A, any, t.mixed>, query: QueryConfig) => ReaderTaskEither<ConnectedEnvironment, QueryOneError, Option<A>>;
};
