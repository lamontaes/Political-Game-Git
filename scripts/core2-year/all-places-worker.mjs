// Worker entry for all-places.mjs: a worker thread does not inherit the
// TypeScript loader, so it registers tsx before loading the place run.
import { register } from "tsx/esm/api";

register();
await import("./all-places-worker.ts");
