# pg-ts
Typescript wrapper around node-postgres

## Installing

```
yarn add pg-ts
```

## Using

Using promises:

```ts
import getPool, { SQL } from "pg-ts";

const pool = getPool();
const { firstName, lastName } = person;

pool.transaction(tx =>
  Promise
    .all([
      tx.none(SQL`INSERT INTO people (first_name, last_name) VALUES (${firstName}, ${lastName}))`),
      tx.one(SQL`SELECT * FROM people WHERE first_name = ${firstName})`),
    ])
    .then(([,person]) => person));
```

Using [fp-ts](https://github.com/gcanti/fp-ts) Tasks:

```ts
import getPool, { SQL } from "pg-ts";

const pool = getPool();

pool.oneTask(SQL`SELECT * FROM people WHERE first_name = ${firstName})`).run();
```
