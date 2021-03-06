import { Either, left, right } from "fp-ts/lib/Either";
import { identity } from "fp-ts/lib/function";
import { ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { Task } from "fp-ts/lib/Task";
import { TaskEither } from "fp-ts/lib/TaskEither";
import {
  camelCasedQueries,
  ConnectedEnvironment,
  makeConnectionPool,
  PgPoolCheckoutError,
  PgPoolCreationError,
  PgTypeParserSetupError,
  PgUnhandledConnectionError,
  SQL,
} from "../../../src";
import { QueryNoneError } from "../../../src/query";
import { eitherToPromise } from "../../../src/utils/eitherToPromise";
import { getPoolConfig, truncate } from "./db";

const { queryNone } = camelCasedQueries;

class EnvironmentError extends Error {
  public name = "EnvironmentError";
  constructor(msg: string) {
    super(msg);
  }
}

export const connectionTest = <L, A>(
  program: ReaderTaskEither<ConnectedEnvironment, L, A>,
): Promise<A> => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return eitherToPromise(
      left(new EnvironmentError("DATABASE_URL environment variable not found")),
    );
  }

  const createTable = queryNone(
    SQL`CREATE TABLE IF NOT EXISTS units (id integer, name varchar(100));`,
  );

  const insertUnits = queryNone(
    SQL`INSERT INTO units (id, name) VALUES (1, 'Car'), (2, 'Bike'), (3, 'Motorbike'), (4, 'Car');`,
  );

  const prepareDb = createTable.chain(() => truncate("units")).chain(() => insertUnits);

  type ProgramError =
    | PgPoolCheckoutError
    | PgPoolCreationError
    | PgTypeParserSetupError
    | PgUnhandledConnectionError
    | QueryNoneError
    | L;

  return makeConnectionPool(getPoolConfig(connectionString))
    .mapLeft<ProgramError>(identity)
    .chain(
      pool =>
        new TaskEither(
          pool
            .withConnection(prepareDb.mapLeft<ProgramError>(identity).chain(() => program))
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
