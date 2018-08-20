import * as pg from "pg";
import { Connection } from "./types";
export declare const wrapPoolClient: (poolClient: pg.PoolClient) => Connection;
