/**
 * One test per law in the law-wiring matrix (docs/reports/law-wiring-matrix.json,
 * written by scripts/law-wiring/matrix.ts from the checker's runs in randomly
 * drawn places). Every law in the catalog has a row, and each of its nine links
 * is either wired with evidence from a drawn place (its seed and the record ids
 * the checker found), declared not applicable with a reason, or covered by an
 * open stopgap row registered for that law and link.
 */
import { describe, expect, it } from "vitest";
import matrix from "../docs/reports/law-wiring-matrix.json" with { type: "json" };
import declared from "../scripts/law-wiring/declared.json" with { type: "json" };
import stopgaps from "../src/core2/data/stopgaps.json" with { type: "json" };
import { allLaws } from "../scripts/law-wiring/catalog";

interface Link {
  readonly status: string;
  readonly evidence: string;
  readonly why: string;
}
interface Row {
  readonly key: string;
  readonly links: Readonly<Record<string, Link>>;
}

const LINKS = [
  "exists",
  "change",
  "reach",
  "systems",
  "money",
  "web",
  "knowing",
  "repeal",
  "allPlaces",
] as const;
const rows = (matrix as { rows: Row[] }).rows;
const places = (matrix as { places: { name: string }[] }).places;
const open = new Set(
  (stopgaps as { id: string; status?: string }[])
    .filter((row) => row.status !== "resolved")
    .map((row) => row.id),
);
const declaredLinks = (
  declared as {
    laws: Record<string, Record<string, { status: string; why: string }>>;
  }
).laws;

describe("law-wiring matrix", () => {
  it("has one row for every law in the catalog, graded in two drawn places", () => {
    expect(rows.map((row) => row.key).sort()).toEqual(
      allLaws()
        .map((law) => law.key)
        .sort(),
    );
    expect(places.length).toBe(2);
  });

  it.each(rows.map((row) => [row.key, row] as const))(
    "%s: every link is wired with evidence, declared not applicable, or stopgapped",
    (key, row) => {
      for (const link of LINKS) {
        const graded = row.links[link];
        const where = `${key} ${link}: ${graded?.evidence} ${graded?.why}`;
        expect(graded, where).toBeDefined();
        expect(["wired", "n/a", "stopgap"], where).toContain(graded!.status);
        if (graded!.status === "n/a") {
          // Only a law's own terms or its research rule a link out.
          expect(declaredLinks[key]?.[link]?.status, where).toBe("n/a");
          expect(graded!.why.length, where).toBeGreaterThan(0);
        }
        if (graded!.status === "stopgap") {
          const ids = graded!.why.match(/SG-[A-Za-z0-9-]+/g) ?? [];
          expect(ids.length, `${where}: names its stopgap`).toBeGreaterThan(0);
          for (const id of ids)
            expect(open.has(id), `${where}: ${id} is an open stopgap row`).toBe(
              true,
            );
        }
        if (graded!.status !== "wired") continue;
        expect(graded!.evidence.length, where).toBeGreaterThan(0);
        // Measured links name the drawn place, its seed and the records found.
        if (link === "reach")
          expect(graded!.evidence, where).toMatch(
            /seed [0-9a-f]+\).* e\.g\. \S/,
          );
        if (link === "money")
          expect(graded!.evidence, where).toMatch(/seed [0-9a-f]+\).*journal:/);
        if (link === "repeal")
          expect(graded!.evidence, where).toMatch(/seed [0-9a-f]+\)/);
      }
    },
  );
});
