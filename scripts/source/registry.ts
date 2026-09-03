/**
 * Domain discovery.
 *
 * The domain list is derived from the directory listing of
 * `src/source/domains/`, never from a hand-maintained array. A new domain is
 * covered by acquire, compile, manifest, validate and replay by existing, and a
 * directory that does not export a `sourceDomain` fails loudly here rather than
 * being silently skipped.
 */

import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { SourceDomainModule } from "../../src/source/core/index";

export const REPO_ROOT = resolve(
  fileURLToPath(new URL("../..", import.meta.url)),
);

export const DOMAINS_DIR = resolve(REPO_ROOT, "src/source/domains");

/** Every domain directory name, sorted, so command output is deterministic. */
export function listDomainNames(): readonly string[] {
  return readdirSync(DOMAINS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Load every domain module, in the same deterministic order. */
export async function loadDomains(): Promise<readonly SourceDomainModule[]> {
  const loaded: SourceDomainModule[] = [];
  for (const name of listDomainNames()) {
    const moduleUrl = new URL(
      `../../src/source/domains/${name}/index.ts`,
      import.meta.url,
    );
    const imported: unknown = await import(moduleUrl.href);
    const candidate = (imported as { sourceDomain?: SourceDomainModule })
      .sourceDomain;
    if (!candidate) {
      throw new Error(
        `src/source/domains/${name} exports no "sourceDomain". Every domain directory must be wired into the command matrix.`,
      );
    }
    if (candidate.domain !== name) {
      throw new Error(
        `src/source/domains/${name} declares itself domain "${candidate.domain}"; the directory name is the domain name.`,
      );
    }
    loaded.push(candidate);
  }
  return loaded;
}

/** Load one domain by name, for the `--domain` flag. */
export async function loadDomain(name: string): Promise<SourceDomainModule> {
  const all = await loadDomains();
  const found = all.find((domain) => domain.domain === name);
  if (!found) {
    throw new Error(
      `No source domain "${name}". Known domains: ${all.map((d) => d.domain).join(", ")}.`,
    );
  }
  return found;
}

/** The repository-relative data directory for one domain. */
export function domainDataDir(domain: string): string {
  return resolve(REPO_ROOT, "data/source", domain);
}

/** Read the `--domain <name>` flag, if one was given. */
export function domainFlag(argv: readonly string[]): string | null {
  const index = argv.indexOf("--domain");
  if (index === -1) return null;
  const value = argv[index + 1];
  if (!value) throw new Error("--domain requires a domain name.");
  return value;
}
