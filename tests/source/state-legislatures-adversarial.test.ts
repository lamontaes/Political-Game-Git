/**
 * The probes an independent audit used to get false facts through this domain,
 * kept as tests.
 *
 * Every case below is something that compiled, validated or opened for
 * production before the repair, and the point of writing them down is that each
 * one was realistic: a real quotation attached to the wrong number, a real
 * provision offered as evidence for a gap it says nothing about, a real page
 * granted production rights because its status label said so. None of them
 * looks like an attack in a diff.
 *
 * The tests are grouped by the boundary they press on — rights and content
 * scope, field-specific proof, provenance binding, and the immutability of the
 * captured bytes — and each group ends with the positive case, because a check
 * that refuses everything is not a check either.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertValidRawArtifact,
  extractEnactedText,
  openProductionArtifacts,
  sha256Hex,
} from "../../src/source/core/index";
import type {
  ArtifactLock,
  GovernmentEdictBasis,
  RawArtifact,
} from "../../src/source/core/index";
import {
  STATE_DECLARATIONS,
  STATE_LEGISLATURES_CORPUS_AS_OF,
  STATE_LEGISLATURE_SOURCES,
  artifactTextLookup,
  compileStateLegislatures,
  isDeclaredFact,
  membershipStatedFor,
  normalizeDeclaredStates,
  openStateLegislatureArtifacts,
  statesElection,
  validateStateLegislatureCorpus,
} from "../../src/source/domains/state-legislatures/index";
import type {
  ChamberDeclaration,
  Declared,
  DeclaredFact,
  StateDeclaration,
  StateLegislatureIdentity,
} from "../../src/source/domains/state-legislatures/index";
import { listDomainNames, loadDomain } from "../../scripts/source/registry";

const REPO = resolve(import.meta.dirname, "../..");

function lock(): ArtifactLock {
  return JSON.parse(
    readFileSync(
      resolve(REPO, "data/source/state-legislatures/artifact-lock.json"),
      "utf-8",
    ),
  ) as ArtifactLock;
}

function artifact(artifactId: string): RawArtifact {
  const found = lock().artifacts.find(
    (entry) => entry.artifactId === artifactId,
  );
  if (!found) throw new Error(`no locked artifact ${artifactId}`);
  return found;
}

function edictOf(artifactId: string): GovernmentEdictBasis {
  const rights = artifact(artifactId).rights;
  if (rights.status !== "public-domain-government-edict") {
    throw new Error(`${artifactId} is not an edict artifact`);
  }
  return rights.edict;
}

/** One artifact re-locked with substituted rights, and nothing else changed. */
function withRights(
  artifactId: string,
  rights: RawArtifact["rights"],
): ArtifactLock {
  const base = lock();
  return {
    ...base,
    artifacts: base.artifacts.map((entry) =>
      entry.artifactId === artifactId ? { ...entry, rights } : entry,
    ),
  };
}

/** The enacted text a production compile is allowed to read, by artifact id. */
function openedText(artifactId: string): string {
  const opened = openStateLegislatureArtifacts(lock());
  const entry = opened.artifacts[artifactId];
  if (!entry) throw new Error(`role ${artifactId} not opened`);
  return entry.bytes.toString("utf-8");
}

function declarationOf(usps: string): StateDeclaration {
  const found = STATE_DECLARATIONS.find((entry) => entry.stateUsps === usps);
  if (!found) throw new Error(`no declaration for ${usps}`);
  return found;
}

function lookupForCompile() {
  const opened = openStateLegislatureArtifacts(lock());
  const bytes = new Map<string, Uint8Array>();
  for (const [artifactId, entry] of Object.entries(opened.artifacts)) {
    bytes.set(artifactId, entry.bytes);
  }
  return artifactTextLookup(bytes);
}

/** Compile one doctored declaration and return the defects it produced. */
function defectsFor(declaration: StateDeclaration): readonly string[] {
  return normalizeDeclaredStates(
    [declaration],
    lookupForCompile(),
    STATE_LEGISLATURES_CORPUS_AS_OF,
  ).defects.map((defect) => defect.message);
}

