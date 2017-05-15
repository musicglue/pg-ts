import * as Bluebird from "bluebird";
import { get } from "lodash";

import {
  DbPool,
  DbResponseTransformer,
  Query,
  QueryTask,
} from ".";

import {
  any,
  none,
  one,
  oneOrMany,
  oneOrNone,
} from "./dbResponseTransformers";

import { BTask } from "./task";

type QueryTaskFactory = (db: DbPool) => (transformer: DbResponseTransformer) => QueryTask;

const getQueryTask: QueryTaskFactory =
  db =>
    transformer =>
      (query, txOpts) =>
        new BTask(() =>
          Bluebird
            .fromCallback(cb => get(txOpts, "tx", db).query(query, cb))
            .then(transformer));

type UnwrapQueryTask = (queryTask: QueryTask) => Query;

const unwrapQueryTask: UnwrapQueryTask =
  queryTask =>
    query => queryTask(query).run();

export default (db: DbPool): DbPool => {
  const transformQuery = getQueryTask(db);

  db.anyTask = transformQuery(any);
  db.noneTask = transformQuery(none);
  db.oneTask = transformQuery(one);
  db.oneOrManyTask = transformQuery(oneOrMany);
  db.oneOrNoneTask = transformQuery(oneOrNone);

  db.any = unwrapQueryTask(db.anyTask);
  db.none = unwrapQueryTask(db.noneTask);
  db.one = unwrapQueryTask(db.oneTask);
  db.oneOrMany = unwrapQueryTask(db.oneOrManyTask);
  db.oneOrNone = unwrapQueryTask(db.oneOrNoneTask);

  return db;
};
