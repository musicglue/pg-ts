import { Either, left, right } from "fp-ts/lib/Either";
import { identity } from "fp-ts/lib/function";
import { ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { Task } from "fp-ts/lib/Task";
import { TaskEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import { parse } from "pg-connection-string";
import {
  camelCasedQueries,
  Connection,
  ConnectionE,
  ConnectionPoolConfig,
  ErrorPredicate,
  isPoolCreationError,
  makeConnectionPool,
  PgDriverQueryError,
  PgPoolCheckoutError,
  PgPoolCreationError,
  PgRowCountError,
  SQL,
} from "../../../src";
import { widenToConnectionE } from "../../../src/connection";
import { QueryNoneError } from "../../../src/query";
import { eitherToPromise } from "../../../src/utils/eitherToPromise";
import { getPoolConfig, truncate } from "./db";

const { queryNone } = camelCasedQueries;

export const queryTest = <L, A>(program: ReaderTaskEither<Connection, L, A>) =>
  dbTest(widenToConnectionE(program));

export const dbTest = <L, A>(program: ReaderTaskEither<ConnectionE<{}>, L, A>): Promise<A> => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable not found");
  }

  const createTable = queryNone(
    SQL`CREATE TABLE IF NOT EXISTS units (id integer, name varchar(100));`,
  );

  const insertUnits = queryNone(
    SQL`INSERT INTO units (id, name) VALUES (1, 'Car'), (2, 'Bike'), (3, 'Motorbike'), (4, 'Car');`,
  );

  const prepareDb = widenToConnectionE(
    createTable.chain(() => truncate("units")).chain(() => insertUnits),
  );

  type ProgramError = PgPoolCreationError | QueryNoneError | L;

  return makeConnectionPool(getPoolConfig(connectionString))
    .mapLeft<ProgramError>(identity)
    .chain(
      pool =>
        new TaskEither(
          pool
            .withConnectionE(prepareDb.mapLeft<ProgramError>(identity).chain(() => program))
            .value({})
            .fold<Task<Either<ProgramError, A>>>(
              l => pool.end().fold(() => left(l), () => left(l)),
              r => pool.end().fold(() => right(r), () => right(r)),
            )
            .chain(identity),
        ),
    )
    .run()
    .then(eitherToPromise);
};
