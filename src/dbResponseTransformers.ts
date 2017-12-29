import { get } from "lodash";
import { DbResponseTransformer, DbResponseTransformerFactory, PostProcessingConfig } from ".";
import { camelCaseifier } from "./utils/camelify";

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

const camelcaseRows = (config: PostProcessingConfig) => {
  const camelcase = camelCaseifier(get(config, "camelCaser", {}));
  return (rows: any[]) => rows.map(camelcase);
};

// tslint:disable-next-line:variable-name
export const any: DbResponseTransformerFactory = (
  config: PostProcessingConfig,
): DbResponseTransformer => {
  const camelCase = camelcaseRows(config);
  return result => camelCase(result.rows);
};

export const none: DbResponseTransformerFactory = (
  _: PostProcessingConfig,
): DbResponseTransformer => {
  return result => {
    if (result.rows.length) {
      throw new ResponseNumberError(expectedNoneFoundSome);
    }
    return undefined;
  };
};

export const one: DbResponseTransformerFactory = (
  config: PostProcessingConfig,
): DbResponseTransformer => {
  const camelCase = camelcaseRows(config);
  return result => {
    if (result.rows.length === 0) {
      throw new ResponseNumberError(expectedOneNoneFound);
    }
    if (result.rows.length > 1) {
      throw new ResponseNumberError(expectedOneManyFound);
    }
    return camelCase(result.rows)[0];
  };
};

export const oneOrMany: DbResponseTransformerFactory = (
  config: PostProcessingConfig,
): DbResponseTransformer => {
  const camelCase = camelcaseRows(config);
  return result => {
    if (result.rows.length === 0) {
      throw new ResponseNumberError("Query returned no rows but rows were expected");
    }
    return camelCase(result.rows);
  };
};

export const oneOrNone: DbResponseTransformerFactory = (
  config: PostProcessingConfig,
): DbResponseTransformer => {
  const camelCase = camelcaseRows(config);
  return result => {
    if (result.rows.length > 1) {
      throw new ResponseNumberError(expectedOneOrNone);
    }
    if (result.rows.length === 0) {
      return undefined;
    }
    return camelCase(result.rows)[0];
  };
};
