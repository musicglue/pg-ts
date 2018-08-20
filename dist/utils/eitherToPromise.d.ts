import { Either } from "fp-ts/lib/Either";
export declare const eitherToPromise: <L, R>(either: Either<L, R>) => Promise<R>;
