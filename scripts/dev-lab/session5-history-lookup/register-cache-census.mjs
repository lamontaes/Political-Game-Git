import { register } from "node:module";
import { URL } from "node:url";

register(
  new URL("./cache-census-loader.mjs", import.meta.url),
  import.meta.url,
);