function replaceChamber(
  declaration: StateDeclaration,
  chamberKey: string,
  change: (chamber: ChamberDeclaration) => ChamberDeclaration,
): StateDeclaration {
  return {
    ...declaration,
    chambers: declaration.chambers.map((chamber) =>
      chamber.chamberKey === chamberKey ? change(chamber) : chamber,
    ),
  };
}

/** Every declared value in a state, as one homogeneous list. */
function allDeclared(
  declaration: StateDeclaration,
): readonly Declared<unknown>[] {
  return [
    declaration.legislatureName as Declared<unknown>,
    declaration.structure as Declared<unknown>,
    ...declaration.chambers.flatMap((chamber) => [
      chamber.name as Declared<unknown>,
      chamber.seatCount as Declared<unknown>,
      chamber.membersElected as Declared<unknown>,
    ]),
  ];
}

function asFact<T>(declared: Declared<T>): DeclaredFact<T> {
  if (!isDeclaredFact(declared)) throw new Error("expected a declared fact");
  return declared;
}

/** The same declared fact, cited to a different artifact. */
function retargeted(
  declared: Declared<string>,
  artifactId: string,
): Declared<string> {
  const fact = asFact(declared);
  const [first, ...rest] = fact.transcriptions;
  return {
    ...fact,
    transcriptions: [
      { ...first, artifactId },
      ...rest.map((transcription) => ({ ...transcription, artifactId })),
    ],
  };
}

// ---------------------------------------------------------------------------
// Blocker 1 — rights are a structured contract over enacted text
// ---------------------------------------------------------------------------

