import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { createWorld, advanceWorld, assertWorldIntegrity } from "./world";
import { serializeWorld, deserializeWorld } from "./serialization";
import {
  ARTICLE_V_STATE_KEYS,
  constitutionalPosition,
  constitutionalProposalRuleAt,
  proposeConstitutionalMeasure,
  recordConstitutionalProposalVote,
  recordArticleVRatification,
  recordCaliforniaRatification,
  recordCarsonCharterEnactment,
  recordConstitutionalPosition,
  constitutionalMemberBody,
} from "./constitutional-process";
import { createDemoWorld } from "./demo";
import { resolveRequiredVotes } from "./legislature-rules";
import { offerFloorAmendment } from "./legislation";
import type { Jurisdiction, World } from "./types";
import type { ProposeConstitutionalMeasureInput } from "./constitutional-process";

const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Explicitly authored rollcall fixture, not NPC decisions or an observed election.",
  sourceEntityIds: [],
};
function setup(key = "US-CA") {
  const slug =
    key === "US"
      ? "united-states"
      : key === "US-CA"
        ? "california"
        : "us-nv-carson-city";
  const id = createStableId("jurisdiction", key);
  const j: Jurisdiction = {
    id,
    slug,
    name: key,
    kind: "state",
    parentName: null,
    provenance: {
      asOf: makeIsoDate("2026-09-13"),
      source: "Authored identity fixture",
      jurisdiction: id,
      status: "placeholder",
    },
  };
  return createWorld({
    seed: "S30-K explicit geography",
    currentDate: makeIsoDate("2026-09-13"),
    people: [],
    jurisdictions: [j],
  });
}
function proposal(
  world: World,
  overrides: Partial<ProposeConstitutionalMeasureInput> = {},
) {
  const federal =
    world.jurisdictions[world.jurisdictionOrder[0]!]!.slug === "united-states";
  return proposeConstitutionalMeasure(world, {
    stableKey: `proposal:${world.history.constitutionalMeasures?.length ?? 0}`,
    jurisdictionId: world.jurisdictionOrder[0]!,
    jurisdictionKey: federal ? "US" : "US-CA",
    processKind: federal ? "federal-amendment" : "state-amendment",
    designation: "Authored constitutional process fixture",
    shortTitle: "Proposal threshold fixture",
    text: "For subsequent proposals the required fraction shall be three fourths. This is fictional test text.",
    textVersion: "v1",
    sponsoringAuthority: federal ? "Congress" : "California Legislature",
    sponsorPersonId: null,
    ratificationMode: federal ? "state-legislatures" : "statewide-electors",
    deadlineAt: null,
    delayedOperativeAt: null,
    ruleDelta: {
      kind: "proposal-threshold",
      numerator: 3,
      denominatorParts: 4,
    },
    ordinaryMeasureId: null,
    ...overrides,
  });
}
function id(w: World) {
  return w.history.constitutionalMeasures!.at(-1)!.id;
}
function votes(n: number, yes: number, present = n) {
  return Array.from({ length: n }, (_, i) => ({
    memberKey: `member:${i}`,
    personId: null,
    disposition: (i >= present ? "absent" : i < yes ? "yea" : "nay") as
      "yea" | "nay" | "absent",
  }));
}
function considered(w: World) {
  const federal =
    w.history.constitutionalMeasures!.at(-1)!.processKind ===
    "federal-amendment";
  w = recordConstitutionalProposalVote(
    w,
    id(w),
    federal ? "house" : "assembly",
    votes(federal ? 435 : 80, federal ? 290 : 54),
    federal ? 435 : 80,
    AUTHORED,
  );
  return recordConstitutionalProposalVote(
    w,
    id(w),
    "senate",
    votes(federal ? 100 : 40, federal ? 67 : 27),
    federal ? 100 : 40,
    AUTHORED,
  );
}
function ratify(w: World, count = 38) {
  for (const stateKey of ARTICLE_V_STATE_KEYS.slice(0, count))
    w = recordArticleVRatification(w, id(w), {
      kind: "state-ratification",
      stateKey,
      body: "state-legislature",
      approved: true,
      authenticationKey: `certified:${stateKey}`,
    });
  return w;
}
function date(w: World, d: string) {
  return advanceWorld(
    w,
    Math.round((Date.parse(d) - Date.parse(w.currentDate)) / 86400000),
  );
}

