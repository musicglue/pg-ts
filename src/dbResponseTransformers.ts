import camelcase = require("camelcase-keys");
import { DbResponseTransformer } from "./index";

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

const camelcaseRows = (rows: any[]) => rows.map(camelcase);

// tslint:disable-next-line:variable-name
export const any: DbResponseTransformer = result =>
  camelcaseRows(result.rows);

export const none: DbResponseTransformer = result => {
  if (result.rows.length) { throw new ResponseNumberError(expectedNoneFoundSome); }
  return undefined;
};

export const one: DbResponseTransformer = result => {
  if (result.rows.length === 0) { throw new ResponseNumberError(expectedOneNoneFound); }
  if (result.rows.length > 1) { throw new ResponseNumberError(expectedOneManyFound); }
  return camelcaseRows(result.rows)[0];
};

export const oneOrMany: DbResponseTransformer = result => {
  if (result.rows.length === 0) { throw new ResponseNumberError("Query returned no rows but rows were expected"); }
  return camelcaseRows(result.rows);
};

export const oneOrNone: DbResponseTransformer = result => {
  if (result.rows.length > 1) { throw new ResponseNumberError(expectedOneOrNone); }
  if (result.rows.length === 0) { return undefined; }
  return camelcaseRows(result.rows)[0];
};
