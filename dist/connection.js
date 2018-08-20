"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TaskEither_1 = require("fp-ts/lib/TaskEither");
const errors_1 = require("./errors");
exports.wrapPoolClient = (poolClient) => ({
    query: (config) => TaskEither_1.tryCatch(() => poolClient.query(config), errors_1.makeDriverQueryError(config)),
    release: err => poolClient.release(err),
});
//# sourceMappingURL=connection.js.map