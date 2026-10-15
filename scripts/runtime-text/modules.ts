import { isTestFile, listSourceFiles } from "./literal-index";

/**
 * Which modules under src the run asked the dev server for, against every
 * module that exists. The dev server sends a module only when something
 * imports it, so a module never requested was never loaded in this run.
 * A module a screen this run did not reach loads lazily and can show here as
 * never loaded; that makes it a candidate for deletion, not proof.
 */
export interface ModuleReport {
  readonly existing: number;
  readonly loaded: number;
  readonly neverLoaded: readonly string[];
}

export function moduleReport(requestedUrls: readonly string[]): ModuleReport {
  const loaded = new Set<string>();
  for (const url of requestedUrls) {
    const path = new URL(url, "http://local").pathname;
    if (path.startsWith("/src/")) loaded.add(path.slice(1));
  }
  const existing = listSourceFiles("src").filter(
    (file) =>
      !isTestFile(file) &&
      !/\.d\.ts$/.test(file) &&
      /\.(ts|tsx|json|css)$/.test(file),
  );
  return {
    existing: existing.length,
    loaded: existing.filter((file) => loaded.has(file)).length,
    neverLoaded: existing.filter((file) => !loaded.has(file)),
  };
}
