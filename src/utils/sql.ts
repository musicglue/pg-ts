import * as pg from "pg";
import { QueryFragment, QueryFragmentBuilder } from "../types";

function* indexFactory(seed = 0) {
  let index = seed;

  while (true) {
    yield index++;
  }
}

export const SQLFragment = (parts: TemplateStringsArray, ...inValues: any[]): QueryFragmentBuilder =>
  (idxGen: Generator): QueryFragment => ({
    __text: parts.reduce((prev, curr) => `${prev}$${idxGen.next().value}${curr}`),
    __values: inValues,
  });

export const SQL = (parts: TemplateStringsArray, ...inValues: any[]): pg.QueryConfig => {
  const idxGenerator = indexFactory();
  const outValues: any[] = [];
  const outText = parts.reduce((prev, curr) => {
    const value = inValues.shift();
    if (typeof value === "function") {
      const { __text, __values } = value(idxGenerator);
      outValues.push(...__values);

      return `${prev}${__text}${curr}`;
    }
    const i = idxGenerator.next().value;
    outValues.push(value);

    return `${prev}$${i}${curr}`;
  });

  return { text: outText, values: outValues };
};
