import { describe, expect, it } from "vitest";

import {
  createLegislativeScenario,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { currentMeasureProvisions } from "../simulation/legislative-politics";
import { BillConfigurationError } from "../simulation/legislation-drafting";
import { MeasureBundleError } from "../simulation/legislation-bundle";
import { assertDraftLineageIntegrity } from "../simulation/legislation-draft-lineage";
import {
  fileBundleDraft,
  recompileSavedBundle,
  type FileBundleComponentInput,
} from "./legislation-bundle-docket";
import { fileDraft } from "./legislation-docket";

/**
 * NATIONWIDE1 section 2: a component that acts on law that already exists.
 *
 * Until now every component of a measure added text. These cover the other two
 * things a measure does — amend and repeal — and the check that makes them
 * safe: a component names the exact revision of the provision it was written
 * against, and filing refuses if that text has moved since. The alternative,
 * applying an amendment to whatever is there now, silently rewrites language
 * its author never read, which is the failure this whole record design exists
 * to prevent.
 *
 * Cross-references are here too, because a reference that dangles is the same
 * class of defect: a measure that points at a section it does not carry.
 */

interface Fixture {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly jurisdictionId: EntityId;
}

function kentucky(): Fixture {
  const scenario = createLegislativeScenario("kentucky");
  return {
    world: scenario.world,
    playerPersonId: scenario.playerPersonId,
    jurisdictionId: (scenario.world.history.legislativeMeasures ?? [])[0]!
      .jurisdictionId,
  };
}

function component(
  componentKey: string,
  familyKey: string,
  variantKey: string,
  extra: Partial<FileBundleComponentInput> = {},
): FileBundleComponentInput {
  return {
    componentKey,
    familyKey,
    variantKey,
    subject: "transit",
    ...extra,
  };
}

/**
 * Files an ordinary single-family bill first, so there is real law on this
 * docket for a later measure to amend. Its authority key is the docket key the
 * docket itself hands out, not a string invented here.
 */
function withExistingLaw() {
  const fixture = kentucky();
  const existing = fileDraft(fixture.world, {
    scenarioKey: "kentucky",
    playerPersonId: fixture.playerPersonId,
    jurisdictionId: fixture.jurisdictionId,
    familyKey: "transit-access",
    variantKey: "unserved-county-formula",
  });
  const provisions = currentMeasureProvisions(
    existing.world,
    existing.bill.measureId,
  );
  return {
    ...fixture,
    world: existing.world,
    bill: existing.bill,
    authorityKey: `docket:${existing.bill.docketKey}`,
    provisions,
  };
}

function fileAmending(
  base: ReturnType<typeof withExistingLaw>,
  components: readonly FileBundleComponentInput[],
) {
  return fileBundleDraft(base.world, {
    scenarioKey: "kentucky",
    playerPersonId: base.playerPersonId,
    jurisdictionId: base.jurisdictionId,
    subjectRule: "unrestricted",
    components,
  });
}

describe("a component that amends or repeals says what it acts on", () => {
  it("refuses to amend without naming an authority", () => {
    const base = withExistingLaw();
    expect(() =>
      fileAmending(base, [
        component("edit", "assistance-eligibility", "raise-income-limit", {
          operation: {
            kind: "replace",
            targets: [
              {
                provisionKey: "eligibility",
                expectedRevisionId: base.provisions[0]!.id,
              },
            ],
          },
        }),
      ]),
    ).toThrow(/names no authority to amend/);
  });

  it("refuses to repeal without naming a provision", () => {
    const base = withExistingLaw();
    expect(() =>
      fileAmending(base, [
        component("strike", "program-sunset", "repeal-outright", {
          authorityKey: base.authorityKey,
          operation: { kind: "repeal", targets: [] },
        }),
      ]),
    ).toThrow(MeasureBundleError);
  });

  it("refuses two components acting on the same provision of the same Act", () => {
    const base = withExistingLaw();
    const target = {
      provisionKey: base.provisions[0]!.provisionKey,
      expectedRevisionId: base.provisions[0]!.id,
    };
    expect(
      () =>
        fileAmending(base, [
          component("edit", "assistance-eligibility", "raise-income-limit", {
            authorityKey: base.authorityKey,
            operation: { kind: "replace", targets: [target] },
          }),
          component("strike", "program-sunset", "repeal-outright", {
            authorityKey: base.authorityKey,
            operation: { kind: "repeal", targets: [target] },
          }),
        ]),
      // Amending and repealing the same section would have the measure saying
      // both "this now reads as follows" and "this is gone" about one text.
    ).toThrow(/does not say what becomes of that text/);
  });
});

describe("the exact revision an amendment was written against", () => {
  it("files when the named revision is the text actually in force", () => {
    const base = withExistingLaw();
    const filed = fileAmending(base, [
      component("edit", "assistance-eligibility", "raise-income-limit", {
        authorityKey: base.authorityKey,
        operation: {
          kind: "replace",
          targets: [
            {
              provisionKey: base.provisions[0]!.provisionKey,
              expectedRevisionId: base.provisions[0]!.id,
            },
          ],
        },
      }),
    ]);
    expect(filed.bundle.components[0]!.operation.kind).toBe("replace");
    expect(() => assertDraftLineageIntegrity(filed.world)).not.toThrow();
  });

  it("refuses a component written against a version that has been superseded", () => {
    const base = withExistingLaw();
    const stale = "legislative-provision:a-version-that-is-not-in-force";
    expect(() =>
      fileAmending(base, [
        component("edit", "assistance-eligibility", "raise-income-limit", {
          authorityKey: base.authorityKey,
          operation: {
            kind: "replace",
            targets: [
              {
                provisionKey: base.provisions[0]!.provisionKey,
                expectedRevisionId: stale as EntityId,
              },
            ],
          },
        }),
      ]),
    ).toThrow(/written against an earlier version/);
  });

  it("refuses a provision the Act being amended does not carry", () => {
    const base = withExistingLaw();
    expect(() =>
      fileAmending(base, [
        component("edit", "assistance-eligibility", "raise-income-limit", {
          authorityKey: base.authorityKey,
          operation: {
            kind: "replace",
            targets: [
              {
                provisionKey: "no-such-section",
                expectedRevisionId: base.provisions[0]!.id,
              },
            ],
          },
        }),
      ]),
    ).toThrow(/does not currently carry/);
  });

  it("says plainly that a standing statute's version cannot be checked", () => {
    const base = withExistingLaw();
    expect(
      () =>
        fileAmending(base, [
          component("edit", "assistance-eligibility", "raise-income-limit", {
            authorityKey: "standing:rural-transit-assistance",
            operation: {
              kind: "replace",
              targets: [
                {
                  provisionKey: "eligibility",
                  expectedRevisionId: base.provisions[0]!.id,
                },
              ],
            },
          }),
        ]),
      // Refused rather than waved through: this world records no provisions
      // for a standing statute, so there is no revision to have checked.
    ).toThrow(BillConfigurationError);
  });

  it("writes nothing when a target revision is stale", () => {
    const base = withExistingLaw();
    const before = serializeWorld(base.world);
    expect(() =>
      fileAmending(base, [
        component("edit", "assistance-eligibility", "raise-income-limit", {
          authorityKey: base.authorityKey,
          operation: {
            kind: "replace",
            targets: [
              {
                provisionKey: base.provisions[0]!.provisionKey,
                expectedRevisionId: "legislative-provision:stale" as EntityId,
              },
            ],
          },
        }),
      ]),
    ).toThrow();
    expect(serializeWorld(base.world)).toBe(before);
  });

  it("remembers what it amended, and at which version, across a save", () => {
    const base = withExistingLaw();
    const target = base.provisions[0]!;
    const filed = fileAmending(base, [
      component("edit", "assistance-eligibility", "raise-income-limit", {
        authorityKey: base.authorityKey,
        operation: {
          kind: "replace",
          targets: [
            {
              provisionKey: target.provisionKey,
              expectedRevisionId: target.id,
            },
          ],
        },
      }),
    ]);
    const reloaded = deserializeWorld(serializeWorld(filed.world));
    const reread = recompileSavedBundle(reloaded, filed.bill);
    if ("unavailable" in reread) throw new Error(reread.unavailable);
    const operation = reread.components[0]!.operation;
    expect(operation.kind).toBe("replace");
    if (operation.kind === "replace") {
      expect(operation.targets).toEqual([
        { provisionKey: target.provisionKey, expectedRevisionId: target.id },
      ]);
    }
  });
});

describe("a reference either resolves or the measure is refused", () => {
  it("carries a reference from one component to another, namespaced both ends", () => {
    const base = withExistingLaw();
    const filed = fileAmending(base, [
      component("routes", "transit-access", "unserved-county-formula"),
      component("reporting", "agency-reporting", "annual-legislative-report", {
        subject: "administration",
      }),
    ]);
    const routeSection =
      filed.bundle.components[0]!.draft.clauses[0]!.provisionKey;
    const reportSection =
      filed.bundle.components[1]!.draft.clauses[0]!.provisionKey;

    const withReference = fileAmending(base, [
      component("routes", "transit-access", "unserved-county-formula"),
      component("reporting", "agency-reporting", "annual-legislative-report", {
        subject: "administration",
        crossReferences: [
          {
            fromProvisionKey: reportSection,
            toComponentKey: "routes",
            toProvisionKey: routeSection,
          },
        ],
      }),
    ]);
    const resolved = withReference.bundle.components.find(
      (part) => part.componentKey === "reporting",
    )!.crossReferences;
    expect(resolved).toEqual([
      {
        fromProvisionKey: `reporting:${reportSection}`,
        toProvisionKey: `routes:${routeSection}`,
        toComponentKey: "routes",
        toAuthorityKey: null,
      },
    ]);
  });

  it("refuses a reference to a component the measure does not carry", () => {
    const base = withExistingLaw();
    const probe = fileAmending(base, [
      component("routes", "transit-access", "unserved-county-formula"),
    ]);
    const section = probe.bundle.components[0]!.draft.clauses[0]!.provisionKey;
    expect(() =>
      fileAmending(base, [
        component("routes", "transit-access", "unserved-county-formula", {
          crossReferences: [
            {
              fromProvisionKey: section,
              toComponentKey: "nowhere",
              toProvisionKey: section,
            },
          ],
        }),
      ]),
    ).toThrow(
      /refers to component 'nowhere', which this measure does not carry/,
    );
  });

  it("refuses a reference to a section the target component does not state", () => {
    const base = withExistingLaw();
    const probe = fileAmending(base, [
      component("routes", "transit-access", "unserved-county-formula"),
      component("reporting", "agency-reporting", "annual-legislative-report", {
        subject: "administration",
      }),
    ]);
    const section = probe.bundle.components[1]!.draft.clauses[0]!.provisionKey;
    expect(() =>
      fileAmending(base, [
        component("routes", "transit-access", "unserved-county-formula"),
        component(
          "reporting",
          "agency-reporting",
          "annual-legislative-report",
          {
            subject: "administration",
            crossReferences: [
              {
                fromProvisionKey: section,
                toComponentKey: "routes",
                toProvisionKey: "no-such-section",
              },
            ],
          },
        ),
      ]),
    ).toThrow(/which that component does not state/);
  });

  it("refuses a reference from a provision the component does not carry", () => {
    const base = withExistingLaw();
    expect(() =>
      fileAmending(base, [
        component("routes", "transit-access", "unserved-county-formula", {
          crossReferences: [
            {
              fromProvisionKey: "not-a-section-of-this-component",
              toAuthorityKey: "standing:rural-transit-assistance",
              toProvisionKey: "eligibility",
            },
          ],
        }),
      ]),
    ).toThrow(
      /states a reference from its 'not-a-section-of-this-component' provision/,
    );
  });
});
