import {
  TransactionScope,
} from "./types";

export const isTransactionScope = (x: any): x is TransactionScope =>
  typeof x === "function";
