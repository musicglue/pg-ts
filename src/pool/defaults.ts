import { fromNullable } from "fp-ts/lib/Option";
import * as genericPool from "generic-pool";
import * as pg from "pg";
import { always } from "ramda";
import { SetupConfig } from "./types";

const defaultFromEnv = <T>(translator: (val: any) => T) => (key: string, fallback: T) =>
  fromNullable(process.env[key]).map(translator).getOrElse(always(fallback));

const boolFromEnv = defaultFromEnv(Boolean);
const numberFromEnv = defaultFromEnv(Number);

export const defaultConfigOpts: SetupConfig = {};

export const defaultPgOpts: pg.ClientConfig = {};

export const defaultPoolOpts: genericPool.Options = {
  acquireTimeoutMillis: numberFromEnv("PG_POOL_ACQUIRE_TIMEOUT", 2000),
  autostart: boolFromEnv("PG_POOL_AUTOSTART", false),
  evictionRunIntervalMillis: numberFromEnv("PG_POOL_EVICTION_INTERVAL", 0),
  fifo: boolFromEnv("PG_POOL_FIFO", false),
  idleTimeoutMillis: numberFromEnv("PG_POOL_IDLE_TIMEOUT", 30000),
  max: numberFromEnv("PG_POOL_MAX_SIZE", 10),
  maxWaitingClients: numberFromEnv("PG_POOL_MAX_WAITING", 0),
  min: numberFromEnv("PG_POOL_MIN_SIZE", 2),
  numTestsPerRun: numberFromEnv("PG_POOL_EVICTION_CHECKS", 2),
  priorityRange: numberFromEnv("PG_POOL_PRIORITY_RANGE", 1),
  softIdleTimeoutMillis: numberFromEnv("PG_POOL_SOFT_IDLE_TIMEOUT", -1),
  testOnBorrow: boolFromEnv("PG_POOL_TEST_ON_BORROW", false),
};
