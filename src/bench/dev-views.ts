/**
 * The one place a dev-mode view registers itself (the Account lead's ruling of Nov 16, 2026: each
 * thread's view lives in its own file and registers from there, so no thread edits dev-mode.ts or
 * dev-api.ts to add one). A view is a file in src/bench/dev-views/ whose default export is a
 * `DevView`: its routes under /api/dev/, keyed "GET name" or "POST name", each given the bench's
 * DevMode; the file of its page part in src/bench/ui/ (a module exporting `slots`, read by
 * ui/dev-views.mjs); and the labels that part shows. dev-api.ts answers a route it does not have
 * itself from here, and GET /api/dev/views lists each view's part and labels for the page.
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { DevMode } from "./dev-mode";

/** What a view's route is given: the bench's DevMode, the query and, for a POST, the body. */
export interface DevViewRequest {
  readonly mode: DevMode;
  readonly q: (key: string) => string;
  readonly input: Readonly<Record<string, unknown>>;
}

export type DevViewRoute = (request: DevViewRequest) => unknown;

export interface DevView {
  /** The view's name: its file's name, used in errors and the page's list. */
  readonly name: string;
  /** Routes under /api/dev/, keyed "GET name" or "POST name". */
  readonly routes?: Readonly<Record<string, DevViewRoute>>;
  /** Its page part, a file in src/bench/ui/ (served as /ui/<file>) that exports `slots`. */
  readonly client?: string;
  /** The words its page part shows: control names only, as controls.json's dev blocks are. */
  readonly labels?: Readonly<Record<string, unknown>>;
}

const ROUTE = /^(GET|POST) [a-z0-9-]+(\/[a-z0-9-]+)*$/;
const CLIENT = /^[a-z-]+\.mjs$/;
const views = new Map<string, DevView>();
const routes = new Map<string, { view: string; route: DevViewRoute }>();

/**
 * Adds a view. A route another view already answers, or a name already used, is refused: two
 * answers for one route would make which one runs an accident. A route dev-api.ts answers itself
 * always wins there; dev-views.test.ts refuses a view that names one.
 */
export function registerDevView(view: DevView): void {
  if (views.has(view.name))
    throw new Error(
      `A dev-mode view named ${view.name} is already registered.`,
    );
  if (view.client !== undefined && !CLIENT.test(view.client))
    throw new Error(
      `Dev-mode view ${view.name}: its page part ${view.client} is not a file in src/bench/ui/.`,
    );
  for (const key of Object.keys(view.routes ?? {})) {
    if (!ROUTE.test(key))
      throw new Error(
        `Dev-mode view ${view.name}: ${key} is not "GET name" or "POST name".`,
      );
    const other = routes.get(key);
    if (other)
      throw new Error(
        `Dev-mode view ${view.name}: ${key} is already answered by ${other.view}.`,
      );
  }
  views.set(view.name, view);
  for (const [key, route] of Object.entries(view.routes ?? {}))
    routes.set(key, { view: view.name, route });
}

/** The route a registered view answers, if any. */
export function devViewRoute(key: string): DevViewRoute | undefined {
  return routes.get(key)?.route;
}

/** Every route the registered views answer, with the view that answers it. */
export function devViewRoutes(): { key: string; view: string }[] {
  return [...routes].map(([key, { view }]) => ({ key, view }));
}

/** Each view's page part and labels, for GET /api/dev/views. */
export function devViewList(): {
  name: string;
  client: string;
  labels: Record<string, unknown>;
}[] {
  return [...views.values()]
    .filter((view) => view.client)
    .map((view) => ({
      name: view.name,
      client: view.client!,
      labels: { ...(view.labels ?? {}) },
    }));
}

let loading: Promise<void> | undefined;

type ViewModules = Record<string, { default?: DevView } | undefined>;

/**
 * Every view file's module by its path in src/bench/dev-views/, tests left out. Where a bundler builds
 * the code (the installed game's play server, the test runner) it reads the folder itself, at build time;
 * run straight from source by node, `import.meta.glob` does not exist and the folder is read when asked.
 */
async function viewModules(): Promise<ViewModules> {
  try {
    return import.meta.glob(
      ["./dev-views/[a-z]*.ts", "!./dev-views/*.test.ts"],
      {
        eager: true,
      },
    ) as ViewModules;
  } catch {
    // Written with join, not a URL beside this file: the packaging script copies whatever such a URL names, tests too.
    const folder = join(import.meta.dirname, "dev-views");
    const files = await readdir(folder).catch(() => [] as string[]);
    const found: ViewModules = {};
    for (const file of files.filter((f) => /^[a-z-]+\.ts$/.test(f)))
      found[`./dev-views/${file}`] = (await import(
        pathToFileURL(join(folder, file)).href
      )) as { default?: DevView };
    return found;
  }
}

/**
 * Registers every view in src/bench/dev-views/ once, on the first dev-mode request. A file's
 * default export is its view, named for the file.
 */
export function loadDevViews(): Promise<void> {
  loading ??= (async () => {
    const modules = await viewModules();
    for (const path of Object.keys(modules).sort()) {
      const file = path.replace("./dev-views/", "");
      const module = modules[path]!;
      if (!module.default)
        throw new Error(
          `src/bench/dev-views/${file} exports no dev-mode view.`,
        );
      if (module.default.name !== file.replace(/\.ts$/, ""))
        throw new Error(
          `src/bench/dev-views/${file}: the view's name ${module.default.name} is not its file's.`,
        );
      registerDevView(module.default);
    }
  })();
  return loading;
}
