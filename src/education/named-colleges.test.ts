import { describe, expect, it } from "vitest";
import kindsText from "../../data/research/places/college-kinds.json?raw";
import overridesText from "../../data/research/places/college-kind-overrides.json?raw";
import campusManifestText from "../../art/campuses/manifest.json?raw";
import hotbedsText from "../../data/research/places/political-hotbeds.json?raw";
import { collegePlaceFor } from "./college-places";
import type { EducationInstitution } from "./types";

const kinds = JSON.parse(kindsText) as {
  readonly institutions: readonly { id: string; state: string; kind: string }[];
};
const campusManifest = JSON.parse(campusManifestText) as {
  readonly campuses: readonly { institutionId?: string; campus: string }[];
};
const overrides = JSON.parse(overridesText) as {
  readonly ivyLeague: readonly string[];
  readonly flagships: readonly string[];
  readonly politicalHotbeds: readonly string[];
};
const hotbeds = JSON.parse(hotbedsText) as {
  readonly campuses: readonly { id: string; name: string; evidence: string }[];
  readonly sources: readonly { id: string; url: string }[];
};

function institution(
  id: string,
  kind: EducationInstitution["kind"] = "postsecondary",
) {
  const row = kinds.institutions.find((entry) => entry.id === id);
  return {
    id,
    kind,
    name: `Directory name for ${id}`,
    city: "Source City",
    state: row?.state ?? "XX",
    statusCode: "A",
  } as EducationInstitution;
}

describe("IPEDS college places", () => {
  it("has a kind row for every state and territory flagship without creating records up front", () => {
    const rows = kinds.institutions;
    const byId = new Map(
      rows.map((row) => [row.id.replace("ipeds-unit:", ""), row]),
    );
    const flagships = overrides.flagships.map((id) => byId.get(id));
    expect(flagships.every(Boolean)).toBe(true);
    expect(flagships.every((row) => row?.kind === "flagship")).toBe(true);
    const codes = new Set(flagships.map((row) => row!.state));
    expect(
      [
        ..."AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY GU MP PR VI".split(
          " ",
        ),
      ].every((code) => codes.has(code)),
    ).toBe(true);
  });

  it("resolves the eight Ivy League institutions from IPEDS identities", () => {
    expect(overrides.ivyLeague).toHaveLength(8);
    for (const id of overrides.ivyLeague) {
      expect(collegePlaceFor(institution(`ipeds-unit:${id}`))?.kind).toBe(
        "ivy-league",
      );
    }
  });

  it("keeps 25 sourced hotbeds tied to IPEDS identities and resolves a painted DC college", () => {
    expect(hotbeds.campuses).toHaveLength(25);
    expect(new Set(hotbeds.campuses.map((row) => row.id)).size).toBe(25);
    expect(hotbeds.sources.length).toBeGreaterThanOrEqual(2);
    expect(
      hotbeds.campuses.every((row) =>
        hotbeds.sources.some((source) => source.id === row.evidence),
      ),
    ).toBe(true);
    expect(
      hotbeds.campuses.every((row) =>
        kinds.institutions.some(
          (kindRow) => kindRow.id === `ipeds-unit:${row.id}`,
        ),
      ),
    ).toBe(true);
    expect(overrides.politicalHotbeds).toEqual(
      hotbeds.campuses.map((row) => row.id).sort(),
    );
    for (const id of overrides.politicalHotbeds) {
      expect(
        kinds.institutions.some((row) => row.id === `ipeds-unit:${id}`),
      ).toBe(true);
    }
    expect(collegePlaceFor(institution("ipeds-unit:139658"))?.kind).toBe(
      "political-hotbed",
    );
    expect(collegePlaceFor(institution("ipeds-unit:131496"))).toMatchObject({
      campus: "dc",
      kind: "private",
    });
  });

  it("resolves every painted campus identity from the manifest into the IPEDS catalog", () => {
    const ids = campusManifest.campuses.map((row) => row.institutionId);
    expect(ids.every((id) => Boolean(id))).toBe(true);
    expect(
      ids.every((id) => kinds.institutions.some((row) => row.id === id)),
    ).toBe(true);
  });

  it("uses a painted campus identity where the manifest names one and refuses other record kinds", () => {
    const harvard = collegePlaceFor(institution("ipeds-unit:166027"));
    expect(harvard).toMatchObject({ kind: "ivy-league", campus: "harvard" });
    expect(
      collegePlaceFor(institution("ipeds-unit:166027", "school")),
    ).toBeNull();
    expect(
      collegePlaceFor({ ...institution("ipeds-unit:166027"), statusCode: "D" }),
    ).toBeNull();
  });
});
