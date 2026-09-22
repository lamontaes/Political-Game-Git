/** Bounded D.C. institution identity, not filing or legislative procedure. */
import { packForResearchGovernment } from "./national-packs";
import type { ResearchGovernment } from "./national-research";
import type { Cell, MunicipalPackInput } from "./parse";
const government: ResearchGovernment = {
  key: "us-dc-washington",
  state: "DC",
  displayName: "District of Columbia",
  residentName: "District of Columbia",
  attestedAsOf: "2026-09-19",
  packetId: "dc-code-1-204-01",
  sources: [],
  form: null,
  body: {
    name: null,
    size: null,
    composition: null,
    presidingOffice: null,
    executiveSelection: null,
    sourceKey: "dc-code-1-204-01",
  },
  separation: null,
  mayor: null,
  manager: null,
  partisanship: null,
  terms: [],
  powers: [],
  consolidation: null,
  meetingPlaces: [],
  meetingSeries: [],
  placeCrosswalk: null,
  unresolved: [],
};
function unestablished(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(unestablished);
  if (!node || typeof node !== "object") return node;
  if ("status" in node)
    return {
      status: "UNKNOWN",
      reason:
        "Not established by the scoped D.C. institution-identity provisions.",
    };
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [key, unestablished(value)]),
  );
}
const base = unestablished(
  packForResearchGovernment(government),
) as MunicipalPackInput;
const excerpts = {
  "dc-code-1-204-01":
    "There is established a Council of the District of Columbia; and the members of the Council shall be elected by the registered qualified electors of the District.\nThe Council established under subsection (a) of this section shall consist of 13 members elected on a partisan basis. The Chairman and 4 members shall be elected at large in the District, and 8 members shall be elected 1 each from the 8 election wards established, from time to time, under Chapter 10 of this title .",
  "dc-code-1-204-21":
    "There is established the Office of Mayor of the District of Columbia; and the Mayor shall be elected by the registered qualified electors of the District.",
  "dc-code-1-204-22":
    "The executive power of the District shall be vested in the Mayor who shall be the chief executive officer of the District government.",
} as const;
function fact(
  value: unknown,
  sourceKey: keyof typeof excerpts,
  section: string,
): Cell {
  return {
    status: "KNOWN",
    value,
    sourceKey,
    legalLocator: `D.C. Code § ${section}`,
    excerpt:
      sourceKey === "dc-code-1-204-01"
        ? excerpts[sourceKey].split("\n")[section === "1-204.01(a)" ? 0 : 1]!
        : excerpts[sourceKey],
    // § 1-207.71(b)/(c); original §§ 401, 421 and 422 are visually
    // verified in the preserved 1973 Act. Ratification is separately recorded.
    effectiveDate: section === "1-204.01(b)(1)" ? "1974-07-01" : "1975-01-02",
  };
}
export const DC_PRODUCTION_PACK: MunicipalPackInput = {
  ...base,
  electedStructure: {
    ...base.electedStructure,
    bodyName: fact(
      "Council of the District of Columbia",
      "dc-code-1-204-01",
      "1-204.01(a)",
    ),
    bodySize: fact(13, "dc-code-1-204-01", "1-204.01(b)(1)"),
    composition: fact(
      {
        pattern: "HYBRID_DISTRICT_AT_LARGE",
        districtSeats: null,
        atLargeSeats: 5,
        wardSeats: 8,
        note: "Chairman and four other members elected at large; one member from each of eight wards.",
      },
      "dc-code-1-204-01",
      "1-204.01(b)(1)",
    ),
    executiveSelection: fact(
      "The Mayor is elected by the registered qualified electors of the District.",
      "dc-code-1-204-21",
      "1-204.21(a)",
    ),
  },
  administrativeStructure: {
    ...base.administrativeStructure,
    mayor: fact(
      {
        title: "Mayor of the District of Columbia",
        structuralPosition: "SEPARATE_CHIEF_EXECUTIVE",
      },
      "dc-code-1-204-22",
      "1-204.22",
    ),
  },
  unresolved: [
    "Only District corporate identity, Council composition and elected executive Mayor are admitted. Officeholders, filing/qualification, ordinance procedure, appointments and public-meeting details remain uncompiled. The House Delegate and statehood Senator/Representative offices are distinct and are not created by this pack.",
  ],
};
