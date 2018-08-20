"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PgPoolCheckoutError extends Error {
    constructor(error) {
        super("Unable to checkout a connection from the pool.");
        this.error = error;
        this._T = Symbol("PgPoolCheckoutError");
        Error.captureStackTrace(this, PgPoolCheckoutError);
        this.name = this.constructor.name;
    }
}
exports.PgPoolCheckoutError = PgPoolCheckoutError;
exports.makePoolCheckoutError = (e) => new PgPoolCheckoutError(e);
exports.isPoolCheckoutError = (e) => e instanceof PgPoolCheckoutError;
class PgPoolCreationError extends Error {
    constructor(error) {
        super("Unable to create a connection pool.");
        this.error = error;
        this._T = Symbol("PgPoolCreationError");
        Error.captureStackTrace(this, PgPoolCreationError);
        this.name = this.constructor.name;
    }
}
exports.PgPoolCreationError = PgPoolCreationError;
exports.makePoolCreationError = (e) => new PgPoolCreationError(e);
exports.isPoolCreationError = (e) => e instanceof PgPoolCreationError;
class PgPoolShutdownError extends Error {
    constructor(error) {
        super("Unable to shutdown a connection pool.");
        this.error = error;
        this._T = Symbol("PgPoolShutdownError");
        Error.captureStackTrace(this, PgPoolShutdownError);
        this.name = this.constructor.name;
    }
}
exports.PgPoolShutdownError = PgPoolShutdownError;
exports.makePoolShutdownError = (e) => new PgPoolShutdownError(e);
exports.isPoolShutdownError = (e) => e instanceof PgPoolShutdownError;
class PgDriverQueryError extends Error {
    constructor(error, query) {
        super("Error raised by node-pg during query execution.");
        this.error = error;
        this.query = query;
        this._T = Symbol("PgDriverQueryError");
        Error.captureStackTrace(this, PgDriverQueryError);
        this.name = this.constructor.name;
    }
}
exports.PgDriverQueryError = PgDriverQueryError;
exports.makeDriverQueryError = (query) => (e) => new PgDriverQueryError(e, query);
exports.isDriverQueryError = (e) => e instanceof PgDriverQueryError;
class PgRowCountError extends Error {
    constructor(query, expected, received) {
        super("Query returned an unexpected number of rows.");
        this.query = query;
        this.expected = expected;
        this.received = received;
        this._T = Symbol("PgRowCountError");
        Error.captureStackTrace(this, PgRowCountError);
        this.name = this.constructor.name;
    }
}
exports.PgRowCountError = PgRowCountError;
exports.makeRowCountError = (query) => (e) => new PgDriverQueryError(e, query);
exports.isRowCountError = (e) => e instanceof PgRowCountError;
class PgRowValidationError extends Error {
    constructor(type, value, errors) {
        super("Validation of a result row failed.");
        this.type = type;
        this.value = value;
        this.errors = errors;
        this._T = Symbol("PgRowValidationError");
        Error.captureStackTrace(this, PgRowValidationError);
        this.name = this.constructor.name;
    }
}
exports.PgRowValidationError = PgRowValidationError;
exports.makeRowValidationError = (type, value) => (errors) => new PgRowValidationError(type, value, errors);
exports.isRowValidationError = (e) => e instanceof PgRowValidationError;
class PgTypeParserSetupError extends Error {
    constructor(error) {
        super("Type parser setup failed.");
        this.error = error;
        this._T = Symbol("PgTypeParserSetupError");
        Error.captureStackTrace(this, PgTypeParserSetupError);
        this.name = this.constructor.name;
    }
}
exports.PgTypeParserSetupError = PgTypeParserSetupError;
exports.makeTypeParserSetupError = (e) => new PgTypeParserSetupError(e);
exports.isTypeParserSetupError = (e) => e instanceof PgTypeParserSetupError;
class PgTransactionRollbackError extends Error {
    constructor(rollbackError, connectionError) {
        super("A ROLLBACK was requested but not successfully completed.");
        this.rollbackError = rollbackError;
        this.connectionError = connectionError;
        this._T = Symbol("PgTransactionRollbackError");
        Error.captureStackTrace(this, PgTransactionRollbackError);
        this.name = this.constructor.name;
    }
}
exports.PgTransactionRollbackError = PgTransactionRollbackError;
exports.makeTransactionRollbackError = (rollbackError, connectionError) => new PgTransactionRollbackError(rollbackError, connectionError);
exports.isTransactionRollbackError = (e) => e instanceof PgTransactionRollbackError;
class PgUnhandledConnectionError extends Error {
    constructor(error) {
        super("An unhandled error was raised by a connection.");
        this.error = error;
        this._T = Symbol("PgUnhandledConnectionError");
        Error.captureStackTrace(this, PgUnhandledConnectionError);
        this.name = this.constructor.name;
    }
}
exports.PgUnhandledConnectionError = PgUnhandledConnectionError;
exports.makeUnhandledConnectionError = (e) => new PgUnhandledConnectionError(e);
exports.isUnhandledConnectionError = (e) => e instanceof PgUnhandledConnectionError;
class PgUnhandledPoolError extends Error {
    constructor(error) {
        super("An unhandled error was raised by a connection pool.");
        this.error = error;
        this._T = Symbol("PgUnhandledPoolError");
        Error.captureStackTrace(this, PgUnhandledPoolError);
        this.name = this.constructor.name;
    }
}
exports.PgUnhandledPoolError = PgUnhandledPoolError;
exports.makeUnhandledPoolError = (e) => new PgUnhandledPoolError(e);
exports.isUnhandledPoolError = (e) => e instanceof PgUnhandledPoolError;
//# sourceMappingURL=errors.js.map