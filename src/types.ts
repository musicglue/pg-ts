export type QueryFragmentBuilder = (seqGen: IterableIterator<number>) => QueryFragment;
export type TypeParser<T> = (val: string) => T;

export interface PgType {
  oid: number;
  typarray: number;
  typname: string;
}

export interface QueryResult {
  rows: PgType[];
}

export interface QueryFragment {
  __text: string;
  __values: any[];
}

export interface TypeParsers {
  [key: string]: TypeParser<any>;
}
