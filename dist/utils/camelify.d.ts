import { Predicate } from "fp-ts/lib/function";
import { mixed } from "io-ts";
import { RowTransformer } from "../types";
export interface CamelifyOptions {
    exclude: Predicate<string>;
    keyMapper: (s: string) => string;
}
export declare const makeCamelCaser: (options?: Partial<CamelifyOptions> | undefined) => (xs: mixed[]) => mixed[];
export declare const defaultCamelCaser: RowTransformer;
