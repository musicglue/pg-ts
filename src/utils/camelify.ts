import { constant, not, Predicate } from "fp-ts/lib/function";
import { fromNullable } from "fp-ts/lib/Option";
import { mixed } from "io-ts";
import { camelCase, fromPairs, isArray, isDate, isObject as _isObject, toPairs } from "lodash";

export interface CamelifyOptions {
  exclude: Predicate<string>;
  keyMapper: (s: string) => string;
}

const isMappable: Predicate<mixed> = x =>
  fromNullable(x)
    .filter(isObject)
    .filter(not(isDate))
    .fold(constant(false), constant(true));

const defaultOptions: CamelifyOptions = {
  exclude: (k: string) => k.startsWith("_"),
  keyMapper: camelCase,
};

const isObject = (x: mixed): x is object => _isObject(x);

const transform = (options: CamelifyOptions) => (x: mixed): mixed => {
  const { exclude, keyMapper } = options;

  if (!isMappable(x)) {
    return x;
  }

  if (isArray(x)) {
    return x.map(transform(options));
  }

  if (isObject(x)) {
    return {
      ...fromPairs(
        toPairs(x).map(([k, v]) => [exclude(k) ? k : keyMapper(k), transform(options)(v)]),
      ),
    };
  }

  return x;
};

export const makeCamelCaser = (options?: Partial<CamelifyOptions>) =>
  transform({ ...defaultOptions, ...options });

export const defaultCamelCaser = makeCamelCaser();
