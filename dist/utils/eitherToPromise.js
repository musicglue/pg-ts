"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eitherToPromise = (either) => either.fold(l => Promise.reject(l), r => Promise.resolve(r));
//# sourceMappingURL=eitherToPromise.js.map