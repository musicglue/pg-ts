import * as pg from "pg";
import { PgTypeParserSetupError } from "./errors";
import { TypeParser } from "./types";
export declare const setupParsers: (pool: pg.Pool) => (parsers: Record<string, TypeParser<any>>) => import("fp-ts/lib/TaskEither").TaskEither<PgTypeParserSetupError, pg.Pool>;
