"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const function_1 = require("fp-ts/lib/function");
const ReaderTaskEither_1 = require("fp-ts/lib/ReaderTaskEither");
const TaskEither_1 = require("fp-ts/lib/TaskEither");
const errors_1 = require("./errors");
const types_1 = require("./types");
const eitherToPromise_1 = require("./utils/eitherToPromise");
const sql_1 = require("./utils/sql");
exports.defaultTxOptions = {
    deferrable: false,
    isolation: "READ COMMITTED",
    readOnly: false,
};
const beginTransactionQuery = ({ deferrable, isolation, readOnly }) => sql_1.SQL `
  BEGIN TRANSACTION
  ISOLATION LEVEL ${() => isolation}
  ${() => (readOnly ? "READ ONLY" : "")}
  ${() => (deferrable ? "DEFERRABLE" : "")}
`;
const rollbackTransaction = (connection) => (err) => TaskEither_1.tryCatch(() => connection
    .query(sql_1.SQL `ROLLBACK;`)
    .run()
    .then(eitherToPromise_1.eitherToPromise)
    .catch(rollbackErr => Promise.reject(new errors_1.PgTransactionRollbackError(rollbackErr, err)))
    .then(() => Promise.reject(err)), e => (errors_1.isTransactionRollbackError(e) ? e : e));
const commitTransaction = (connection) => (a) => TaskEither_1.tryCatch(() => connection
    .query(sql_1.SQL `COMMIT;`)
    .run()
    .then(eitherToPromise_1.eitherToPromise)
    .then(function_1.constant(a)), e => (errors_1.isDriverQueryError(e) ? e : errors_1.makeUnhandledConnectionError(e)));
const executeTransaction = (connection, opts, program) => connection
    .query(beginTransactionQuery(opts))
    .mapLeft(function_1.identity)
    .chain(() => TaskEither_1.tryCatch(() => program().then(programE => programE
    .fold(rollbackTransaction(connection), commitTransaction(connection))
    .run()), errors_1.makeUnhandledConnectionError))
    .chain(TaskEither_1.fromEither);
function withTransaction(x, y) {
    const opts = y ? Object.assign({}, exports.defaultTxOptions, x) : exports.defaultTxOptions;
    const program = y || x;
    return ReaderTaskEither_1.ask()
        .map(e => executeTransaction(types_1.connectionLens.get(e), opts, () => program.run(e)))
        .chain(ReaderTaskEither_1.fromTaskEither);
}
exports.withTransaction = withTransaction;
//# sourceMappingURL=transaction.js.map