import { Either, left, right } from "fp-ts/lib/Either";
import { identity } from "fp-ts/lib/function";
import { ask, fromReader, fromTaskEither } from "fp-ts/lib/ReaderTaskEither";
import { TaskEither } from "fp-ts/lib/TaskEither";
import {
  camelCasedQueries,
  ConnectedEnvironment,
  isRowCountError,
  PgRowCountError,
  SQL,
  TransactionError,
  withTransaction,
} from "../../src";
import { QueryAnyError, QueryNoneError } from "../../src/query";
import { UnexpectedRightError } from "./support/errors";
import { connectionTest } from "./support/testTypes";
import { Unit } from "./support/types";

const { queryNone, queryAny } = camelCasedQueries;

describe("transaction", () => {
  test("two rows inserted inside a committed transaction can be found", () =>
    connectionTest(
      withTransaction(
        queryNone(SQL`INSERT INTO units (id, name) VALUES (10, 'tx first')`).chain(() =>
          queryNone(SQL`INSERT INTO units (id, name) VALUES (11, 'tx second')`),
        ),
      )
        .mapLeft<TransactionError<QueryNoneError> | QueryAnyError>(identity)
        .chain(() => queryAny(Unit, SQL`SELECT * FROM units WHERE id >= 10 ORDER BY id`))
        .map(units => {
          expect(units).toHaveLength(2);
          expect(units[0]).toMatchObject({ id: 10, name: "tx first" });
          expect(units[1]).toMatchObject({ id: 11, name: "tx second" });
        }),
    ));

  test("two rows inserted inside a rolled back transaction cannot be found", () =>
    connectionTest(
      ask<ConnectedEnvironment, TransactionError<QueryNoneError> | UnexpectedRightError>()
        .map(() =>
          withTransaction(
            queryNone(SQL`INSERT INTO units (id, name) VALUES (10, 'tx first')`)
              .chain(() => queryNone(SQL`INSERT INTO units (id, name) VALUES (11, 'tx second')`))
              .chain(() => queryNone(SQL`SELECT * FROM units WHERE id = 10`)),
          )
            .fold<
              Either<
                Exclude<TransactionError<QueryNoneError>, PgRowCountError> | UnexpectedRightError,
                void
              >
            >(
              err => {
                if (isRowCountError(err)) {
                  return right((undefined as any) as void);
                }

                return left(err);
              },
              () => left(new UnexpectedRightError()),
            )
            .map(te => new TaskEither(te)),
        )
        .chain(fromReader)
        .chain(fromTaskEither)
        .chain(() => queryAny(Unit, SQL`SELECT * FROM units WHERE id >= 10 ORDER BY id`))
        .map(units => {
          expect(units).toHaveLength(0);
        }),
    ));
});
