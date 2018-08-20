"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const function_1 = require("fp-ts/lib/function");
const TaskEither_1 = require("fp-ts/lib/TaskEither");
const pg = require("pg");
const errors_1 = require("./errors");
const interval_1 = require("./pgTypes/interval");
const sql_1 = require("./utils/sql");
const typeQuery = (name) => sql_1.SQL `
  SELECT typname, oid, typarray
  FROM pg_type
  WHERE typname = ${name}
  ORDER BY oid;`;
const arrayParser = (typeParser) => (input) => pg.types.arrayParser.create(input, typeParser).parse();
exports.setupParsers = (pool) => (parsers) => {
    const parserSet = Object.assign({ interval: interval_1.parseInterval }, parsers);
    const queries = Object.keys(parserSet).map(name => pool.query(typeQuery(name)));
    return TaskEither_1.tryCatch(() => Promise.all(queries)
        .then(results => results.map(({ rows: [type] }) => type))
        .then(types => {
        types.map(type => {
            const parser = parserSet[type.typname];
            pg.types.setTypeParser(type.oid, parser);
            if (type.typarray) {
                pg.types.setTypeParser(type.typarray, arrayParser(parser));
            }
        });
    }), errors_1.makeTypeParserSetupError).map(function_1.constant(pool));
};
//# sourceMappingURL=parser.js.map