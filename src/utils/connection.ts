import { mixed } from "io-ts";
import * as url from "url";

export const parseConnectionString = (str: string): mixed => {
  let candidate: string = str;

  // unix socket
  if (str.charAt(0) === "/") {
    const [host, database] = candidate.split(" ");
    return { host, database };
  }

  // url parse expects spaces encoded as %20
  if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str)) {
    candidate = encodeURI(str).replace(/\%25(\d\d)/g, "%$1");
  }

  const result = url.parse(str, true);
  const config: any = {
    port: result.port,
  };

  if (result.query.application_name) {
    config.application_name = result.query.application_name;
  }

  if (result.query.fallback_application_name) {
    config.fallback_application_name = result.query.fallback_application_name;
  }

  if (result.protocol === "socket:") {
    config.host = decodeURI(result.pathname);
    config.database = result.query.db;
    config.client_encoding = result.query.encoding;
    return config;
  }
  config.host = result.hostname;

  // result.pathname is not always guaranteed to have a '/' prefix (e.g. relative urls)
  // only strip the slash if it is present.
  let pathname = result.pathname;
  if (pathname && pathname.charAt(0) === "/") {
    pathname = result.pathname.slice(1) || null;
  }
  config.database = pathname && decodeURI(pathname);

  const [user, ...password] = (result.auth || ":").split(":");
  config.user = user;
  config.password = password.join(":");

  const ssl = result.query.ssl;
  if (ssl === "true" || ssl === "1") {
    config.ssl = true;
  }

  return config;
};
