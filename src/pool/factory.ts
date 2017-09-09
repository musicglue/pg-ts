import { Client, ClientConfig } from "pg";
import { always } from "ramda";

export const getFactory = (pgOpts: ClientConfig) => ({
  create: async (): Promise<Client> => {
    const client = new Client(pgOpts);
    await client.connect();
    return client;
  },
  destroy: (client: Client): Promise<undefined> =>
    new Promise((resolve, reject) => client.end(err => {
      if (err) { return reject(err); }
      resolve(undefined);
    })),
  validate: async (client: Client): Promise<boolean> =>
    await client.query("SELECT 1;").then(always(true)).catch(always(false)),
});
