import * as Bluebird from "bluebird";
import { Lazy } from "fp-ts/lib/function";
import { FantasyMonad, StaticMonad } from "fp-ts/lib/Monad";
import { StaticMonoid } from "fp-ts/lib/Monoid";

declare module "fp-ts/lib/HKT" {
  interface HKT<A> {
    BTask: BTask<A>;
  }
}

export const URI = "BTask";

export type URI = typeof URI;

export class BTask<A> implements FantasyMonad<URI, A> {
  public static of = of;
  public static empty = empty;
  public readonly _A: A;
  public readonly _URI: URI;

  constructor(public readonly value: Lazy<Bluebird<A>>) {}

  public run(): Bluebird<A> {
    return this.value();
  }

  public map<B>(f: (a: A) => B): BTask<B> {
    return new BTask(() => this.run().then(f));
  }

  public of<B>(b: B): BTask<B> {
    return of(b);
  }

  public ap<B>(fab: BTask<(a: A) => B>): BTask<B> {
    return new BTask(() => Bluebird.all([fab.run(), this.run()]).then(([f, a]) => f(a)));
  }

  public chain<B>(f: (a: A) => BTask<B>): BTask<B> {
    return new BTask(() => this.run().then(a => f(a).run()));
  }

  public concat(fy: BTask<A>): BTask<A> {
    return new BTask<A>(() => {
      return new Bluebird<A>(r => {
        let running = true;
        const resolve = (a: A) => {
          if (running) {
            running = false;
            r(a);
          }
        };

        this.run().then(resolve);
        fy.run().then(resolve);
      });
    });
  }
}

export function map<A, B>(f: (a: A) => B, fa: BTask<A>): BTask<B> {
  return fa.map(f);
}

export function of<A>(a: A): BTask<A> {
  return new BTask(() => Bluebird.resolve(a));
}

export function ap<A, B>(fab: BTask<(a: A) => B>, fa: BTask<A>): BTask<B> {
  return fa.ap(fab);
}

export function chain<A, B>(f: (a: A) => BTask<B>, fa: BTask<A>): BTask<B> {
  return fa.chain(f);
}

export function concat<A>(fx: BTask<A>, fy: BTask<A>): BTask<A> {
  return fx.concat(fy);
}

const neverPromise = new Bluebird(() => undefined);
const neverLazyPromise = () => neverPromise;
const never = new BTask(neverLazyPromise);

/** returns a task that never completes */
export function empty<A>(): BTask<A> {
  return never as BTask<A>;
}

// tslint:disable-next-line no-unused-expression
(
  { map, of, ap, chain, concat, empty } as (
    StaticMonad<URI> &
    StaticMonoid<BTask<any>>
  )
);
