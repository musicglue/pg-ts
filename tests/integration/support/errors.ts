export class UnexpectedRightError extends Error {
  public readonly _T = Symbol("UnexpectedRightError");

  constructor() {
    super("Unexpected right.");
  }
}
