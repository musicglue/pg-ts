# pg-ts
Typescript wrapper around node-postgres

:boom: breaking change
:rocket: new feature
:bug: bug fix
:wrench: chore
:notebook: docs

#### v9.0.3
- :wrench: improve PgDriverQueryError message

#### v9.0.2
- :bug: If a `queryOneOrNone` was executed with SQL that selected insufficient columns to fully
  populate the row type, it would erroneously return `None`. Fixed now to return the expected
  `PgRowValidationError` type.

#### v9.0.1
- :bug: Prevent array positional parameters from being deduped.

## v9.0.0
- :boom: An additional `context` param has been added to `connection.query` and `queryX`
  functions. This is a blob of data that will be attached to query and transaction error instances.
  The normal use case for this is attaching application context so that error reporting functions
  can group errors together, or log out additional information about where the error came from.

### v8.1.0
- :rocket: Add `named` function to set the name of a given `SQL`-templated query.

### v8.0.1
- :bug: Sql fragment parser should unwrap complex types (e.g. NonEmptyArray, Option) before
  passing it to the driver.

## v8.0.0
- :bug: Fix broken nominal typing on classes by changing `public readonly _T = "<class name>"`
  to `public readonly _<class name>: void`.
- :boom: As a result of fixing nominal typing, `makeConnectionPool` now returns an error union
  of `PgPoolCreationError | PgTypeParserSetupError` instead of `PgPoolCreationError`. Other errors
  may occur in application code as a result of the error classes now being correctly differentiated.

## v7.0.0
- :boom: `fp-ts@1.8.0`
- :boom: `io-ts@1.3.0`
- :boom: `monocle-ts@1.2.0`

### v6.0.1
- :wrench: Add _T symbol to uniquely identify error classes

## v6.0.0
- :boom: Simplified the API by always requiring an environment object in which pg-ts can
  store it's state (`Connection`) under a `Symbol` key. This will never conflict with other
  keys in the `E`, so we can now remove `ConnectionE` and related subsequent design decisions.

### v5.0.1
- :bug: `QueryAnyError` union included `PgRowCountError`. This is incorrect (obvs).
- :wrench: Compiled with TS3.0.1.

## v5.0.0
- `Either`ish functions no longer return a simple `Error` type in their `Left`s. Instead, we now
  provide a union of concrete error types that make it explicit what the failure conditions are.
  Clients can pattern match on error type using the provided `ErrorPredicate` functions, e.g,
  `isRowCountError`. Application-defined error types are propagated through the `pg-ts` stack.
- Commonly-grouped errors are provided as unions, e.g. `ConnectionError<L>`, `TransactionError<L>`.
- Renamed `withConnectionE` to `widenToConnectionE` for clarity and to differentiate from the
  `withConnectionE` function defined on `Connection`.
- `withTransaction` has been replaced by three similar functions that assist you depending on
   whether you want to go from:

     | Outer Context    | Inner Context    | Function to use     |
     |------------------|------------------|---------------------|
     | `Connection`     | `Connection`     | `withTransactionC`  |
     | `ConnectionE<E>` | `ConnectionE<E>` | `withTransactionE`  |
     | `ConnectionE<E>` | `Connection`     | `withTransactionEC` |

- Fixed the `types` setting in package.json, so imports should now default to `from "pg-ts"`
  instead of `from "pg-ts/dist"`.
- Integration tests are provided. A `DATABASE_URL` environment variable must be present. The test
  suite will create the table it needs and will truncate before each test. Every query type is
  tested and transaction commit/rollback behaviour is also verified.
