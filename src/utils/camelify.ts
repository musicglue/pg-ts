import { camelCase, curry, flowRight as compose, fromPairs, zip } from "lodash";

export type CamelCaseifier = (x: any) => any;

type PredicateFn = (a: any) => boolean;
type TransformFn = (input: any) => any;

const applyIf = curry((p: PredicateFn, f: TransformFn, x: any) => (p(x) ? f(x) : x));
const mapKeys = curry(
  (f: TransformFn, x: any) =>
    Array.isArray(x) ? x : fromPairs(zip(Object.keys(x).map(f), Object.values(x))),
);
const mapValues = curry(
  (f: TransformFn, x: any) =>
    Array.isArray(x) ? x.map(f) : fromPairs(zip(Object.keys(x), Object.values(x).map(f))),
);

const transform: TransformFn = compose(
  mapValues((v: any) => {
    if (v == null || typeof v !== "object" || v instanceof Date) {
      return v;
    }
    if (Array.isArray(v)) {
      return v.map(camelCaseify);
    }
    return camelCaseify(v);
  }),
  mapKeys(applyIf((x: any) => typeof x === "string" && !x.startsWith("_"), camelCase)),
);

const camelCaseify: CamelCaseifier = applyIf(
  (x: any) => x != null && typeof x === "object",
  transform,
);

export default camelCaseify;
