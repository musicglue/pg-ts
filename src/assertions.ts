import { Task } from "fp-ts/lib/Task";
import { get } from "lodash";
import { DbPool, DbResponseTransformer, PostProcessingConfig, Query, QueryTask } from ".";
import { any, none, one, oneOrMany, oneOrNone } from "./dbResponseTransformers";

type QueryFactory = (db: DbPool) => (transformer: DbResponseTransformer) => Query;
type QueryTaskFactory = (db: DbPool) => (transformer: DbResponseTransformer) => QueryTask;

const getQuery: QueryFactory = db => transformer => (query, txOpts) => {
  const pool = get(txOpts, "tx", db);

  return db.parsersReady.then(() => pool.query(query)).then(transformer);
};

const getQueryTask: QueryTaskFactory = db => transformer => (query, txOpts) =>
  new Task(() => {
    const pool = get(txOpts, "tx", db);

    return db.parsersReady.then(() => pool.query(query)).then(transformer);
  });

export default (db: DbPool, postProcessingConfig: PostProcessingConfig): DbPool => {
  const transformQuery = getQuery(db);
  const transformQueryTask = getQueryTask(db);

  const anyTransform = any(postProcessingConfig);
  const noneTransform = none(postProcessingConfig);
  const oneTransform = one(postProcessingConfig);
  const oneOrManyTransform = oneOrMany(postProcessingConfig);
  const oneOrNoneTransform = oneOrNone(postProcessingConfig);

  db.any = transformQuery(anyTransform);
  db.anyTask = transformQueryTask(anyTransform);

  db.none = transformQuery(noneTransform);
  db.noneTask = transformQueryTask(noneTransform);

  db.one = transformQuery(oneTransform);
  db.oneTask = transformQueryTask(oneTransform);

  db.oneOrMany = transformQuery(oneOrManyTransform);
  db.oneOrManyTask = transformQueryTask(oneOrManyTransform);

  db.oneOrNone = transformQuery(oneOrNoneTransform);
  db.oneOrNoneTask = transformQueryTask(oneOrNoneTransform);

  return db;
};
