import {
  camelCase,
  curry,
  flip,
  flowRight as compose,
  mapKeys,
  mapValues,
} from "lodash";

const mapValuesF = curry(flip(mapValues), 2);
const mapKeysF = curry(flip(mapKeys), 2);

type checker = (input: any) => boolean;
type transformer = (input: any) => any;

const applyIf = curry((p: checker, f: transformer, x: any) => (p(x) ? f(x) : x));

const transform = compose(
  mapValuesF((v: any) => {
    if (v == null || typeof v !== "object" || v instanceof Date) { return v; }
    if (Array.isArray(v)) { return v.map(camelCaseify); } // eslint-disable-line no-use-before-define
    return camelCaseify(v);  // eslint-disable-line no-use-before-define
  }),
  mapKeysF(applyIf((x: any) => typeof x === "string" && !x.startsWith("_"), camelCase)),
) as transformer;

const camelCaseify = applyIf((x: any) => x != null && typeof x === "object", transform);

export default camelCaseify;
