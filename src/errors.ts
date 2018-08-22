import * as t from "io-ts";
import { QueryConfig } from "pg";

export class PgPoolCheckoutError extends Error {
  public readonly _PgPoolCheckoutError: void;

  constructor(public readonly error: t.mixed) {
    super("Unable to checkout a connection from the pool.");

    Error.captureStackTrace(this, PgPoolCheckoutError);
    this.name = this.constructor.name;
  }
}

export const makePoolCheckoutError = (e: t.mixed) => new PgPoolCheckoutError(e);
export const isPoolCheckoutError = (e: t.mixed): e is PgPoolCheckoutError =>
  e instanceof PgPoolCheckoutError;

export class PgPoolCreationError extends Error {
  public readonly _PgPoolCreationError: void;

  constructor(public readonly error: t.mixed) {
    super("Unable to create a connection pool.");

    Error.captureStackTrace(this, PgPoolCreationError);
    this.name = this.constructor.name;
  }
}

export const makePoolCreationError = (e: t.mixed) => new PgPoolCreationError(e);
export const isPoolCreationError = (e: t.mixed): e is PgPoolCreationError =>
  e instanceof PgPoolCreationError;

export class PgPoolShutdownError extends Error {
  public readonly _PgPoolShutdownError: void;

  constructor(public readonly error: t.mixed) {
    super("Unable to shutdown a connection pool.");

    Error.captureStackTrace(this, PgPoolShutdownError);
    this.name = this.constructor.name;
  }
}

export const makePoolShutdownError = (e: t.mixed) => new PgPoolShutdownError(e);
export const isPoolShutdownError = (e: t.mixed): e is PgPoolShutdownError =>
  e instanceof PgPoolShutdownError;

export class PgDriverQueryError extends Error {
  public readonly _PgDriverQueryError: void;

  constructor(public readonly error: t.mixed, public readonly query: QueryConfig) {
    super("Error raised by node-pg during query execution.");

    Error.captureStackTrace(this, PgDriverQueryError);
    this.name = this.constructor.name;
  }
}

export const makeDriverQueryError = (query: QueryConfig) => (e: t.mixed) =>
  new PgDriverQueryError(e, query);
export const isDriverQueryError = (e: t.mixed): e is PgDriverQueryError =>
  e instanceof PgDriverQueryError;

export class PgRowCountError extends Error {
  public readonly _PgRowCountError: void;

  constructor(
    public readonly query: QueryConfig,
    public readonly expected: string,
    public readonly received: string,
  ) {
    super("Query returned an unexpected number of rows.");

    Error.captureStackTrace(this, PgRowCountError);
    this.name = this.constructor.name;
  }
}

export const makeRowCountError = (query: QueryConfig) => (e: t.mixed) =>
  new PgDriverQueryError(e, query);
export const isRowCountError = (e: t.mixed): e is PgRowCountError => e instanceof PgRowCountError;

export class PgRowValidationError extends Error {
  public readonly _PgRowValidationError: void;

  constructor(
    public readonly type: t.Any,
    public readonly value: t.mixed,
    public readonly errors: t.Errors,
  ) {
    super("Validation of a result row failed.");

    Error.captureStackTrace(this, PgRowValidationError);
    this.name = this.constructor.name;
  }
}

export const makeRowValidationError = (type: t.Any, value: t.mixed) => (errors: t.Errors) =>
  new PgRowValidationError(type, value, errors);
export const isRowValidationError = (e: t.mixed): e is PgRowValidationError =>
  e instanceof PgRowValidationError;

export class PgTypeParserSetupError extends Error {
  public readonly _PgTypeParserSetupError: void;

  constructor(public readonly error: t.mixed) {
    super("Type parser setup failed.");

    Error.captureStackTrace(this, PgTypeParserSetupError);
    this.name = this.constructor.name;
  }
}

export const makeTypeParserSetupError = (e: t.mixed) => new PgTypeParserSetupError(e);
export const isTypeParserSetupError = (e: t.mixed): e is PgTypeParserSetupError =>
  e instanceof PgTypeParserSetupError;

export class PgTransactionRollbackError extends Error {
  public readonly _PgTransactionRollbackError: void;

  constructor(public readonly rollbackError: t.mixed, public readonly connectionError: t.mixed) {
    super("A ROLLBACK was requested but not successfully completed.");

    Error.captureStackTrace(this, PgTransactionRollbackError);
    this.name = this.constructor.name;
  }
}

export const makeTransactionRollbackError = (rollbackError: t.mixed, connectionError: t.mixed) =>
  new PgTransactionRollbackError(rollbackError, connectionError);
export const isTransactionRollbackError = (e: t.mixed): e is PgTransactionRollbackError =>
  e instanceof PgTransactionRollbackError;

export class PgUnhandledConnectionError extends Error {
  public readonly _PgUnhandledConnectionError: void;

  constructor(public readonly error: t.mixed) {
    super("An unhandled error was raised by a connection.");

    Error.captureStackTrace(this, PgUnhandledConnectionError);
    this.name = this.constructor.name;
  }
}

export const makeUnhandledConnectionError = (e: t.mixed) => new PgUnhandledConnectionError(e);
export const isUnhandledConnectionError = (e: t.mixed): e is PgUnhandledConnectionError =>
  e instanceof PgUnhandledConnectionError;

export class PgUnhandledPoolError extends Error {
  public readonly _PgUnhandledPoolError: void;

  constructor(public readonly error: t.mixed) {
    super("An unhandled error was raised by a connection pool.");

    Error.captureStackTrace(this, PgUnhandledPoolError);
    this.name = this.constructor.name;
  }
}

export const makeUnhandledPoolError = (e: t.mixed) => new PgUnhandledPoolError(e);
export const isUnhandledPoolError = (e: t.mixed): e is PgUnhandledPoolError =>
  e instanceof PgUnhandledPoolError;
