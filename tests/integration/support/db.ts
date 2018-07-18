import { ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { parse } from "pg-connection-string";
import {
  camelCasedQueries,
  Connection,
  ConnectionPoolConfig,
  PgDriverQueryError,
  PgRowCountError,
  SQL,
} from "../../../src";

const { queryNone } = camelCasedQueries;

export const getPoolConfig = (connectionString: string): ConnectionPoolConfig => {
  const { client_encoding, fallback_application_name, ...connectionConfig } = parse(
    connectionString,
  );

  return {
    ...connectionConfig,
    onError: fail,
    parsers: {},
    statement_timeout: 200000,
  } as ConnectionPoolConfig;
};

export const truncate = (tableName: string) => queryNone(SQL`TRUNCATE ${() => tableName} CASCADE;`);
