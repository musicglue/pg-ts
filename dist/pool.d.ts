import { TaskEither } from "fp-ts/lib/TaskEither";
import * as pg from "pg";
import { PgPoolCreationError } from "./errors";
import { ConnectionPool, ConnectionPoolConfig } from "./types";
export declare const makeConnectionPool: (poolConfig: ConnectionPoolConfig) => TaskEither<PgPoolCreationError, ConnectionPool>;
export declare const wrapConnectionPool: (pool: pg.Pool) => ConnectionPool;
