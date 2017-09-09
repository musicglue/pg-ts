import { Task } from "fp-ts/lib/Task";
import { get } from "lodash";

import {
  AssertionPool,
  DbResponseTransformer,
  Query,
  QueryPool,
  QueryTask,
} from "../types";

import {
  any,
  none,
  one,
  oneOrMany,
  oneOrNone,
} from "./dbResponseTransformers";

type QueryFactory = (pool: QueryPool) =>
  (transformer: DbResponseTransformer) => Query;

type QueryTaskFactory = (db: QueryPool) =>
  (transformer: DbResponseTransformer) => QueryTask;

const getQueryTask: QueryTaskFactory =
  db =>
    transformer =>
      (query, txOpts) =>
        new Task(() =>
          get(txOpts, "tx", db).query(query).then(transformer));

const getQuery: QueryFactory =
  pool => transformer => (query, txOpts) =>
    get(txOpts, "tx", pool).query(query).then(transformer);

export const bindAssertions = (pool: QueryPool): AssertionPool => {
  const transformQuery = getQuery(pool);
  const transformQueryTask = getQueryTask(pool);

  return Object.assign(pool, {
    any: transformQuery(any),
    anyTask: transformQueryTask(any),
    none: transformQuery(none),
    noneTask: transformQueryTask(none),
    one: transformQuery(one),
    oneOrMany: transformQuery(oneOrMany),
    oneOrManyTask: transformQueryTask(oneOrMany),
    oneOrNone: transformQuery(oneOrNone),
    oneOrNoneTask: transformQueryTask(oneOrNone),
    oneTask: transformQueryTask(one),
  });
};
