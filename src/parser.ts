import { TaskEither, tryCatch } from "fp-ts/lib/TaskEither";
import { Pool, types as pgTypes } from "pg";
import { isError } from "util";
import { parseInterval } from "./pgTypes/interval";
import { SQL } from "./utils/sql";

export type TypeParser<T> = (val: string) => T;

export interface TypeParsers {
  [key: string]: TypeParser<any>;
}

export type ParserSetup = TaskEither<Error, void>;

const typeQuery = (name: string) => SQL`
SELECT typname, oid, typarray
FROM pg_type
WHERE typname = ${name}
ORDER BY oid;`;

const arrayParser = (typeParser: TypeParser<any>) => (input: string) =>
  pgTypes.arrayParser.create(input, typeParser).parse();

const mapCatchToError = (caught: {}): Error => {
  if (isError(caught)) {
    return caught;
  }

  const error = new Error("pg driver rejected promise");

  (error as any).caught = caught;

  return error;
};

export const setupParsers = (pool: Pool, parsers: TypeParsers): ParserSetup => {
  const parserSet: TypeParsers = { interval: parseInterval, ...parsers };
  const queries = Object.keys(parserSet).map(name => pool.query(typeQuery(name)));

  return tryCatch(
    () =>
      Promise.all(queries)
        .then(results => results.map(({ rows: [type] }) => type))
        .then(types => {
          types.map(type => {
            const parser = parserSet[type.typname];

            pgTypes.setTypeParser(type.oid, parser);

            if (type.typarray) {
              pgTypes.setTypeParser(type.typarray, arrayParser(parser));
            }
          });
        }),
    mapCatchToError,
  );
};
