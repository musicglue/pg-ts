import { ReaderTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { ConnectedEnvironment, TransactionError, TransactionOptions } from "./types";
export declare const defaultTxOptions: TransactionOptions;
export declare function withTransaction<E, L, A>(x: Partial<TransactionOptions>, y: ReaderTaskEither<E & ConnectedEnvironment, L, A>): ReaderTaskEither<E & ConnectedEnvironment, TransactionError<L>, A>;
export declare function withTransaction<E, L, A>(x: ReaderTaskEither<E & ConnectedEnvironment, L, A>): ReaderTaskEither<E & ConnectedEnvironment, TransactionError<L>, A>;
