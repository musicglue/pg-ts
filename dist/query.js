"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Array_1 = require("fp-ts/lib/Array");
const Either_1 = require("fp-ts/lib/Either");
const function_1 = require("fp-ts/lib/function");
const NonEmptyArray_1 = require("fp-ts/lib/NonEmptyArray");
const Option_1 = require("fp-ts/lib/Option");
const ReaderTaskEither_1 = require("fp-ts/lib/ReaderTaskEither");
const t = require("io-ts");
const errors_1 = require("./errors");
const types_1 = require("./types");
const camelify_1 = require("./utils/camelify");
const executeQuery = (query) => (connection) => connection.query(query);
const isNoneResult = ({ rows }) => rows.length === 0;
const isNonEmptyResult = ({ rows }) => rows.length > 0;
const isOneResult = ({ rows }) => rows.length === 1;
const isOneOrNoneResult = function_1.or(isNoneResult, isOneResult);
const expectedAtLeastOneErrorFailure = (query) => new errors_1.PgRowCountError(query, ">= 1", "0");
const expectedNoneFoundSomeErrorFailure = (query) => new errors_1.PgRowCountError(query, "0", ">= 1");
const expectedOneFoundManyErrorFailure = (query) => new errors_1.PgRowCountError(query, "1", "> 1");
const expectedOneFoundNoneErrorFailure = (query) => new errors_1.PgRowCountError(query, "1", "0");
const expectedOneOrNoneErrorFailure = (query) => new errors_1.PgRowCountError(query, "0 or 1", "> 1");
const queryAny = (transformer = function_1.identity) => (type, query) => ReaderTaskEither_1.ask()
    .map(types_1.connectionLens.get)
    .map(executeQuery(query))
    .chain(ReaderTaskEither_1.fromTaskEither)
    .map(({ rows }) => transformer(rows))
    .map(rows => t
    .array(type)
    .decode(rows)
    .mapLeft(errors_1.makeRowValidationError(type, rows)))
    .chain(ReaderTaskEither_1.fromEither);
const queryNone = (query) => ReaderTaskEither_1.ask()
    .map(types_1.connectionLens.get)
    .map(executeQuery(query))
    .chain(ReaderTaskEither_1.fromTaskEither)
    .map(Either_1.fromPredicate(isNoneResult, function_1.constant(expectedNoneFoundSomeErrorFailure(query))))
    .chain(ReaderTaskEither_1.fromEither)
    .map(() => {
    return;
});
const queryOne = (transformer = function_1.identity) => (type, query) => ReaderTaskEither_1.ask()
    .map(types_1.connectionLens.get)
    .map(executeQuery(query))
    .chain(ReaderTaskEither_1.fromTaskEither)
    .map(Either_1.fromPredicate(isOneResult, result => Either_1.fromPredicate(isNoneResult, function_1.identity)(result).fold(function_1.constant(expectedOneFoundManyErrorFailure(query)), function_1.constant(expectedOneFoundNoneErrorFailure(query)))))
    .chain(ReaderTaskEither_1.fromEither)
    .map(({ rows }) => transformer(rows)[0])
    .map(row => type.decode(row).mapLeft(errors_1.makeRowValidationError(type, row)))
    .chain(ReaderTaskEither_1.fromEither);
const queryOneOrMore = (transformer = function_1.identity) => (type, query) => ReaderTaskEither_1.ask()
    .map(types_1.connectionLens.get)
    .map(executeQuery(query))
    .chain(ReaderTaskEither_1.fromTaskEither)
    .map(Either_1.fromPredicate(isNonEmptyResult, function_1.constant(expectedAtLeastOneErrorFailure(query))))
    .chain(ReaderTaskEither_1.fromEither)
    .map(({ rows }) => transformer(rows))
    .map(rows => t
    .array(type)
    .decode(rows)
    .mapLeft(errors_1.makeRowValidationError(type, rows)))
    .chain(ReaderTaskEither_1.fromEither)
    .map(rows => new NonEmptyArray_1.NonEmptyArray(rows[0], rows.slice(1)));
const queryOneOrNone = (transformer = function_1.identity) => (type, query) => ReaderTaskEither_1.ask()
    .map(types_1.connectionLens.get)
    .map(executeQuery(query))
    .chain(ReaderTaskEither_1.fromTaskEither)
    .map(Either_1.fromPredicate(isOneOrNoneResult, function_1.constant(expectedOneOrNoneErrorFailure(query))))
    .chain(ReaderTaskEither_1.fromEither)
    .map(({ rows }) => transformer(rows))
    .map(rows => Array_1.head(rows)
    .map(row => type.decode(row))
    .chain(Option_1.fromEither));
exports.configurableQueries = {
    queryAny,
    queryNone,
    queryOne,
    queryOneOrMore,
    queryOneOrNone,
};
exports.camelCasedQueries = {
    queryAny: queryAny(camelify_1.defaultCamelCaser),
    queryNone,
    queryOne: queryOne(camelify_1.defaultCamelCaser),
    queryOneOrMore: queryOneOrMore(camelify_1.defaultCamelCaser),
    queryOneOrNone: queryOneOrNone(camelify_1.defaultCamelCaser),
};
//# sourceMappingURL=query.js.map