import * as t from "io-ts";

export interface ErrorFailure {
  error: Error;
  result: "error";
}

export interface ValidationFailure<T extends t.Mixed> {
  errors: t.Errors;
  result: "validationFailed";
  type: T;
  value: t.mixed;
}

export type QueryFailure<T extends t.Mixed> = ErrorFailure | ValidationFailure<T>;

export const mapToErrorFailure = (error: Error): ErrorFailure => ({
  error,
  result: "error",
});

export const mapToValidationFailure = <T extends t.Mixed>(type: T, value: t.mixed) => (
  errors: t.Errors,
): ValidationFailure<T> => ({
  errors,
  result: "validationFailed",
  type,
  value,
});
