import { Task } from "fp-ts/lib/Task";
import { QueryConfig, QueryResult } from "pg";
import { BasePool, QueryPool } from "../types";

export const bindQuery = (pool: BasePool): QueryPool => {
  const query = async (config: QueryConfig): Promise<QueryResult> => {
    const client = await pool.acquire();
    try {
      const result = await client.query(config);
      await client.release();
      return result;
    } catch (err) {
      await client.release();
      throw err;
    }
  };

  const queryTask = (config: QueryConfig) => new Task(() => query(config));

  return Object.assign(pool, { query, queryTask });
};
