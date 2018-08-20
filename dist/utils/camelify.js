"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const function_1 = require("fp-ts/lib/function");
const Option_1 = require("fp-ts/lib/Option");
const lodash_1 = require("lodash");
const isMappable = x => Option_1.fromNullable(x)
    .filter(isObject)
    .filter(function_1.not(lodash_1.isDate))
    .fold(false, function_1.constTrue);
const defaultOptions = {
    exclude: (k) => k.startsWith("_"),
    keyMapper: lodash_1.camelCase,
};
const isObject = (x) => lodash_1.isObject(x);
const transform = (options) => {
    const transformer = (x) => {
        const { exclude, keyMapper } = options;
        if (!isMappable(x)) {
            return x;
        }
        if (lodash_1.isArray(x)) {
            return x.map(transformer);
        }
        if (isObject(x)) {
            return Object.assign({}, lodash_1.fromPairs(lodash_1.toPairs(x).map(([k, v]) => [exclude(k) ? k : keyMapper(k), transformer(v)])));
        }
        return x;
    };
    return transformer;
};
exports.makeCamelCaser = (options) => {
    const transformer = transform(Object.assign({}, defaultOptions, options));
    return (xs) => xs.map(transformer);
};
exports.defaultCamelCaser = exports.makeCamelCaser();
//# sourceMappingURL=camelify.js.map