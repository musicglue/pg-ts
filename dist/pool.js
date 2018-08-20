"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Either_1 = require("fp-ts/lib/Either");
const function_1 = require("fp-ts/lib/function");
const IOEither_1 = require("fp-ts/lib/IOEither");
const Option_1 = require("fp-ts/lib/Option");
const ReaderTaskEither_1 = require("fp-ts/lib/ReaderTaskEither");
const TaskEither_1 = require("fp-ts/lib/TaskEither");
const pg = require("pg");
const connection_1 = require("./connection");
const errors_1 = require("./errors");
const parser_1 = require("./parser");
const types_1 = require("./types");
exports.makeConnectionPool = (poolConfig) => {
    const { onError, parsers } = poolConfig;
    const poolIo = IOEither_1.tryCatch(() => {
        const pool = new pg.Pool(poolConfig);
        pool.on("error", function_1.compose(onError, errors_1.makeUnhandledPoolError));
        return pool;
    }, errors_1.makePoolCreationError).mapLeft(error => (errors_1.isPoolCreationError(error) ? error : errors_1.makePoolCreationError(error)));
    return TaskEither_1.fromIOEither(poolIo)
        .chain(pool => Option_1.fromNullable(parsers)
        .map(parser_1.setupParsers(pool))
        .getOrElse(TaskEither_1.taskEither.of(pool)))
        .map(exports.wrapConnectionPool);
};
const checkoutConnection = (pool) => TaskEither_1.tryCatch(() => pool.connect(), errors_1.makePoolCheckoutError);
const executeProgramWithConnection = (environment, program) => (connection) => new TaskEither_1.TaskEither(TaskEither_1.tryCatch(() => program.run(Object.assign({}, environment, { [types_1.ConnectionSymbol]: connection })), errors_1.makeUnhandledConnectionError)
    .mapLeft(function_1.identity)
    .chain(TaskEither_1.fromEither)
    .fold(err => {
    // If a rollback error reaches this point, we should assume the connection
    // is poisoned and ask the pool implementation to dispose of it.
    connection.release(errors_1.isTransactionRollbackError(err) ? err : undefined);
    return Either_1.left(err);
}, a => {
    connection.release();
    return Either_1.right(a);
}));
const withConnectionFromPool = (pool) => (program) => checkoutConnection(pool)
    .map(connection_1.wrapPoolClient)
    .mapLeft(function_1.identity)
    .chain(executeProgramWithConnection({}, program));
const withConnectionEFromPool = (pool) => (program) => ReaderTaskEither_1.ask()
    .map(environment => checkoutConnection(pool)
    .map(connection_1.wrapPoolClient)
    .mapLeft(function_1.identity)
    .chain(executeProgramWithConnection(environment, program)))
    .chain(ReaderTaskEither_1.fromTaskEither);
exports.wrapConnectionPool = (pool) => ({
    end: () => TaskEither_1.tryCatch(() => (pool.ending ? Promise.resolve(undefined) : pool.end()), errors_1.makePoolShutdownError),
    withConnection: withConnectionFromPool(pool),
    withConnectionE: withConnectionEFromPool(pool),
});
//# sourceMappingURL=pool.js.map