import { Option } from "fp-ts/lib/Option";
import * as genericPool from "generic-pool";
import * as pg from "pg";
import { always } from "ramda";

import { bindAssertions, bindParsers, bindQuery, bindTransaction } from "./additions";
import {
  defaultConfigOpts,
  defaultPgOpts,
  defaultPoolOpts,
} from "./defaults";
import { getFactory } from "./factory";
import { Pool, SetupConfig } from "./types";

const initializePool = (pool: genericPool.Pool<pg.Client>): Pool =>
  bindTransaction(bindAssertions(bindQuery(pool)));

export { Pool } from "./types";

export const getPool = (
  pgOpts: Option<pg.ClientConfig>,
  poolOpts: Option<genericPool.Options>,
  configOpts: Option<SetupConfig>,
): Pool => {
  const resolvedPgOpts = pgOpts.map(o => ({ ...defaultPgOpts, ...o })).getOrElse(always(defaultPgOpts));
  const resolvedPoolOpts = poolOpts.map(o => ({ ...defaultPoolOpts, ...o })).getOrElse(always(defaultPoolOpts));
  const resolvedConfigOpts = configOpts.map(o => ({ ...defaultConfigOpts, ...o })).getOrElse(always(defaultConfigOpts));

  const created = genericPool.createPool(getFactory(resolvedPgOpts), resolvedPoolOpts);

  const pool = initializePool(created);
  bindParsers(pool, resolvedConfigOpts.parsers);
  
  return pool;
};