describe("state instruments: the edicts doctrine covers text, not pages", () => {
  it("refuses an edict determination whose enacting authority is a placeholder", () => {
    const forged: RawArtifact = {
      ...artifact("ca-constitution-article-4"),
      rights: {
        status: "public-domain-government-edict",
        declaredLicense: null,
        attributionRequired: "UNKNOWN",
        edict: {
          ...edictOf("ca-constitution-article-4"),
          enactingAuthority: "x",
        },
      },
    };
    expect(() => assertValidRawArtifact(forged)).toThrow(/enacting authority/i);
  });

  it("refuses an edict determination with no enacted-text boundary at all", () => {
    const edict = edictOf("ca-constitution-article-4");
    const unbounded: RawArtifact = {
      ...artifact("ca-constitution-article-4"),
      rights: {
        status: "public-domain-government-edict",
        declaredLicense: null,
        attributionRequired: "UNKNOWN",
        edict: {
          ...edict,
          scope: { ...edict.scope, regions: [] },
        },
      },
    };
    expect(() => assertValidRawArtifact(unbounded)).toThrow(/region|boundary/i);
  });

  it("denies production to a whole mixed capture whose scope claims the page", () => {
    /*
     * The status label is not permission. Here the determination is otherwise
     * well formed and its boundary is missing, which is exactly the shape the
     * audit found: a real state constitution, a real doctrine, and a scope that
     * silently covered the publisher's navigation and footer along with the law.
     */
    const edict = edictOf("il-constitution-article-4");
    const doctored = withRights("il-constitution-article-4", {
      status: "public-domain-government-edict",
      declaredLicense: null,
      attributionRequired: "UNKNOWN",
      edict: {
        ...edict,
        scope: {
          ...edict.scope,
          boundaryKind:
            "whole-artifact" as unknown as typeof edict.scope.boundaryKind,
        },
      },
    });
    expect(() =>
      openProductionArtifacts("state-legislatures", doctored, {
        "il-constitution-article-4": "il-constitution-article-4",
      }),
    ).toThrow(/boundary|may not be opened/i);
  });

  it("denies production when the boundary no longer cuts what it pinned", () => {
    const edict = edictOf("nc-constitution-article-2");
    const widened = withRights("nc-constitution-article-2", {
      status: "public-domain-government-edict",
      declaredLicense: null,
      attributionRequired: "UNKNOWN",
      edict: {
        ...edict,
        scope: {
          ...edict.scope,
          regions: [
            {
              beginsWith: edict.scope.regions[0]!.beginsWith,
              endsWith:
                "decennial census of population taken by order of Congress",
            },
          ],
        },
      },
    });
    expect(() =>
      openProductionArtifacts("state-legislatures", widened, {
        "nc-constitution-article-2": "nc-constitution-article-2",
      }),
    ).toThrow(/pins|scope of the edict determination has moved/i);
  });

  it("accepts a properly scoped edict and hands over only the enacted text", () => {
    const text = openedText("ak-constitution");
    expect(text).toContain(
      "The legislative power of the State is vested in a legislature",
    );
    // The page's navigation, header and copyright footer are not law.
    expect(text).not.toContain("Meet Lt. Governor");
    expect(text).not.toContain("COPYRIGHT © STATE OF ALASKA");
    // Nor is the publisher's editorial note attached to the same section.
    expect(text).not.toContain("Editor");
    expect(text.length).toBeLessThan(2000);
  });

  it("keeps every capture's enacted extraction equal to what its rights pin", () => {
    for (const spec of STATE_LEGISLATURE_SOURCES) {
      const edict = edictOf(spec.artifactId);
      const cut = Buffer.from(
        extractEnactedText(
          spec.artifactId,
          readFileSync(resolve(REPO, spec.localPath)),
          edict.scope,
        ),
        "utf-8",
      );
      expect(sha256Hex(cut)).toBe(edict.scope.extracted.sha256);
      expect(cut.length).toBe(edict.scope.extracted.length);
      expect(edict.contentScope).toBe("enacted-legal-text-only");
      expect(edict.jurisdictionKey).toBe(spec.jurisdictionKey);
    }
  });

  it("leaves every other source domain's rights semantics exactly as they were", async () => {
    let checked = 0;
    for (const name of listDomainNames()) {
      if (name === "state-legislatures") continue;
      const domain = await loadDomain(name);
      let raw: string;
      try {
        raw = readFileSync(resolve(REPO, domain.lockPath), "utf-8");
      } catch {
        continue;
      }
      const parsed = JSON.parse(raw) as ArtifactLock;
      for (const entry of parsed.artifacts) {
        // Unchanged statuses, and no domain silently acquires an edict claim.
        expect(entry.rights.status).not.toBe("public-domain-government-edict");
        expect("edict" in entry.rights).toBe(false);
        expect(() => assertValidRawArtifact(entry)).not.toThrow();
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("still refuses to open an artifact whose rights are UNKNOWN", () => {
    const doctored = withRights("hi-constitution", {
      status: "UNKNOWN",
      declaredLicense: null,
      attributionRequired: "UNKNOWN",
    });
    expect(() =>
      openProductionArtifacts("state-legislatures", doctored, {
        "hi-constitution": "hi-constitution",
      }),
    ).toThrow(/UNKNOWN rights status/);
  });
});

// ---------------------------------------------------------------------------
// Blocker 2 — proof is field-specific
// ---------------------------------------------------------------------------

describe("state instruments: a sentence has to state the proposition claimed", () => {
  it("refuses California's Senate at the staggered cohort number", () => {
    /*
     * "The Senate has a membership of 40 Senators elected for 4-year terms, 20
     * to begin every 2 years." Twenty is how many seats turn over, not how many
     * there are, and it sits in the same sentence as the membership.
     */
    const doctored = replaceChamber(
      declarationOf("CA"),
      "senate",
      (chamber) => ({
        ...chamber,
        seatCount: { ...asFact(chamber.seatCount), value: 20 },
      }),
    );
    expect(defectsFor(doctored).join("\n")).toMatch(
      /senate seatCount claims 20 seats, and the quoted provision states a membership of 40/,
    );
  });

  it("accepts California's Senate at its stated membership", () => {
    expect(defectsFor(declarationOf("CA"))).toEqual([]);
    expect(
      membershipStatedFor(
        "The Senate has a membership of 40 Senators elected for 4-year terms, 20 to begin every 2 years.",
        "Senate",
      ),
    ).toBe(40);
  });

  it("reads a membership out of the sentence rather than looking for one", () => {
    // A range states no membership, however many numbers it contains.
    expect(
      membershipStatedFor(
        "The Senate shall consist of not more than forty and not less than thirty-three members",
        "Senate",
      ),
    ).toBeNull();
    // Nor does a count the instrument itself leaves open.
    expect(
      membershipStatedFor(
        "The House of Representatives shall be composed of 35 members, plus such additional members as shall be provided under Section 2A of this Article, who shall be chosen for 2 years.",
        "House of Representatives",
      ),
    ).toBeNull();
  });

  it("loses Illinois' 118 when the one-member-per-district premise goes", () => {
    const doctored = replaceChamber(declarationOf("IL"), "house", (chamber) => {
      const fact = asFact(chamber.seatCount);
      return {
        ...chamber,
        seatCount: {
          ...fact,
          transcriptions: [
            fact.transcriptions[0],
          ] as typeof fact.transcriptions,
        },
      };
    });
    expect(defectsFor(doctored).join("\n")).toMatch(
      /house seatCount derives 118 seats from one member per district, and no provision it quotes contains the clause/,
    );
  });

  it("loses Illinois' 118 when the district-count premise goes", () => {
    const doctored = replaceChamber(declarationOf("IL"), "house", (chamber) => {
      const fact = asFact(chamber.seatCount);
      return {
        ...chamber,
        seatCount: {
          ...fact,
          transcriptions: [
            fact.transcriptions[1]!,
          ] as typeof fact.transcriptions,
        },
      };
    });
    expect(defectsFor(doctored).join("\n")).toMatch(
      /derives 118 seats from 118 Representative Districts, and no provision it quotes fixes that number of districts/,
    );
  });

  it("keeps Illinois' complete derivation, and every other one", () => {
    expect(defectsFor(declarationOf("IL"))).toEqual([]);
    const derived = STATE_DECLARATIONS.flatMap((declaration) =>
      allDeclared(declaration).flatMap((value) =>
        isDeclaredFact(value) && value.derivation === "DERIVED" ? [value] : [],
      ),
    );
    expect(derived).toHaveLength(8);
    for (const value of derived) {
      expect(value.derivationKind).not.toBeNull();
      expect(value.proof).toBeNull();
    }
  });

  it("refuses districting language as proof that members are elected", () => {
    /*
     * "Senators shall be chosen by single districts" is a real sentence about
     * how Minnesota draws its districts. It contains an election word and an
     * agent, and the agent is not an electorate.
     */
    expect(statesElection("Senators shall be chosen by single districts")).toBe(
      false,
    );
    expect(
      statesElection(
        "The senators and representatives shall be chosen by the electors of the respective counties or districts",
      ),
    ).toBe(true);

    const minnesota = declarationOf("MN");
    const doctored = replaceChamber(minnesota, "senate", (chamber) => ({
      ...chamber,
      membersElected: {
        value: true,
        derivation: "DIRECT",
        derivationChain: null,
        derivationKind: null,
        proof: {
          kind: "chamber-members-elected",
          subject: "Senators",
          clause: "Senators shall be chosen by single districts",
          subjectScope: "this-chamber",
        },
        transcriptions: [
          {
            citation: "Minn. Const. art. IV, § 3",
            authorityTitle: "The Minnesota Constitution",
            artifactId: "mn-constitution",
            pageOrSection: "Article IV, Section 3",
            excerpt: "Senators shall be chosen by single districts",
          },
        ],
      } as Declared<boolean>,
    }));
    // It fails before the proof is even reached: the sentence is not in the
    // enacted text this domain may read. Doctoring it to a real sentence from
    // the page is the harder case, and the proof refuses that too.
    expect(defectsFor(doctored).length).toBeGreaterThan(0);
    expect(defectsFor(doctored).join("\n")).toMatch(/senate membersElected/);
  });

  it("refuses 'chosen for 4 years' as proof that members are elected", () => {
    /*
     * A real sentence, inside the enacted scope, quoted correctly, about the
     * right chamber — and about a term of office rather than an election. It
     * reaches the proof rather than dying at the excerpt check, which is what
     * makes it the useful negative case.
     */
    const doctored = replaceChamber(
      declarationOf("DE"),
      "senate",
      (chamber) => ({
        ...chamber,
        membersElected: {
          value: true,
          derivation: "DIRECT",
          derivationChain: null,
          derivationKind: null,
          proof: {
            kind: "chamber-members-elected",
            subject: "21 members",
            clause:
              "The Senate shall be composed of 21 members, who shall be chosen for 4 years.",
            subjectScope: "this-chamber",
          },
          transcriptions: [
            {
              citation: "Del. Const. art. II, § 2",
              authorityTitle:
                "Constitution of the State of Delaware, Article II",
              artifactId: "de-constitution-article-2",
              pageOrSection: "Article II, § 2 — Composition of Senate",
              excerpt:
                "The Senate shall be composed of 21 members, who shall be chosen for 4 years.",
            },
          ],
        } as Declared<boolean>,
      }),
    );
    expect(defectsFor(doctored).join("\n")).toMatch(
      /senate membersElected rests on .*in which nobody is elected and no electorate chooses anyone/,
    );
  });

  it("refuses an unrelated provision offered as investigated evidence", () => {
    /*
     * A true, verbatim, correctly cited sentence from the same instrument,
     * attached to a gap it says nothing about. Before the relevance contract
     * this validated, because the citation checked out.
     */
    const doctored = replaceChamber(
      declarationOf("NE"),
      "legislature",
      (chamber) => ({
        ...chamber,
        seatCount: {
          unknownReason:
            "Neb. Const. art. III, § 6 fixes only a range, so the constitution does not state the number.",
          basis: {
            kind: "provision-read-does-not-fix-it",
            relevance: "states-limit-only",
          },
          investigated: [
            {
              citation: "Neb. Const. art. III, § 1",
              authorityTitle:
                "Constitution of the State of Nebraska, Article III",
              artifactId: "ne-constitution-article-3-section-1",
              pageOrSection: "Article III-1",
              excerpt:
                "The legislative authority of the state shall be vested in a Legislature consisting of one chamber.",
            },
          ],
        } as Declared<number>,
      }),
    );
    expect(defectsFor(doctored).join("\n")).toMatch(
      /offers Neb\. Const\. art\. III, § 1 as a "states-limit-only" provision and its text has no such form/,
    );
  });

  it("refuses an UNKNOWN that claims to have read a provision and cites none", () => {
    const doctored = replaceChamber(
      declarationOf("NE"),
      "legislature",
      (chamber) => ({
        ...chamber,
        seatCount: {
          unknownReason: "The constitution fixes only a range.",
          basis: {
            kind: "provision-read-does-not-fix-it",
            relevance: "states-limit-only",
          },
        } as Declared<number>,
      }),
    );
    expect(defectsFor(doctored).join("\n")).toMatch(
      /cites no provision\. A claim about what an instrument says has to produce the instrument/,
    );
  });
});

// ---------------------------------------------------------------------------
// Blocker 3 — provenance binds to a locked, declared authority
// ---------------------------------------------------------------------------

describe("state instruments: evidence binds to the authority it names", () => {
  it("refuses a California record relabelled Kentucky, however its artifact is named", () => {
    const california = declarationOf("CA");
    const asKentucky = (artifactId: string): StateDeclaration => ({
      ...california,
      stateUsps: "KY",
      stateName: "Kentucky",
      jurisdictionKey: "US-KY",
      chambers: california.chambers.map((chamber) => ({
        ...chamber,
        name: retargeted(chamber.name, artifactId),
      })),
    });

    // The audit's probe: invent an id that looks like a Kentucky instrument.
    expect(
      defectsFor(asKentucky("ky-constitution-section-29")).join("\n"),
    ).toMatch(
      /cites artifact "ky-constitution-section-29", which is not in this domain's locked acquisition lineage/,
    );

    // Keeping the real artifact does not help either: it says whose law it is.
    expect(
      defectsFor(asKentucky("ca-constitution-article-4")).join("\n"),
    ).toMatch(/out of an instrument of US-CA, and this is the US-KY record/);
  });

  it("refuses evidence citing an artifact that is not in the lock", () => {
    const doctored = replaceChamber(
      declarationOf("HI"),
      "senate",
      (chamber) => {
        const fact = asFact(chamber.name);
        return {
          ...chamber,
          name: {
            ...fact,
            transcriptions: [
              { ...fact.transcriptions[0], artifactId: "hi-constitution-v4" },
            ] as typeof fact.transcriptions,
          },
        };
      },
    );
    expect(defectsFor(doctored).join("\n")).toMatch(
      /cites artifact "hi-constitution-v4", which is not in this domain's locked acquisition lineage/,
    );
  });

  it("refuses a locked artifact belonging to another jurisdiction", () => {
    const doctored = replaceChamber(
      declarationOf("HI"),
      "senate",
      (chamber) => {
        const fact = asFact(chamber.name);
        return {
          ...chamber,
          name: {
            ...fact,
            transcriptions: [
              {
                ...fact.transcriptions[0],
                artifactId: "ca-constitution-article-4",
              },
            ] as typeof fact.transcriptions,
          },
        };
      },
    );
    expect(defectsFor(doctored).join("\n")).toMatch(
      /out of an instrument of US-CA, and this is the US-HI record/,
    );
  });

  it("refuses a citation that renames the instrument it cites", () => {
    const doctored = replaceChamber(
      declarationOf("HI"),
      "senate",
      (chamber) => {
        const fact = asFact(chamber.name);
        return {
          ...chamber,
          name: {
            ...fact,
            transcriptions: [
              {
                ...fact.transcriptions[0],
                authorityTitle: "92K V4 State Legislature Research Compilation",
              },
            ] as typeof fact.transcriptions,
          },
        };
      },
    );
    expect(defectsFor(doctored).join("\n")).toMatch(
      /and the locked artifact is "The Constitution of the State of Hawaii"/,
    );
  });

  it("refuses a citation with no locator, however official it sounds", () => {
    const doctored = replaceChamber(
      declarationOf("HI"),
      "senate",
      (chamber) => {
        const fact = asFact(chamber.name);
        return {
          ...chamber,
          name: {
            ...fact,
            transcriptions: [
              {
                ...fact.transcriptions[0],
                citation: "Official publication 2026",
              },
            ] as typeof fact.transcriptions,
          },
        };
      },
    );
    expect(defectsFor(doctored).join("\n")).toMatch(
      /cites "Official publication 2026", which names no article, section or statutory locator/,
    );

    const corpus = compileStateLegislatures(
      openStateLegislatureArtifacts(lock()),
    );
    const hawaii = corpus.records.find(
      (record) => record.jurisdictionKey === "US-HI",
    ) as StateLegislatureIdentity;
    const senate = hawaii.chambers.find(
      (chamber) => chamber.chamberKey === "senate",
    )!;
    const senateName = senate.name;
    if (senateName.state !== "KNOWN") throw new Error("expected KNOWN");
    const vague = {
      ...hawaii,
      chambers: hawaii.chambers.map((chamber) =>
        chamber.chamberKey === "senate"
          ? {
              ...chamber,
              name: {
                ...senateName,
                evidence: [
                  {
                    ...senateName.evidence[0],
                    locator: {
                      ...senateName.evidence[0].locator,
                      citation: "Official publication 2026",
                    },
                  },
                ] as typeof senateName.evidence,
              },
            }
          : chamber,
      ),
    };
    const report = validateStateLegislatureCorpus({
      corpus: corpus.corpus,
      records: corpus.records.map((record) =>
        record.jurisdictionKey === "US-HI" ? (vague as typeof hawaii) : record,
      ),
    });
    expect(
      report.findings.some(
        (finding) => finding.code === "state-legislatures/generic-citation",
      ),
    ).toBe(true);
  });

  it("refuses repackaged 92K material even under an innocuous name", () => {
    /*
     * The old defence was a list of strings to look for, which a rename walked
     * past. The defence now is that the artifact has to be one this domain
     * declared it retrieved, so the name it arrives under does not matter.
     */
    const doctored = replaceChamber(
      declarationOf("OH"),
      "house",
      (chamber) => ({
        ...chamber,
        seatCount: {
          value: 99,
          derivation: "DIRECT",
          derivationChain: null,
          derivationKind: null,
          proof: {
            kind: "chamber-membership-count",
            chamberSubject: "house of representatives",
          },
          transcriptions: [
            {
              citation: "Ohio Const. art. XI, § 1",
              authorityTitle: "Ohio Constitution, Article II",
              artifactId: "oh-legislature-reference-2026",
              pageOrSection: "Article XI, Section 1",
              excerpt:
                "The house of representatives shall be composed of ninety-nine members.",
            },
          ],
        } as Declared<number>,
      }),
    );
    expect(defectsFor(doctored).join("\n")).toMatch(
      /is not in this domain's locked acquisition lineage/,
    );
  });

  it("still refuses a bicameral state carrying one chamber", () => {
    const corpus = compileStateLegislatures(
      openStateLegislatureArtifacts(lock()),
    );
    const hawaii = corpus.records.find(
      (record) => record.jurisdictionKey === "US-HI",
    ) as StateLegislatureIdentity;
    const report = validateStateLegislatureCorpus({
      corpus: corpus.corpus,
      records: corpus.records.map((record) =>
        record.jurisdictionKey === "US-HI"
          ? { ...hawaii, chambers: [hawaii.chambers[0]!] }
          : record,
      ),
    });
    expect(
      report.findings.some(
        (finding) =>
          finding.code ===
          "state-legislatures/chamber-count-disagrees-with-structure",
      ),
    ).toBe(true);
  });

  it("still refuses a state that compiles nothing and records no gap", () => {
    const corpus = compileStateLegislatures(
      openStateLegislatureArtifacts(lock()),
    );
    const wyoming = corpus.records.find(
      (record) => record.jurisdictionKey === "US-WY",
    ) as StateLegislatureIdentity;
    const report = validateStateLegislatureCorpus({
      corpus: corpus.corpus,
      records: corpus.records.map((record) =>
        record.jurisdictionKey === "US-WY"
          ? { ...wyoming, unresolvedGaps: [] }
          : record,
      ),
    });
    expect(
      report.findings.some(
        (finding) => finding.code === "state-legislatures/silent-omission",
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Blocker 4 — the captured bytes did not move
// ---------------------------------------------------------------------------

/** The digests recorded at the audited head, pinned here so a drift is loud. */
const AUDITED_HEAD_DIGESTS: ReadonlyMap<
  string,
  { readonly length: number; readonly sha256: string }
> = new Map([
  [
    "ak-constitution",
    {
      length: 362321,
      sha256:
        "d72b68a640262aad7c25d7906741bda4ee19aef529a3a4cb896580570d63d476",
    },
  ],
  [
    "ca-constitution-article-4",
    {
      length: 183809,
      sha256:
        "233b020b79d211bdd6e6c465c93389d7b24e7617260f08379aacb9c5b75d1123",
    },
  ],
  [
    "de-constitution-article-2",
    {
      length: 62697,
      sha256:
        "f7920b5fbae62dfb17e353d1bc088b044b1d370c5426919c9dff7f88c067dbb6",
    },
  ],
  [
    "fl-constitution",
    {
      length: 622854,
      sha256:
        "cd56710740c0ff6e7595384afd7b12745c19ee28f44abbad8a32a20e4f4d82db",
    },
  ],
  [
    "hi-constitution",
    {
      length: 236123,
      sha256:
        "d9a7b4af7ae2cc6c0ddb4ccf54e2f5d392d2962a1205dc5076e56cc793cd97e3",
    },
  ],
  [
    "id-constitution-article-3-section-2",
    {
      length: 93653,
      sha256:
        "767b379ed8a16fdd2e007bb4d688bce5b855ffcc98006e1ee84c2d84f56fdea2",
    },
  ],
  [
    "il-constitution-article-4",
    {
      length: 16462,
      sha256:
        "59c10c5dd47c9cec1a85b8793283f2b3d2cf04f4a883bcb6d8dbc16b2eb15198",
    },
  ],
  [
    "ma-constitution",
    {
      length: 458396,
      sha256:
        "d78569b99a5fb26a60c6291653389df991d9db257925958cc321de71bf8f64e6",
    },
  ],
  [
    "mn-constitution",
    {
      length: 150014,
      sha256:
        "6bfe2bc1b70379d84df07ea00d6c5c516f1ba4388bd941662c2c5c7a0b834254",
    },
  ],
  [
    "mn-statutes-2-021",
    {
      length: 61245,
      sha256:
        "40af850248d0d5cfee25cd4722d850ee29baa2e592a8d9e1bc6f44a0e4c45da4",
    },
  ],
  [
    "nc-constitution-article-2",
    {
      length: 63834,
      sha256:
        "facc48e54c1544892470d18296ed5a2b8b3e74c814d8ad471cec9876ba829bf2",
    },
  ],
  [
    "ne-constitution-article-3-section-1",
    {
      length: 30389,
      sha256:
        "4f22c94908b3bad7bde72e9c49466fbdc25092ed13450825889bd2f8fbb211dc",
    },
  ],
  [
    "ne-constitution-article-3-section-6",
    {
      length: 21905,
      sha256:
        "03a182b167c35d66ebae79f1e23a1b38c496aa690c99f99594f68865c67998c3",
    },
  ],
  [
    "nv-constitution",
    {
      length: 431607,
      sha256:
        "726067b645f47709f00c2cf23ee6a514f7fc64381fd6c1f6eb0b1f48b31c51cc",
    },
  ],
  [
    "oh-constitution-article-2",
    {
      length: 91421,
      sha256:
        "8180d526a21c7c0f68b2bfa5fe049a9e26ee929471e21318595c260d873e9608",
    },
  ],
  [
    "or-constitution",
    {
      length: 643208,
      sha256:
        "25e2dfcc84c3fbd851f6dff028abd7114888607985ea6ea74252e758bc7f3673",
    },
  ],
  [
    "va-constitution-article-4-section-3",
    {
      length: 24439,
      sha256:
        "1b8f02691393f9a5459a40f37dfd5c7f1b27b60d7cbb5c869a4c0528544fbd0f",
    },
  ],
  [
    "va-constitution-article-4-section-2",
    {
      length: 24377,
      sha256:
        "7290f58d4cc5f74d21cf6d1f326922123901286f7b39cba2bd02239c7625dd34",
    },
  ],
]);

describe("state instruments: the captured bytes are not this repository's to edit", () => {
  it("keeps all eighteen raw captures at the digests recorded before the repair", () => {
    const current = lock();
    expect(current.artifacts).toHaveLength(18);
    for (const entry of current.artifacts) {
      const pinned = AUDITED_HEAD_DIGESTS.get(entry.artifactId);
      expect(
        pinned,
        `${entry.artifactId} is not an audited artifact`,
      ).toBeDefined();
      expect(entry.bytes.sha256).toBe(pinned!.sha256);
      expect(entry.bytes.length).toBe(pinned!.length);

      const onDisk = readFileSync(resolve(REPO, entry.localPath as string));
      expect(sha256Hex(onDisk)).toBe(pinned!.sha256);
      expect(onDisk.length).toBe(pinned!.length);
    }
  });

  it("exempts only the capture directories from whitespace checking", () => {
    const attributes = readFileSync(resolve(REPO, ".gitattributes"), "utf-8");
    expect(attributes).toContain("data/source/*/raw/** -whitespace");
    // Nothing authored may be exempted along with them.
    for (const line of attributes.split("\n")) {
      if (!line.includes("-whitespace") || line.trimStart().startsWith("#")) {
        continue;
      }
      expect(line.trim()).toBe("data/source/*/raw/** -whitespace");
    }
  });
});

// ---------------------------------------------------------------------------
// The corpus itself is unchanged
// ---------------------------------------------------------------------------

describe("state instruments: the repair changed no fact", () => {
  it("still emits exactly seventy-six direct and eight derived facts", () => {
    let direct = 0;
    let derived = 0;
    for (const declaration of STATE_DECLARATIONS) {
      for (const value of allDeclared(declaration)) {
        if (!isDeclaredFact(value)) continue;
        if (value.derivation === "DIRECT") direct += 1;
        else derived += 1;
      }
    }
    expect({ direct, derived, total: direct + derived }).toEqual({
      direct: 76,
      derived: 8,
      total: 84,
    });
  });

  it("compiles every declared state with no defect at all", () => {
    const { records, defects } = normalizeDeclaredStates(
      STATE_DECLARATIONS,
      lookupForCompile(),
      STATE_LEGISLATURES_CORPUS_AS_OF,
    );
    expect(defects).toEqual([]);
    expect(records).toHaveLength(50);
  });
});
