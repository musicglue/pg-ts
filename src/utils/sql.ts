import * as pg from "pg";
import { QueryFragment, QueryFragmentBuilder } from "../types";

export const SQLFragment = (parts: TemplateStringsArray, ...inValues: any[]): QueryFragmentBuilder =>
  (start: number): QueryFragment => ({
    __text: parts.reduce((prev, curr, i) => `${prev}$${start + i}${curr}`),
    __values: inValues,
  });

export const SQL = (parts: TemplateStringsArray, ...inValues: any[]): pg.QueryConfig => {
  const outValues: any[] = [];
  const outText = parts.reduce((prev, curr, i) => {
    const opIndex = i - 1;
    const value = inValues[opIndex];
    if (typeof value === "function") {
      const { __text, __values } = value(opIndex);
      outValues.push(...__values);

      return `${prev}${__text}${curr}`;
    }
    outValues.push(value);

    return `${prev}$${i}${curr}`;
  });

  return { text: outText, values: outValues };
};
