import * as Bluebird from "bluebird";
import camelcase = require("camelcase-keys");
import { IO } from "fp-ts/lib/IO";
import { get } from "lodash";
import * as pg from "pg";
import { QueryIO } from ".";

import { AssertMode, DbPool, DbResponse, TxOptions } from ".";

const expectedNoneFoundSome = "Query returned rows but no rows were expected";
const expectedOneManyFound = "Query returned many rows but one row was expected";
const expectedOneNoneFound = "Query returned no rows but one row was expected";
const expectedOneOrNone = "Query returned more than one row but one or none were expected";

class ResponseNumberError extends Error {
  constructor(message: string) {
    super(message);
    this.message = message;
    this.name = "ResponseNumberError";
  }
}

const assert = (mode: AssertMode) => (result: DbResponse): (void | any | any[]) => {
  switch (mode) {
    case "none":
      if (result.rows.length) { throw new ResponseNumberError(expectedNoneFoundSome); }
      return null;
    case "one":
      if (result.rows.length === 0) { throw new ResponseNumberError(expectedOneNoneFound); }
      if (result.rows.length > 1) { throw new ResponseNumberError(expectedOneManyFound); }
      return camelcase(result.rows[0]);
    case "oneOrMany":
      if (result.rows.length === 0) { throw new ResponseNumberError("Query returned no rows but rows were expected"); }
      return result.rows.map(camelcase);
    case "oneOrNone":
      if (result.rows.length > 1) { throw new ResponseNumberError(expectedOneOrNone); }
      return result.rows[0] ? camelcase(result.rows[0]) : null;
    default:
      return result.rows.map(camelcase);
  }
};

const getAssertedQuery = (db: DbPool) => (mode: AssertMode) =>
  (query: pg.QueryConfig, txOpts?: TxOptions): IO<Bluebird<void | any | any[]>> =>
    new IO(() =>
      Bluebird
        .fromCallback(cb => get(txOpts, "tx", db).query(query, cb))
        .then(assert(mode)));

const unwrapQueryIO = (queryFn: QueryIO) =>
  (query: pg.QueryConfig, txOpts?: TxOptions) => queryFn(query, txOpts).run();

export default (db: DbPool): DbPool => {
  const assertQuery = getAssertedQuery(db);
  db.anyIO = assertQuery("any");
  db.noneIO = assertQuery("none");
  db.oneIO = assertQuery("one");
  db.oneOrManyIO = assertQuery("oneOrMany");
  db.oneOrNoneIO = assertQuery("oneOrNone");

  db.any = unwrapQueryIO(db.anyIO);
  db.none = unwrapQueryIO(db.noneIO);
  db.one = unwrapQueryIO(db.oneIO);
  db.oneOrMany = unwrapQueryIO(db.oneOrManyIO);
  db.oneOrNone = unwrapQueryIO(db.oneOrNoneIO);

  return db;
};
