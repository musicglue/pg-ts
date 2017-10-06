import * as pg from "pg";
import { SQL } from ".";
import postgresToISO from "./pgTypes/interval";

import { PgType, QueryResult, TypeParser, TypeParsers } from ".";

const typeQuery = (name: string) => SQL`
SELECT typname, oid, typarray
FROM pg_type
WHERE typname = ${name}
ORDER BY oid;`;

const arrayParser = (typeParser: TypeParser<any>) => (input: string) =>
  pg.types.arrayParser.create(input, typeParser).parse();

// tslint:disable-next-line:ban-types
const map = <T, V>(x: (i: T, idx: number, obj: T[]) => V) => (y: T[]): V[] => y.map(x);

export default (pool: pg.Pool, parsers: TypeParsers): Promise<boolean> => {
  const parserSet: TypeParsers = { interval: postgresToISO, ...parsers };

  return Promise.all(Object.keys(parserSet).map(name => pool.query(typeQuery(name))))
    .then(map(({ rows: [type] }: QueryResult) => type))
    .then(
      map((type: PgType) => {
        const parser = parserSet[type.typname];
        pg.types.setTypeParser(type.oid, parser);
        if (type.typarray) {
          pg.types.setTypeParser(type.typarray, arrayParser(parser));
        }
      }),
    )
    .then(() => true);
};
