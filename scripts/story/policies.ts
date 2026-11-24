/**
 * The game's policies as the bill catalog lists them
 * (src/core2/data/legislature/bill-catalog.json): subject, topic, id, plain
 * name, kind and the levels that can act on each. Read by the coverage map
 * (scripts/story/coverage.ts) and the issues guard
 * (tests/guards/english/element-issues.test.ts).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export interface CatalogPolicy {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly subject: string;
  readonly topic: string;
  readonly levels: readonly string[];
}

interface Catalog {
  readonly subjects: readonly {
    readonly name: string;
    readonly topics: readonly {
      readonly name: string;
      readonly policies?: readonly {
        readonly id: string;
        readonly name: string;
        readonly kind: string;
        readonly levels?: readonly string[];
      }[];
    }[];
  }[];
}

// Run from the repository's root, as every script and test is.
const CATALOG = path.resolve("src/core2/data/legislature/bill-catalog.json");

/** Every policy in the catalog, in its order. */
export function catalogPolicies(): CatalogPolicy[] {
  const catalog = JSON.parse(readFileSync(CATALOG, "utf8")) as Catalog;
  return catalog.subjects.flatMap((subject) =>
    subject.topics.flatMap((topic) =>
      (topic.policies ?? []).map((policy) => ({
        id: policy.id,
        name: policy.name,
        kind: policy.kind,
        subject: subject.name,
        topic: topic.name,
        levels: policy.levels ?? [],
      })),
    ),
  );
}

/** The catalog's policy ids. */
export function catalogPolicyIds(): Set<string> {
  return new Set(catalogPolicies().map((policy) => policy.id));
}
