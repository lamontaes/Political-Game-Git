"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rootTsconfigChecksNothing = void 0;
/**
 * The root tsconfig.json is a solution file: it names the app and node
 * projects and checks no source of its own. `npx tsc --noEmit` at the root
 * therefore used to exit 0 having checked nothing, and two lanes reported
 * that empty result as "typecheck clean" on 2026-09-18. This file is the only
 * thing the root project compiles, and it does not compile, so that command
 * now fails with the instruction instead of succeeding silently.
 *
 * The real gate is `npm run typecheck`, which builds tsconfig.app.json and
 * tsconfig.node.json and then checks the tests those projects leave out.
 */
exports.rootTsconfigChecksNothing = "Run `npm run typecheck`; the root tsconfig.json checks no project files.";
