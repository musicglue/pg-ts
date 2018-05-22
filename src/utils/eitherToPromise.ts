import { Either } from "fp-ts/lib/Either";

export const eitherToPromise = <L, R>(either: Either<L, R>) =>
  either.fold(l => Promise.reject(l), r => Promise.resolve(r));
