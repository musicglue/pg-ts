import * as pg from "pg";

type IndexGetter = (value: any) => string;

export const SQLFragment = (parts: TemplateStringsArray, ...inValues: any[]) => (
  getValueIndex: IndexGetter,
): string =>
  parts.reduce((prev, curr, valIdx) => `${prev}${getValueIndex(inValues[valIdx - 1])}${curr}`);

export const SQLUnsafeRaw = (parts: TemplateStringsArray, ...inValues: string[]) => (..._: any[]) =>
  parts.reduce((prev, curr, valIdx) => `${prev}${inValues[valIdx - 1]}${curr}`);

export const SQL = (parts: TemplateStringsArray, ...inValues: any[]): pg.QueryConfig => {
  const outValues: any[] = [];

  const getValueIndex = (value: any): string => {
    if (value == null) {
      return `NULL`;
    }
    if (typeof value === "function") {
      return `${value()}`;
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
