import { mixed } from "io-ts";
import * as pg from "pg";
declare type IndexGetter = (value: mixed) => string;
export declare const SQLFragment: (parts: TemplateStringsArray, ...inValues: mixed[]) => (getValueIndex: IndexGetter) => string;
export declare const SQL: (parts: TemplateStringsArray, ...inValues: any[]) => pg.QueryConfig;
export {};
