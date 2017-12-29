import { camelCase, fromPairs, negate, toPairs } from "lodash";

export type PredicateFn = (a: any) => boolean;
export type MapFn<A = any, B = any> = (x: A) => B;
export type KeyMapFn = MapFn<string, string>;

export interface CamelifyOptions {
  exclude: PredicateFn;
  keyMapper: KeyMapFn;
}

export const when = (p: PredicateFn, f: MapFn) => (x: any) => (p(x) ? f(x) : x);

const isMappable = (x: any) => x != null && typeof x === "object" && !(x instanceof Date);

const defaultOptions = {};
const defaultConfig: CamelifyOptions = {
  exclude: (k: string) => k.startsWith("_"),
  keyMapper: camelCase,
};

export const camelCaseifier = (options: Partial<CamelifyOptions> = defaultOptions) => {
  const config = { ...defaultConfig, ...options };
  const { exclude, keyMapper } = config;
  const mapKey = when(negate(exclude), keyMapper);

  const transformFn = when(
    isMappable,
    x =>
      Array.isArray(x)
        ? x.map(transformFn)
        : {
            ...fromPairs(toPairs(x).map(([k, v]) => [mapKey(k), transformFn(v)])),
          },
  );

  return transformFn;
};

export default camelCaseifier();
