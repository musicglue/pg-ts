import * as pg from "pg";

export default (pool: pg.Pool): void => {
  pool.on("error", (err: Error) => {
    console.error("Pool error: ", err);
  });
};
