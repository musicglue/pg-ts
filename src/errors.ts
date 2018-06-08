import { mixed } from "io-ts";
import { isError } from "lodash";
import { QueryConfig } from "pg";

export const ensureError = <E extends Error>(toError: (e: mixed) => E) => (caught: mixed): Error =>
  isError(caught) ? caught : toError(caught);

export class PgPoolCheckoutError extends Error {
  constructor(public readonly error: mixed) {
    super("Unable to checkout a connection from the pool.");

    Error.captureStackTrace(this, PgPoolCheckoutError);
    this.name = this.constructor.name;
  }
}

export const catchAsPoolCheckoutError = (e: mixed) => new PgPoolCheckoutError(e);
export const isPgPoolCheckoutErrr = (e: Error): e is PgPoolCheckoutError =>
  e instanceof PgPoolCheckoutError;

export class PgPoolCreationError extends Error {
  constructor(public readonly error: mixed) {
    super("Unable to create a connection pool.");

    Error.captureStackTrace(this, PgPoolCreationError);
    this.name = this.constructor.name;
  }
}

export const catchAsPoolCreationError = (e: mixed) => new PgPoolCreationError(e);
export const isPgPoolCreationError = (e: Error): e is PgPoolCreationError =>
  e instanceof PgPoolCreationError;

export class PgPoolShutdownError extends Error {
  constructor(public readonly error: mixed) {
    super("Unable to shutdown a connection pool.");

    Error.captureStackTrace(this, PgPoolShutdownError);
    this.name = this.constructor.name;
  }
}

export const catchAsPoolShutdownError = (e: mixed) => new PgPoolShutdownError(e);
export const isPgPoolShutdownError = (e: Error): e is PgPoolShutdownError =>
  e instanceof PgPoolShutdownError;

export class PgQueryError extends Error {
  constructor(public readonly error: mixed, public readonly query: QueryConfig) {
    super("Query failed.");

    Error.captureStackTrace(this, PgQueryError);
    this.name = this.constructor.name;
  }
}

export const catchAsQueryError = (query: QueryConfig) => (e: mixed) => new PgQueryError(e, query);
export const isPgQueryError = (e: Error): e is PgQueryError => e instanceof PgQueryError;

export class PgRowCountError extends Error {
  constructor(
    public readonly query: QueryConfig,
    public readonly expected: string,
    public readonly received: string,
  ) {
    super("Query returned an unexpected number of rows.");

    Error.captureStackTrace(this, PgQueryError);
    this.name = this.constructor.name;
  }
}

export const isPgRowCountError = (e: Error): e is PgRowCountError => e instanceof PgRowCountError;

export class PgTypeParserSetupError extends Error {
  constructor(public readonly error: mixed) {
    super("Type parser setup failed.");

    Error.captureStackTrace(this, PgTypeParserSetupError);
    this.name = this.constructor.name;
  }
}

export const catchAsTypeParserSetupError = (e: mixed) => new PgTypeParserSetupError(e);
export const isPgTypeParserSetupError = (e: Error): e is PgTypeParserSetupError =>
  e instanceof PgTypeParserSetupError;

export class PgTransactionRollbackError extends Error {
  constructor(public readonly error: mixed) {
    super("A ROLLBACK was requested but not successfully completed.");

    Error.captureStackTrace(this, PgTransactionRollbackError);
    this.name = this.constructor.name;
  }
}

export const catchAsTransactionRollbackError = (e: mixed) => new PgTransactionRollbackError(e);
export const isPgTransactionRollbackError = (e: Error): e is PgTransactionRollbackError =>
  e instanceof PgTransactionRollbackError;

export class PgUnhandledTransactionError extends Error {
  constructor(public readonly error: mixed) {
    super("An unhandled error occurred during a transaction.");

    Error.captureStackTrace(this, PgUnhandledTransactionError);
    this.name = this.constructor.name;
  }
}

export const catchAsUnhandledTransactionError = (e: mixed) => new PgUnhandledTransactionError(e);
export const ensureAsUnhandledTransactionError = ensureError(catchAsUnhandledTransactionError);
export const isPgUnhandledTransactionError = (e: Error): e is PgUnhandledTransactionError =>
  e instanceof PgUnhandledTransactionError;
