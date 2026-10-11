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

/**
 * Static source imports make every retained domain visible to the source
 * reachability audit while keeping each module lazy until the pipeline loads.
 */
const DOMAIN_LOADERS: Readonly<
  Record<string, () => Promise<{ sourceDomain?: SourceDomainModule }>>
> = {
  "acs-pums": () => import("../../src/source/domains/acs-pums/index"),
  "bea-regional": () => import("../../src/source/domains/bea-regional/index"),
  "bls-laus": () => import("../../src/source/domains/bls-laus/index"),
  "career-occupations": () =>
    import("../../src/source/domains/career-occupations/index"),
  "cd-place-relations": () =>
    import("../../src/source/domains/cd-place-relations/index"),
  "census-voting-registration": () =>
    import("../../src/source/domains/census-voting-registration/index"),
  "civil-service-labor": () =>
    import("../../src/source/domains/civil-service-labor/index"),
  "constitutional-process": () =>
    import("../../src/source/domains/constitutional-process/index"),
  counties: () => import("../../src/source/domains/counties/index"),
  education: () => import("../../src/source/domains/education/index"),
  "federal-courts": () =>
    import("../../src/source/domains/federal-courts/index"),
  "government-finances": () =>
    import("../../src/source/domains/government-finances/index"),
  "government-units": () =>
    import("../../src/source/domains/government-units/index"),
  hospitals: () => import("../../src/source/domains/hospitals/index"),
  "hud-housing": () => import("../../src/source/domains/hud-housing/index"),
  "judicial-office-selection": () =>
    import("../../src/source/domains/judicial-office-selection/index"),
  "municipal-governance": () =>
    import("../../src/source/domains/municipal-governance/index"),
  "place-county-relations": () =>
    import("../../src/source/domains/place-county-relations/index"),
  places: () => import("../../src/source/domains/places/index"),
  "political-districts": () =>
    import("../../src/source/domains/political-districts/index"),
  "public-employment": () =>
    import("../../src/source/domains/public-employment/index"),
  "sld-place-relations": () =>
    import("../../src/source/domains/sld-place-relations/index"),
  "state-campaign-compliance": () =>
    import("../../src/source/domains/state-campaign-compliance/index"),
  "state-legislatures": () =>
    import("../../src/source/domains/state-legislatures/index"),
  "state-local-fiscal-authority": () =>
    import("../../src/source/domains/state-local-fiscal-authority/index"),
  "state-office-qualifications": () =>
    import("../../src/source/domains/state-office-qualifications/index"),
};

export const REPO_ROOT = resolve(
  fileURLToPath(new URL("../..", import.meta.url)),
);

export const DOMAINS_DIR = resolve(REPO_ROOT, "src/source/domains");

/** Every domain directory name, sorted, so command output is deterministic. */
export function listDomainNames(): readonly string[] {
  const names = readdirSync(DOMAINS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const registered = Object.keys(DOMAIN_LOADERS).sort();
  const unregistered = names.filter((name) => !DOMAIN_LOADERS[name]);
  const missing = registered.filter((name) => !names.includes(name));
  if (unregistered.length || missing.length) {
    throw new Error(
      `Source-domain import registry does not match its folders. Unregistered: ${unregistered.join(", ") || "none"}; missing folders: ${missing.join(", ") || "none"}.`,
    );
  }
  return names;
}

/** Load every domain module, in the same deterministic order. */
export async function loadDomains(): Promise<readonly SourceDomainModule[]> {
  const loaded: SourceDomainModule[] = [];
  for (const name of listDomainNames()) {
    const imported = await DOMAIN_LOADERS[name]!();
    const candidate = imported.sourceDomain;
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
