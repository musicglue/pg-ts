import { isError } from "util";

export const mapCatchToError = (caught: {}): Error => {
  if (isError(caught)) {
    return caught;
  }

  const error = new Error("pg driver rejected promise");

  (error as any).caught = caught;

  return error;
};
