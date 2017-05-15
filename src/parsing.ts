import * as Bluebird from "bluebird";
import * as pg from "pg";
import { SQL } from ".";
import postgresToISO from "./types/interval";

import { PgType, QueryResult, TypeParser, TypeParsers } from ".";

const typeQuery = (name: string) => SQL`
SELECT typname, oid, typarray
FROM pg_type
WHERE typname = ${name}
ORDER BY oid;`;

const arrayParser = (typeParser: TypeParser<any>) => (input: string) =>
  pg.types.arrayParser.create(input, typeParser).parse();

export default async (pool: pg.Pool, parsers: TypeParsers): Promise<void[]> => {
  const parserSet: TypeParsers = { interval: postgresToISO, ...parsers };

  return await Bluebird
    .map(Object.keys(parserSet), name => pool.query(typeQuery(name)))
    .map(({ rows: [type] }: QueryResult) => type)
    .map((type: PgType) => {
      const parser = parserSet[type.typname];
      pg.types.setTypeParser(type.oid, parser);
      if (type.typarray) { pg.types.setTypeParser(type.typarray, arrayParser(parser)); }
    });
};
