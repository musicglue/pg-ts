import { DbPool } from ".";

export default (pool: DbPool): void => {
  pool.on("error", (err: Error) => {
    console.error("Pool error: ", err);
  });
};
