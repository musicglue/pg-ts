// tslint:disable:no-class no-this

import { Either } from "fp-ts/lib/Either";
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

export class ReaderTaskEither<E, L, A> {
  public readonly _A!: A;
  public readonly _L!: L;
  public readonly _U!: E;
  public readonly _URI!: URI;
  constructor(readonly run: (e: E) => TaskEither<L, A>) {}
  public map<B>(f: (a: A) => B): ReaderTaskEither<E, L, B> {
    return new ReaderTaskEither(readerTTaskEither.map(f, this.run));
  }
  // tslint:disable-next-line:no-shadowed-variable
  public of<B>(b: B): ReaderTaskEither<E, L, B> {
    return of(b);
  }
  public ap<B>(fab: ReaderTaskEither<E, L, (a: A) => B>): ReaderTaskEither<E, L, B> {
    return new ReaderTaskEither(readerTTaskEither.ap(fab.run, this.run));
  }
  public ap_<B, C>(
    this: ReaderTaskEither<E, L, (b: B) => C>,
    fb: ReaderTaskEither<E, L, B>,
  ): ReaderTaskEither<E, L, C> {
    return fb.ap(this);
  }
  public chain<B>(f: (a: A) => ReaderTaskEither<E, L, B>): ReaderTaskEither<E, L, B> {
    return new ReaderTaskEither(readerTTaskEither.chain(a => f(a).run, this.run));
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
export const ask = <E, L>(): ReaderTaskEither<E, L, E> => {
  return new ReaderTaskEither(readerTask());
};

const readerTasks = readerT.asks(taskEither.taskEither);
export const asks = <E, L, A>(f: (e: E) => A): ReaderTaskEither<E, L, A> => {
  return new ReaderTaskEither(readerTasks(f));
};

export const local = <E>(f: (e: E) => E) => <L, A>(
  fa: ReaderTaskEither<E, L, A>,
): ReaderTaskEither<E, L, A> => {
  return new ReaderTaskEither(e => fa.run(f(e)));
};

export const right = <E, L, A>(fa: Task<A>): ReaderTaskEither<E, L, A> => {
  return new ReaderTaskEither(() => taskEither.right(fa));
};

export const left = <E, L, A>(fa: Task<L>): ReaderTaskEither<E, L, A> => {
  return new ReaderTaskEither(() => taskEither.left(fa));
};

export const fromTask = <E, L, A>(fa: Task<A>): ReaderTaskEither<E, L, A> => {
  return fromTaskEither(taskEither.right(fa));
};

export const fromTaskEither = <E, L, A>(fa: TaskEither<L, A>): ReaderTaskEither<E, L, A> => {
  return new ReaderTaskEither(() => fa);
};

const readerTfromReader = readerT.fromReader(taskEither.taskEither);
export const fromReader = <E, L, A>(fa: Reader<E, A>): ReaderTaskEither<E, L, A> => {
  return new ReaderTaskEither(readerTfromReader(fa));
};

export const fromEither = <E, L, A>(fa: Either<L, A>): ReaderTaskEither<E, L, A> => {
  return fromTaskEither(taskEither.fromEither(fa));
};

export const tryCatch = <E, L, A>(
  f: (e: E) => Promise<A>,
  onrejected: (reason: {}) => L,
): ReaderTaskEither<E, L, A> => {
  return new ReaderTaskEither(e => taskEither.tryCatch(() => f(e), onrejected));
};

export const readerTaskEither: Monad3<URI> = {
  URI,
  ap,
  chain,
  map,
  of,
};
