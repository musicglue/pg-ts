// tslint:disable:no-class no-this

import { Either } from "fp-ts/lib/Either";
import { constant, constIdentity } from "fp-ts/lib/function";
import { IO } from "fp-ts/lib/IO";
import { Monad3 } from "fp-ts/lib/Monad";
import { Reader } from "fp-ts/lib/Reader";
import * as readerT from "fp-ts/lib/ReaderT";
import { Task } from "fp-ts/lib/Task";
import * as taskEither from "fp-ts/lib/TaskEither";
import { TaskEither } from "fp-ts/lib/TaskEither";

const readerTTaskEither = readerT.getReaderT(taskEither.taskEither);

declare module "fp-ts/lib/HKT" {
  interface URI2HKT3<U, L, A> {
    ReaderTaskEither: ReaderTaskEither<U, L, A>;
  }
}

export const URI = "ReaderTaskEither";

export type URI = typeof URI;

/**
 * @data
 * @constructor ReaderTaskEither
 * @since 1.6.0
 */
export class ReaderTaskEither<E, L, A> {
  public readonly _A!: A;
  public readonly _L!: L;
  public readonly _U!: E;
  public readonly _URI!: URI;
  constructor(readonly value: (e: E) => TaskEither<L, A>) {}
  /** Runs the inner `TaskEither` */
  public run(e: E): Promise<Either<L, A>> {
    return this.value(e).run();
  }
  /**
   * @since 1.6.0
   */
  public map<B>(f: (a: A) => B): ReaderTaskEither<E, L, B> {
    return new ReaderTaskEither(readerTTaskEither.map(f, this.value));
  }
  /**
   * @since 1.6.0
   */
  public mapLeft<M>(f: (l: L) => M): ReaderTaskEither<E, M, A> {
    return new ReaderTaskEither<E, M, A>(e => this.value(e).mapLeft(f));
  }
  /**
   * @since 1.6.0
   */
  public ap<B>(fab: ReaderTaskEither<E, L, (a: A) => B>): ReaderTaskEither<E, L, B> {
    return new ReaderTaskEither(readerTTaskEither.ap(fab.value, this.value));
  }
  /**
   * @since 1.6.0
   */
  public ap_<B, C>(
    this: ReaderTaskEither<E, L, (b: B) => C>,
    fb: ReaderTaskEither<E, L, B>,
  ): ReaderTaskEither<E, L, C> {
    return fb.ap(this);
  }
  /**
   * Combine two effectful actions, keeping only the result of the first
   * @since 1.6.0
   */
  public applyFirst<B>(fb: ReaderTaskEither<E, L, B>): ReaderTaskEither<E, L, A> {
    return fb.ap(this.map(constant));
  }
  /**
   * Combine two effectful actions, keeping only the result of the second
   * @since 1.6.0
   */
  public applySecond<B>(fb: ReaderTaskEither<E, L, B>): ReaderTaskEither<E, L, B> {
    return fb.ap(this.map(constIdentity as () => (b: B) => B));
  }
  /**
   * @since 1.6.0
   */
  public chain<B>(f: (a: A) => ReaderTaskEither<E, L, B>): ReaderTaskEither<E, L, B> {
    return new ReaderTaskEither(readerTTaskEither.chain(a => f(a).value, this.value));
  }
}

const map = <E, L, A, B>(
  fa: ReaderTaskEither<E, L, A>,
  f: (a: A) => B,
): ReaderTaskEither<E, L, B> => {
  return fa.map(f);
};

const of = <E, L, A>(a: A): ReaderTaskEither<E, L, A> => {
  return new ReaderTaskEither(readerTTaskEither.of(a));
};

const ap = <E, L, A, B>(
  fab: ReaderTaskEither<E, L, (a: A) => B>,
  fa: ReaderTaskEither<E, L, A>,
): ReaderTaskEither<E, L, B> => {
  return fa.ap(fab);
};

const chain = <E, L, A, B>(
  fa: ReaderTaskEither<E, L, A>,
  f: (a: A) => ReaderTaskEither<E, L, B>,
): ReaderTaskEither<E, L, B> => {
  return fa.chain(f);
};

const readerTask = readerT.ask(taskEither.taskEither);
/**
 * @function
 * @since 1.6.0
 */
export const ask = <E, L>(): ReaderTaskEither<E, L, E> => {
  return new ReaderTaskEither(readerTask());
};

const readerTasks = readerT.asks(taskEither.taskEither);
/**
 * @function
 * @since 1.6.0
 */
export const asks = <E, L, A>(f: (e: E) => A): ReaderTaskEither<E, L, A> => {
  return new ReaderTaskEither(readerTasks(f));
};

/**
 * @function
 * @since 1.6.0
 */
export const local = <E>(f: (e: E) => E) => <L, A>(
  fa: ReaderTaskEither<E, L, A>,
): ReaderTaskEither<E, L, A> => {
  return new ReaderTaskEither(e => fa.value(f(e)));
};

/**
 * @function
 * @since 1.6.0
 */
export const right = <E, L, A>(fa: Task<A>): ReaderTaskEither<E, L, A> => {
  return new ReaderTaskEither(() => taskEither.right(fa));
};

/**
 * @function
 * @since 1.6.0
 */
export const left = <E, L, A>(fa: Task<L>): ReaderTaskEither<E, L, A> => {
  return new ReaderTaskEither(() => taskEither.left(fa));
};

/**
 * @function
 * @since 1.6.0
 */
export const fromTaskEither = <E, L, A>(fa: TaskEither<L, A>): ReaderTaskEither<E, L, A> => {
  return new ReaderTaskEither(() => fa);
};

const readerTfromReader = readerT.fromReader(taskEither.taskEither);
/**
 * @function
 * @since 1.6.0
 */
export const fromReader = <E, L, A>(fa: Reader<E, A>): ReaderTaskEither<E, L, A> => {
  return new ReaderTaskEither(readerTfromReader(fa));
};

/**
 * @function
 * @since 1.6.0
 */
export const fromEither = <E, L, A>(fa: Either<L, A>): ReaderTaskEither<E, L, A> => {
  return fromTaskEither(taskEither.fromEither(fa));
};

/**
 * @function
 * @since 1.6.0
 */
export const fromIO = <E, L, A>(fa: IO<A>): ReaderTaskEither<E, L, A> => {
  return fromTaskEither(taskEither.fromIO(fa));
};

/**
 * @function
 * @since 1.6.0
 */
export const fromLeft = <E, L, A>(l: L): ReaderTaskEither<E, L, A> => {
  return fromTaskEither(taskEither.fromLeft(l));
};

/**
 * @function
 * @since 1.6.0
 */
export const tryCatch = <E, L, A>(
  f: (e: E) => Promise<A>,
  onrejected: (reason: {}) => L,
): ReaderTaskEither<E, L, A> => {
  return new ReaderTaskEither(e => taskEither.tryCatch(() => f(e), onrejected));
};

/**
 * @instance
 * @since 1.6.0
 */
export const readerTaskEither: Monad3<URI> = {
  URI,
  ap,
  chain,
  map,
  of,
};