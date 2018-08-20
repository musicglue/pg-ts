"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const monocle_ts_1 = require("monocle-ts");
exports.ConnectionSymbol = Symbol("pg-ts connection");
exports.connectionLens = monocle_ts_1.Lens.fromProp(exports.ConnectionSymbol);
//# sourceMappingURL=types.js.map