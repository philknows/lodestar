import type {Api} from "./routes/index.js";

// NOTE: Don't export server here so it's not bundled to all consumers

import * as routes from "./routes/index.js";
export {routes};
export {getClient} from "./client/index.js";
export type {Api};

// Declare namespaces for CLI options
export type ApiNamespace = keyof Api;
const allNamespacesObj: {[K in keyof Api]: true} = {
  beacon: true,
  config: true,
  debug: true,
  events: true,
  lightclient: true,
  lodestar: true,
  node: true,
  proof: true,
  validator: true,
};
export const allNamespaces = Object.keys(allNamespacesObj) as ApiNamespace[];
