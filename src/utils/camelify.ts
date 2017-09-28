import { camelCase, curry, flowRight as compose, fromPairs, zip } from "lodash";

type checker = (a: any) => boolean;
type transformer = (input: any) => any;

const applyIf = curry((p: checker, f: transformer, x: any) => (p(x) ? f(x) : x));
const mapKeys = curry((f: transformer, x: any) =>
  fromPairs(zip(Object.keys(x).map(f), Object.values(x))),
);
const mapValues = curry((f: transformer, x: any) =>
  fromPairs(zip(Object.keys(x), Object.values(x).map(f))),
);

const transform: any = compose(
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
) as transformer;

const camelCaseify = applyIf((x: any) => x != null && typeof x === "object", transform);

export default camelCaseify;
