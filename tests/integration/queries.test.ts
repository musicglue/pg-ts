import { Either, left, right } from "fp-ts/lib/Either";
import { ask, fromReader, fromTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { TaskEither } from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import {
  camelCasedQueries,
  Connection,
  isRowCountError,
  isRowValidationError,
  PgRowCountError,
  SQL,
} from "../../src";
import { fromTask } from "../../src/utils/taskEither";
import { queryTest } from "./support/testTypes";
import { Unit } from "./support/types";

const { queryNone, queryOne, queryAny, queryOneOrMore, queryOneOrNone } = camelCasedQueries;

describe("queries", () => {
  test("queryNone with a query that returns 0 rows returns void", () =>
    queryTest(queryNone(SQL`SELECT * FROM units WHERE id = 999`)));

  test("queryNone with a query that returns > 0 rows returns PgRowCountError", () =>
    queryTest(
      ask<Connection, void>()
        .map(() => {
          const foo = queryNone(SQL`SELECT * FROM units`)
            .fold<Either<void, PgRowCountError>>(
              error => {
                if (isRowCountError(error)) {
                  expect(error).toMatchObject({ expected: "0", received: ">= 1" } as Partial<
                    PgRowCountError
                  >);
                  return right(error);
                }

                return left(expect(error).toBeInstanceOf(PgRowCountError));
              },
              () => left(fail(new Error("Query should have raised a PgRowCountError."))),
            )
            .map(fromTask);

          return foo;
        })
        .chain(fromReader)
        .chain(fromTaskEither),
    ));

  test("queryOne with a query that returns 1 parseable row returns a single parsed type", () =>
    queryTest(
      queryOne(Unit, SQL`SELECT * FROM units WHERE id = 2`)
        .mapLeft(fail)
        .map(unit => expect(unit).toMatchObject({ id: 2, name: "Bike" })),
    ));

  test("queryOne with a query that returns 1 unparseable row returns a validation error", () =>
    queryTest(
      ask<Connection, void>()
        .map(() =>
          queryOne(Unit, SQL`SELECT 'foo' as id, 1 as name FROM units WHERE id = 2`)
            .fold<Either<void, t.Errors>>(
              err => {
                if (!isRowValidationError(err)) {
                  return left(fail(new Error("Query should have raised a PgRowValidationError.")));
                }

                return right(err.errors);
              },
              () => left(fail(new Error("Query should have raised a PgRowValidationError."))),
            )
            .map(te => new TaskEither(te)),
        )
        .chain(fromReader)
        .chain(fromTaskEither),
    ));

  test("queryOne with a query that returns 0 rows returns PgRowCountError", () =>
    queryTest(
      ask<Connection, void>()
        .map(() =>
          queryOne(Unit, SQL`SELECT * FROM units WHERE id = 999`)
            .fold<Either<void, PgRowCountError>>(
              error => {
                if (!isRowCountError(error)) {
                  return left(fail(new Error("Query should have raised a PgRowCountError.")));
                }

                expect(error).toMatchObject({ expected: "1", received: "0" } as Partial<
                  PgRowCountError
                >);

                return right(error);
              },
              () => left(fail(new Error("Query should have raised a PgRowCountError."))),
            )
            .map(te => new TaskEither(te)),
        )
        .chain(fromReader)
        .chain(fromTaskEither),
    ));

  test("queryOne with a query that returns > 1 rows returns PgRowCountError", () =>
    queryTest(
      ask<Connection, void>()
        .map(() =>
          queryOne(Unit, SQL`SELECT * FROM units`)
            .fold<Either<void, PgRowCountError>>(
              error => {
                if (!isRowCountError(error)) {
                  return left(fail(new Error("Query should have raised a PgRowCountError.")));
                }

                expect(error).toMatchObject({ expected: "1", received: "> 1" } as Partial<
                  PgRowCountError
                >);

                return right(error);
              },
              () => left(fail(new Error("Query should have raised a PgRowCountError."))),
            )
            .map(te => new TaskEither(te)),
        )
        .chain(fromReader)
        .chain(fromTaskEither),
    ));

  test("queryOneOrMore with a query that returns 1 parseable row returns an array of a single parsed type", () =>
    queryTest(
      queryOneOrMore(Unit, SQL`SELECT * FROM units WHERE id = 2`)
        .mapLeft(fail)
        .map(units => {
          expect(units.head).toMatchObject({ id: 2, name: "Bike" });
          expect(units.tail).toHaveLength(0);
        }),
    ));

  test("queryOneOrMore with a query that returns 2 parseable rows returns an array of two parsed types", () =>
    queryTest(
      queryOneOrMore(Unit, SQL`SELECT * FROM units WHERE name = 'Car' ORDER BY id`)
        .mapLeft(fail)
        .map(units => units.toArray())
        .map(units => {
          expect(units).toHaveLength(2);
          expect(units[0]).toMatchObject({ id: 1, name: "Car" });
          expect(units[1]).toMatchObject({ id: 4, name: "Car" });
        }),
    ));

  test("queryOneOrMore with a query that returns 0 rows returns PgRowCountError", () =>
    queryTest(
      ask<Connection, void>()
        .map(() =>
          queryOneOrMore(Unit, SQL`SELECT * FROM units WHERE id = 0`)
            .fold<Either<void, PgRowCountError>>(
              error => {
                if (!isRowCountError(error)) {
                  return left(fail(new Error("Query should have raised a PgRowCountError.")));
                }

                expect(error).toMatchObject({ expected: ">= 1", received: "0" } as Partial<
                  PgRowCountError
                >);

                return right(error);
              },
              () => left(fail(new Error("Query should have raised a PgRowCountError."))),
            )
            .map(te => new TaskEither(te)),
        )
        .chain(fromReader)
        .chain(fromTaskEither),
    ));

  test("queryOneOrNone with a query that returns 1 parseable row returns a Some of a single parsed type", () =>
    queryTest(
      queryOneOrNone(Unit, SQL`SELECT * FROM units WHERE id = 2`)
        .mapLeft(fail)
        .map(unitO => {
          return unitO.foldL(
            () => fail(new Error("Query should have returned a Some.")),
            unit => {
              expect(unit).toMatchObject({ id: 2, name: "Bike" });
            },
          );
        }),
    ));

  test("queryOneOrNone with a query that returns 0 rows returns a None", () =>
    queryTest(
      queryOneOrNone(Unit, SQL`SELECT * FROM units WHERE id = 0`)
        .mapLeft(fail)
        .map(unitO => {
          return unitO.foldL(
            () => {
              return;
            },
            () => {
              fail(new Error("Query should have returned a None."));
            },
          );
        }),
    ));

  test("queryOneOrNone with a query that returns 2 rows returns PgRowCountError", () =>
    queryTest(
      ask<Connection, void>()
        .map(() =>
          queryOneOrNone(Unit, SQL`SELECT * FROM units WHERE name = 'Car'`)
            .fold<Either<void, PgRowCountError>>(
              error => {
                if (!isRowCountError(error)) {
                  return left(fail(new Error("Query should have raised a PgRowCountError.")));
                }

                expect(error).toMatchObject({ expected: "0 or 1", received: "> 1" } as Partial<
                  PgRowCountError
                >);

                return right(error);
              },
              () => left(fail(new Error("Query should have raised a PgRowCountError."))),
            )
            .map(te => new TaskEither(te)),
        )
        .chain(fromReader)
        .chain(fromTaskEither),
    ));

  test("queryAny with a query that returns 0 rows returns an empty array", () =>
    queryTest(
      camelCasedQueries
        .queryAny(Unit, SQL`SELECT * FROM units WHERE id = 0`)
        .mapLeft(fail)
        .map(units => {
          expect(units).toHaveLength(0);
        }),
    ));

  test("queryAny with a query that returns 1 rows returns an array of 1 parsed row", () =>
    queryTest(
      queryAny(Unit, SQL`SELECT * FROM units WHERE id = 1`)
        .mapLeft(fail)
        .map(units => {
          expect(units).toHaveLength(1);
          expect(units[0]).toMatchObject({ id: 1, name: "Car" });
        }),
    ));

  test("queryAny with a query that returns 2 rows returns an array of 2 parsed rows", () =>
    queryTest(
      queryAny(Unit, SQL`SELECT * FROM units WHERE name = 'Car' ORDER BY id`)
        .mapLeft(fail)
        .map(units => {
          expect(units).toHaveLength(2);
          expect(units[0]).toMatchObject({ id: 1, name: "Car" });
          expect(units[1]).toMatchObject({ id: 4, name: "Car" });
        }),
    ));
});
