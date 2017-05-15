import getPool from "./getPool";

export { default as parse } from "./utils/connection";
export * from "./task";
export * from "./types";

export const SQL = (parts: TemplateStringsArray, ...values: any[]) => ({
  text: parts.reduce((prev, curr, i) => `${prev}$${i}${curr}`),
  values,
});

export default getPool;
