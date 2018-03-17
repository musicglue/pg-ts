import { mixed } from "io-ts";
import * as pg from "pg";

type IndexGetter = (value: mixed) => string;

export const SQLFragment = (parts: TemplateStringsArray, ...inValues: mixed[]) => (
  getValueIndex: IndexGetter,
): string =>
  parts.reduce((prev, curr, valIdx) => `${prev}${getValueIndex(inValues[valIdx - 1])}${curr}`);

export const SQL = (parts: TemplateStringsArray, ...inValues: any[]): pg.QueryConfig => {
  const outValues: mixed[] = [];

  const getValueIndex = (value: mixed): string => {
    if (value == null) {
      return `NULL`;
    }
    const found = outValues.indexOf(value);
    if (found > -1) {
      return `$${found + 1}`;
    }
    outValues.push(value);
    return `$${outValues.length}`;
  };

  const outText = parts.reduce((prev, curr) => {
    const value = inValues.shift();
    return typeof value === "function"
      ? `${prev}${value(getValueIndex)}${curr}`
      : `${prev}${getValueIndex(value)}${curr}`;
  });

  return { text: outText, values: outValues };
};