describe("S30-K constitutional process", () => {
  it("only writes the controlled person's position and does not infer a proposing seat", () => {
    const demo = createDemoWorld("constitutional-person-role-proof");
    const ca = setup();
    let w = createWorld({
      seed: demo.seed,
      currentDate: ca.currentDate,
      people: demo.personOrder.map((id) => demo.people[id]!),
      jurisdictions: [
        ...demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
        ca.jurisdictions[ca.jurisdictionOrder[0]!]!,
      ],
      control: { kind: "person", personId: demo.personOrder[0]! },
    });
    w = proposal(w, { jurisdictionId: ca.jurisdictionOrder[0]! });
    expect(
      constitutionalMemberBody(
        w,
        demo.personOrder[0]!,
        ca.jurisdictionOrder[0]!,
      ),
    ).toBe(null);
    expect(() =>
      recordConstitutionalPosition(w, id(w), demo.personOrder[1]!, "undecided"),
    ).toThrow(/controlled/);
    w = recordConstitutionalPosition(
      w,
      id(w),
      demo.personOrder[0]!,
      "undecided",
    );
    expect(constitutionalPosition(w, id(w)).phase).toBe("consideration");
    expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  });
  it("rejects forged ratified rule metadata and preserves the sourced threshold", () => {
    const w = ratify(considered(proposal(setup("US"))));
    const forged = structuredClone(w);
    Object.assign(forged.history.constitutionalRuleVersions![0]!.threshold, {
      minimumVotes: 1,
    });
    expect(() => assertWorldIntegrity(forged)).toThrow(/rule version/);
  });

  it("distinguishes California membership from federal present denominators, requires quorum", () => {
    let ca = proposal(setup());
    expect(() =>
      recordConstitutionalProposalVote(
        ca,
        id(ca),
        "assembly",
        votes(80, 40, 60),
        80,
        AUTHORED,
      ),
    ).not.toThrow();
    ca = recordConstitutionalProposalVote(
      ca,
      id(ca),
      "assembly",
      votes(80, 40, 60),
      80,
      AUTHORED,
    );
    expect(constitutionalPosition(ca, id(ca)).phase).toBe("rejected");
    const us = proposal(setup("US"));
    const next = recordConstitutionalProposalVote(
      us,
      id(us),
      "house",
      votes(435, 200, 300),
      435,
      AUTHORED,
    );
    expect(next.history.constitutionalActions!.at(-1)!.detail).toMatchObject({
      vote: {
        denominatorKind: "members-present",
        denominatorValue: 300,
        requiredVotes: 200,
        outcome: "passed",
      },
    });
    expect(() =>
      recordConstitutionalProposalVote(
        us,
        id(us),
        "house",
        votes(435, 200, 200),
        435,
        AUTHORED,
      ),
    ).toThrow(/quorum/);
  });
  it("rejects wrong bodies, duplicate chamber and mismatched geography", () => {
    let w = proposal(setup());
    expect(() =>
      recordConstitutionalProposalVote(
        w,
        id(w),
        "house",
        votes(80, 80),
        80,
        AUTHORED,
      ),
    ).toThrow(/Wrong/);
    w = recordConstitutionalProposalVote(
      w,
      id(w),
      "assembly",
      votes(80, 54),
      80,
      AUTHORED,
    );
    expect(() =>
      recordConstitutionalProposalVote(
        w,
        id(w),
        "assembly",
        votes(80, 54),
        80,
        AUTHORED,
      ),
    ).toThrow(/duplicate/);
    expect(() => proposal(setup("US"), { jurisdictionKey: "US-CA" })).toThrow(
      /jurisdiction/,
    );
  });
  it("requires 38 distinct states; no DC, statewide ballot, presidential approval or veto", () => {
    let w = considered(proposal(setup("US")));
    expect(() =>
      recordArticleVRatification(w, id(w), {
        kind: "state-ratification",
        stateKey: "US-DC",
        body: "state-legislature",
        approved: true,
        authenticationKey: "DC",
      }),
    ).toThrow(/DC/);
    expect(() =>
      recordArticleVRatification(w, id(w), {
        kind: "state-ratification",
        stateKey: "US-CA",
        body: "state-convention",
        approved: true,
        authenticationKey: "CA",
      }),
    ).toThrow(/body/);
    w = ratify(w, 37);
    expect(constitutionalPosition(w, id(w)).phase).toBe("ratification");
    expect(() =>
      recordArticleVRatification(w, id(w), {
        kind: "state-ratification",
        stateKey: ARTICLE_V_STATE_KEYS[0]!,
        body: "state-legislature",
        approved: true,
        authenticationKey: "repeat",
      }),
    ).toThrow(/Duplicate/);
    w = recordArticleVRatification(w, id(w), {
      kind: "state-ratification",
      stateKey: ARTICLE_V_STATE_KEYS[37]!,
      body: "state-legislature",
      approved: true,
      authenticationKey: "38",
    });
    expect(constitutionalPosition(w, id(w))).toMatchObject({
      phase: "operative",
      effectiveAt: "2026-09-13",
    });
    expect(w.history.executiveDispositions ?? []).toHaveLength(0);
    expect(w.history.legislativeAmendments ?? []).toHaveLength(0);
    assertWorldIntegrity(w);
  });
  it("California statement filing plus five days, delayed operation, actual later rule change and historical retention", () => {
    let w = considered(
      proposal(setup(), { delayedOperativeAt: makeIsoDate("2026-10-01") }),
    );
    const first = id(w);
    w = recordCaliforniaRatification(w, first, {
      kind: "statewide-vote",
      yes: 100,
      no: 99,
      electionAt: makeIsoDate("2026-09-13"),
      statementFiledAt: makeIsoDate("2026-09-13"),
    });
    expect(constitutionalPosition(w, first)).toMatchObject({
      effectiveAt: "2026-09-18",
      operativeAt: "2026-10-01",
      phase: "ratified",
    });
    expect(
      resolveRequiredVotes(
        constitutionalProposalRuleAt(w, "US-CA", "2026-09-30"),
        80,
      ).requiredVotes,
    ).toBe(54);
    w = deserializeWorld(serializeWorld(w));
    w = date(w, "2026-10-01");
    expect(
      resolveRequiredVotes(
        constitutionalProposalRuleAt(w, "US-CA", w.currentDate),
        80,
      ).requiredVotes,
    ).toBe(60);
    expect(
      resolveRequiredVotes(
        constitutionalProposalRuleAt(w, "US-CA", "2026-09-13"),
        80,
      ).requiredVotes,
    ).toBe(54);
    w = proposal(w);
    w = recordConstitutionalProposalVote(
      w,
      id(w),
      "assembly",
      votes(80, 54),
      80,
      AUTHORED,
    );
    expect(constitutionalPosition(w, id(w)).phase).toBe("rejected");
    expect(w.history.constitutionalMeasures![0]!.textVersion).toBe("v1");
    expect(w.history.constitutionalMeasures![1]!.proposalRule!.numerator).toBe(
      3,
    );
    assertWorldIntegrity(w);
  });
  it("rejects statewide tie, premature ballot and Article V/state ballot confusion", () => {
    const w = considered(proposal(setup()));
    const ballot = {
      kind: "statewide-vote" as const,
      yes: 10,
      no: 10,
      electionAt: makeIsoDate("2026-09-13"),
      statementFiledAt: makeIsoDate("2026-09-13"),
    };
    const rejected = recordCaliforniaRatification(w, id(w), ballot);
    expect(constitutionalPosition(rejected, id(w)).phase).toBe("rejected");
    expect(rejected.history.constitutionalRuleVersions ?? []).toHaveLength(0);
    expect(() =>
      recordCaliforniaRatification(proposal(setup()), id(w), ballot),
    ).toThrow(/ratification/);
    const us = considered(proposal(setup("US")));
    expect(() => recordCaliforniaRatification(us, id(us), ballot)).toThrow(
      /California/,
    );
    expect(() =>
      recordArticleVRatification(w, id(w), {
        kind: "state-ratification",
        stateKey: "US-CA",
        body: "state-legislature",
        approved: true,
        authenticationKey: "CA",
      }),
    ).toThrow(/statewide/);
  });
  it("enforces established proposal deadlines without changing law; survives repeated reload", () => {
    let w = considered(
      proposal(setup("US"), { deadlineAt: makeIsoDate("2026-09-14") }),
    );
    w = date(w, "2026-09-15");
    expect(constitutionalPosition(w, id(w)).phase).toBe("expired");
    expect(() => ratify(w, 1)).toThrow(/expired/);
    expect(constitutionalProposalRuleAt(w, "US", w.currentDate).numerator).toBe(
      2,
    );
    expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  });
  it("refuses ordinary amendments, unsupported convention kinds, forged votes and rule deltas", () => {
    const w = proposal(setup());
    const random = createStableId("legislative-measure", "ordinary");
    expect(() =>
      recordConstitutionalProposalVote(
        w,
        random,
        "assembly",
        votes(80, 80),
        80,
        AUTHORED,
      ),
    ).toThrow(/Ordinary bill/);
    expect(() =>
      offerFloorAmendment(w, {
        stableKey: "bill-amendment",
        measureId: id(w),
      } as Parameters<typeof offerFloorAmendment>[1]),
    ).toThrow(/not found/);
    expect(() =>
      proposal(setup(), { processKind: "convention" as never }),
    ).toThrow(/kind/);
    const voted = recordConstitutionalProposalVote(
      w,
      id(w),
      "assembly",
      votes(80, 54),
      80,
      AUTHORED,
    );
    const forged = structuredClone(voted);
    const detail = forged.history.constitutionalActions!.at(-1)!.detail;
    if (detail.kind === "proposal-vote")
      Object.assign(detail.vote, { requiredVotes: 1 });
    expect(() => assertWorldIntegrity(forged)).toThrow(/requiredVotes/);
  });
  it("keeps older optional-family saves valid and text-only effects truthful", () => {
    const old = setup();
    expect(deserializeWorld(serializeWorld(old))).toEqual(old);
    const w = ratify(
      considered(
        proposal(setup("US"), {
          ruleDelta: {
            kind: "text-only",
            unsupportedEffect:
              "No modeled consumer exists for this open-ended text.",
          },
        }),
      ),
    );
    expect(constitutionalPosition(w, id(w)).modeledEffect).toBe(false);
    expect(w.history.constitutionalRuleVersions ?? []).toHaveLength(0);
    assertWorldIntegrity(w);
  });
  it("Carson cannot be amended by local adoption and needs actual Nevada legislative identity", () => {
    const w = setup("us-nv-carson-city");
    expect(() =>
      proposeConstitutionalMeasure(w, {
        ...w.history.constitutionalMeasures?.[0],
        stableKey: "carson",
        jurisdictionId: w.jurisdictionOrder[0]!,
        jurisdictionKey: "us-nv-carson-city",
        processKind: "municipal-charter",
        designation: "Charter fixture",
        shortTitle: "Charter",
        text: "Fictional charter text",
        textVersion: "v1",
        sponsoringAuthority: "Nevada Legislature",
        sponsorPersonId: null,
        ratificationMode: "nevada-enactment",
        deadlineAt: null,
        delayedOperativeAt: null,
        ruleDelta: {
          kind: "text-only",
          unsupportedEffect: "No modeled open-ended effect",
        },
        ordinaryMeasureId: null,
      }),
    ).toThrow(/Nevada legislative measure/);
    expect(() =>
      recordCarsonCharterEnactment(
        w,
        createStableId("constitutional-measure", "no-act"),
      ),
    ).toThrow();
  });
});
