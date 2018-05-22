// tslint:disable:no-expression-statement no-let

import { Lazy } from "fp-ts/lib/function";

export const memoise = <A>(lazy: Lazy<A>): Lazy<A> => {
  let assigned = false;
  let memoised: A;

  return () => {
    if (!assigned) {
      memoised = lazy();
      assigned = true;
    }

    return memoised;
  };
};
