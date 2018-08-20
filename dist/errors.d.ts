import * as t from "io-ts";
import { QueryConfig } from "pg";
export declare class PgPoolCheckoutError extends Error {
    readonly error: t.mixed;
    readonly _T: symbol;
    constructor(error: t.mixed);
}
export declare const makePoolCheckoutError: (e: t.mixed) => PgPoolCheckoutError;
export declare const isPoolCheckoutError: (e: t.mixed) => e is PgPoolCheckoutError;
export declare class PgPoolCreationError extends Error {
    readonly error: t.mixed;
    readonly _T: symbol;
    constructor(error: t.mixed);
}
export declare const makePoolCreationError: (e: t.mixed) => PgPoolCreationError;
export declare const isPoolCreationError: (e: t.mixed) => e is PgPoolCreationError;
export declare class PgPoolShutdownError extends Error {
    readonly error: t.mixed;
    readonly _T: symbol;
    constructor(error: t.mixed);
}
export declare const makePoolShutdownError: (e: t.mixed) => PgPoolShutdownError;
export declare const isPoolShutdownError: (e: t.mixed) => e is PgPoolShutdownError;
export declare class PgDriverQueryError extends Error {
    readonly error: t.mixed;
    readonly query: QueryConfig;
    readonly _T: symbol;
    constructor(error: t.mixed, query: QueryConfig);
}
export declare const makeDriverQueryError: (query: QueryConfig) => (e: t.mixed) => PgDriverQueryError;
export declare const isDriverQueryError: (e: t.mixed) => e is PgDriverQueryError;
export declare class PgRowCountError extends Error {
    readonly query: QueryConfig;
    readonly expected: string;
    readonly received: string;
    readonly _T: symbol;
    constructor(query: QueryConfig, expected: string, received: string);
}
export declare const makeRowCountError: (query: QueryConfig) => (e: t.mixed) => PgDriverQueryError;
export declare const isRowCountError: (e: t.mixed) => e is PgRowCountError;
export declare class PgRowValidationError extends Error {
    readonly type: t.Any;
    readonly value: t.mixed;
    readonly errors: t.Errors;
    readonly _T: symbol;
    constructor(type: t.Any, value: t.mixed, errors: t.Errors);
}
export declare const makeRowValidationError: (type: t.Type<any, any, any>, value: t.mixed) => (errors: t.ValidationError[]) => PgRowValidationError;
export declare const isRowValidationError: (e: t.mixed) => e is PgRowValidationError;
export declare class PgTypeParserSetupError extends Error {
    readonly error: t.mixed;
    readonly _T: symbol;
    constructor(error: t.mixed);
}
export declare const makeTypeParserSetupError: (e: t.mixed) => PgTypeParserSetupError;
export declare const isTypeParserSetupError: (e: t.mixed) => e is PgTypeParserSetupError;
export declare class PgTransactionRollbackError extends Error {
    readonly rollbackError: t.mixed;
    readonly connectionError: t.mixed;
    readonly _T: symbol;
    constructor(rollbackError: t.mixed, connectionError: t.mixed);
}
export declare const makeTransactionRollbackError: (rollbackError: t.mixed, connectionError: t.mixed) => PgTransactionRollbackError;
export declare const isTransactionRollbackError: (e: t.mixed) => e is PgTransactionRollbackError;
export declare class PgUnhandledConnectionError extends Error {
    readonly error: t.mixed;
    readonly _T: symbol;
    constructor(error: t.mixed);
}
export declare const makeUnhandledConnectionError: (e: t.mixed) => PgUnhandledConnectionError;
export declare const isUnhandledConnectionError: (e: t.mixed) => e is PgUnhandledConnectionError;
export declare class PgUnhandledPoolError extends Error {
    readonly error: t.mixed;
    readonly _T: symbol;
    constructor(error: t.mixed);
}
export declare const makeUnhandledPoolError: (e: t.mixed) => PgUnhandledPoolError;
export declare const isUnhandledPoolError: (e: t.mixed) => e is PgUnhandledPoolError;
