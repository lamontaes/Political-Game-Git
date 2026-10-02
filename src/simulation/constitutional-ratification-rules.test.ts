import { beforeAll, describe, expect, it, vi } from "vitest";
import research from "../../data/research/legislature/federal-amendment-ratification-rules-2026.json" with { type: "json" };
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  stateRatificationChambers,
  stateRatificationRule,
} from "./constitutional-ratification-rules";
import {
  constitutionalActions,
  constitutionalPosition,
  proposeConstitutionalMeasure,
  recordConstitutionalProposalVote,
} from "./constitutional-process";
import { addDays } from "./dates";
import { lifePlaceStateIdentities } from "./life-places";
import { recordArticleVStateMemberVote } from "./living-world/federal-reform";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "./national-election-geography";
import { ensureStateLegislatureOpening } from "./nationwide-world/state-legislature-opening";
import { SeededRng } from "./rng";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, World } from "./types";
import { seatedCongressChamber } from "./governing/congress-chambers";
import { resolveRequiredVotes } from "./legislature-rules";

const admitted = research.rows.filter((row) =>
  stateRatificationChambers(row.stateKey),
);
const pending = research.rows.filter(
  (row) => !stateRatificationChambers(row.stateKey),
);
const seed = "source-backed-ratification-bridges-20261002";
const places = lifePlaceStateIdentities();
const sampler = new SeededRng(seed);
const home = sampler.pick(places);
const newStates = admitted.filter((row) =>
  row.chambers.some((body) =>
    body.citations.some((citation) => citation.accessed === "2026-10-02"),
  ),
);
const pool = [...newStates];
const sample = Array.from(
  { length: Math.min(5, pool.length) },
  () => pool.splice(sampler.integer(0, pool.length), 1)[0]!,
);
let world: World;
let measureId: EntityId;

describe("sourced state ratification rules", () => {
  it("accounts for all 50 states and six nonratifying starting jurisdictions", () => {
    expect(admitted.length + pending.length).toBe(50);
    expect(research.nonRatifying).toHaveLength(6);
    expect(places).toHaveLength(56);
    for (const key of ["US-AK", "US-AR", "US-CO", "US-DE", "US-ME", "US-ND"])
      expect(stateRatificationChambers(key)).not.toBeNull();
    for (const row of pending)
      expect(stateRatificationChambers(row.stateKey)).toBeNull();
    for (const row of research.nonRatifying)
      expect(stateRatificationChambers(row.stateKey)).toBeNull();
  });

  for (const row of pending)
    it.todo(
      `${row.state} needs an admitted paired rule or implemented condition`,
    );

  it.each(admitted)("returns each sourced chamber's rule for $state", (row) => {
    expect(stateRatificationChambers(row.stateKey)).toEqual(
      row.chambers.map((body) => body.chamber),
    );
    for (const body of row.chambers) {
      const rule = stateRatificationRule(row.stateKey, body.chamber)!;
      expect(rule.threshold.source?.verification).toBe(
        "notes" in body &&
          typeof body.notes === "string" &&
          body.notes.startsWith("INFERRED:")
          ? "partial"
          : "verified",
      );
      expect(rule.quorum.countedAgainst).toBe("members-elected");
      expect(rule.threshold.source?.sourceUrl).toMatch(/^https:\/\//);
      if (row.stateKey === "US-NJ")
        expect(rule.quorum.source.citation).toContain("quorum");
      if ("ratificationBridge" in body)
        expect(rule.quorum.source.citation).toBe(
          body.citations[body.ratificationBridge.quorumCitationIndex]!.text,
        );
      expect(stateRatificationRule(row.stateKey, "absent-chamber")).toBeNull();
    }
  });

  it("retains distinct sourced elected and present-and-voting denominators", () => {
    for (const body of ["house", "senate"]) {
      const elected = stateRatificationRule("US-MN", body)!.threshold;
      const voting = stateRatificationRule("US-MT", body)!.threshold;
      expect(elected.countedAgainst).toBe("members-elected");
      expect(elected.source.verification).toBe("partial");
      expect(elected.source.note).toContain("INFERRED:");
      expect(voting.countedAgainst).toBe("members-voting");
      expect(resolveRequiredVotes(elected, 80).requiredVotes).toBe(41);
      expect(resolveRequiredVotes(voting, 40).requiredVotes).toBe(21);
    }
  });

  it("retains the ratification instrument's fixed affirmative-vote floor", () => {
    const rule = stateRatificationRule("US-NJ", "senate")!.threshold;
    expect(rule.minimumVotes).toBe(21);
    expect(resolveRequiredVotes(rule, 38).requiredVotes).toBe(21);
    expect(resolveRequiredVotes(rule, 40).requiredVotes).toBe(21);
  });

  for (const kind of ["ratification-specific", "bill-rule-by-reference"]) {
    const sourceRow = admitted.find((row) =>
      row.chambers.some((body) => body.ruleKind === kind),
    )!;
    const sourceBody = sourceRow.chambers.find(
      (body) => body.ruleKind === kind,
    )!;

    it.each([
      { field: "text" as const, value: "  ", reason: "blank quote" },
      {
        field: "url" as const,
        value: "http://example.org",
        reason: "insecure URL",
      },
      {
        field: "url" as const,
        value: "https://",
        reason: "missing source host",
      },
      {
        field: "accessed" as const,
        value: "2026-02-30",
        reason: "invalid source date",
      },
    ])(`refuses a ${kind} with a $reason`, ({ field, value }) => {
      const row = structuredClone(sourceRow);
      const body = row.chambers.find(
        (chamber) => chamber.chamber === sourceBody.chamber,
      )!;
      let index = 0;
      if ("ratificationBridge" in body) {
        const bridge = body.ratificationBridge;
        if (
          !bridge ||
          typeof bridge !== "object" ||
          !("thresholdCitationIndex" in bridge) ||
          typeof bridge.thresholdCitationIndex !== "number"
        )
          throw Error("Expected the source bridge's threshold citation.");
        index = bridge.thresholdCitationIndex;
      }
      body.citations[index]![field] = value;
      const lookup = vi.spyOn(research.rows, "find").mockReturnValue(row);
      try {
        expect(stateRatificationRule(row.stateKey, body.chamber)).toBeNull();
        expect(stateRatificationChambers(row.stateKey)).toBeNull();
      } finally {
        lookup.mockRestore();
      }
      expect(
        stateRatificationRule(sourceRow.stateKey, sourceBody.chamber),
      ).not.toBeNull();
    });

    it.each(["0/0", "1/0", "-1/2", "3/2", "1.5/2", "1/9007199254740992"])(
      `refuses a ${kind} with malformed threshold or quorum %s`,
      (fraction) => {
        for (const field of ["threshold", "quorum"] as const) {
          const row = structuredClone(sourceRow);
          const body = row.chambers.find(
            (chamber) => chamber.chamber === sourceBody.chamber,
          )!;
          body[field].fraction = fraction;
          const lookup = vi.spyOn(research.rows, "find").mockReturnValue(row);
          try {
            expect(
              stateRatificationRule(row.stateKey, body.chamber),
            ).toBeNull();
          } finally {
            lookup.mockRestore();
          }
        }
      },
    );
  }

  it("validates the independent quorum citation without weakening the vote source", () => {
    const sourceRow = admitted.find((row) =>
      row.chambers.some((body) => "citationIndex" in body.quorum),
    )!;
    const row = structuredClone(sourceRow);
    const body = row.chambers.find(
      (chamber) => "citationIndex" in chamber.quorum,
    )!;
    if (
      !("citationIndex" in body.quorum) ||
      typeof body.quorum.citationIndex !== "number"
    )
      throw Error("Expected sourced quorum.");
    body.citations[body.quorum.citationIndex]!.text = "";
    const lookup = vi.spyOn(research.rows, "find").mockReturnValue(row);
    try {
      expect(stateRatificationRule(row.stateKey, body.chamber)).toBeNull();
    } finally {
      lookup.mockRestore();
    }
    expect(
      stateRatificationRule(sourceRow.stateKey, body.chamber),
    ).not.toBeNull();
  });
});

beforeAll(() => {
  expect(sample).toHaveLength(5);
  world = ensureNationalElectionJurisdiction(
    smallWorld({ place: home.jurisdictionKey, seed, offices: ["congress"] })
      .world,
  );
  const propositionId = world.policyCatalog.propositionOrder.find((id) => {
    const proposition = world.policyCatalog.propositions[id]!;
    return (
      world.policyCatalog.issues[proposition.issueId]?.levels?.includes(
        "federal",
      ) && (proposition.principles?.length ?? 0) > 0
    );
  });
  if (!propositionId)
    throw Error("The actual catalog needs a lawful proposition.");
  world = proposeConstitutionalMeasure(world, {
    stableKey: "sourced-bridge-proposal",
    processKind: "federal-amendment",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    jurisdictionKey: "US",
    designation: "Supplied policy amendment",
    shortTitle: "A catalog policy amendment",
    text: "A controlled proposal for actual sourced state chamber votes.",
    textVersion: "v1",
    sponsoringAuthority: "The Congress of the United States",
    sponsorPersonId: null,
    ratificationMode: "state-legislatures",
    deadlineAt: addDays(world.currentDate, 365),
    delayedOperativeAt: null,
    ruleDelta: { kind: "policy-provision", propositionId, stance: "adopt" },
    ordinaryMeasureId: null,
  });
  measureId = world.history.constitutionalMeasures!.at(-1)!.id;
  // The fixture supplies congressional admission on the actual roster;
  // every state member's disposition remains decided by the shared caller.
  for (const body of ["house", "senate"] as const) {
    const members = seatedCongressChamber(world, body)!.body.members;
    world = recordConstitutionalProposalVote(
      world,
      measureId,
      body,
      members.map((member) => ({
        memberKey: member.memberKey,
        personId: member.personId,
        disposition: "yea",
        reason: "fixture:supplied-congressional-admission",
      })),
      members.length,
      {
        method: "authored-fixture",
        note: "Supplied actual congressional approval; state member votes are unsupplied.",
        sourceEntityIds: [],
      },
    );
  }
  expect(constitutionalPosition(world, measureId).phase).toBe("ratification");
});

describe("new sourced rules reach actual state ratification", () => {
  it.each(sample)("records separate actual chamber votes in $state", (row) => {
    if (world.control.kind !== "person")
      throw Error("The fixture needs a subject.");
    const actual = ensureStateLegislatureOpening(
      world,
      world.control.personId,
      row.stateKey.slice(3),
    );
    const next = recordArticleVStateMemberVote(actual, measureId, row.stateKey);
    expect(next).not.toBeNull();
    if (!next) throw Error("Expected an actual sourced state vote.");
    const action = constitutionalActions(next, measureId).find(
      (entry) =>
        entry.detail.kind === "state-ratification" &&
        entry.detail.stateKey === row.stateKey,
    );
    if (action?.detail.kind !== "state-ratification")
      throw Error("Expected recorded chamber receipts.");
    expect(action.detail.chamberVotes?.map((body) => body.bodyKey)).toEqual(
      row.chambers.map((body) => body.chamber),
    );
    for (const body of action.detail.chamberVotes!) {
      expect(body.vote.purpose).toBe("constitutional-ratification");
      expect(
        body.vote.dispositions.every(
          (member) => member.personId && member.reason,
        ),
      ).toBe(true);
      expect(body.sourceRecordIds).toContain(body.organizationId);
    }
    expect(action.detail.approved).toBe(
      action.detail.chamberVotes!.every(
        (body) => body.vote.outcome === "passed",
      ),
    );
    const resumed = deserializeWorld(serializeWorld(next));
    expect(constitutionalActions(resumed, measureId)).toEqual(
      constitutionalActions(next, measureId),
    );
    expect(
      recordArticleVStateMemberVote(resumed, measureId, row.stateKey),
    ).toBe(resumed);
    console.info(
      "[actual-sourced-state-ratification]",
      JSON.stringify({
        seed,
        state: row.stateKey,
        approved: action.detail.approved,
        chambers: action.detail.chamberVotes!.map((body) => ({
          body: body.bodyKey,
          outcome: body.vote.outcome,
          tally: body.vote.tally,
          requiredVotes: body.vote.requiredVotes,
          denominator: body.vote.denominatorValue,
          threshold: body.vote.thresholdLabel,
          reasons: body.vote.dispositions.slice(0, 3).map((member) => ({
            personId: member.personId,
            disposition: member.disposition,
            reason: member.reason,
          })),
        })),
      }),
    );
  });

  it("reports the seed, newly admitted sample and remaining source refusals", () => {
    expect(newStates.length).toBeGreaterThanOrEqual(5);
    console.info(
      "[sourced-ratification-bridges]",
      JSON.stringify({
        seed,
        home: home.jurisdictionKey,
        startingPlaces: places.length,
        admitted: admitted.map((row) => row.stateKey),
        sample: sample.map((row) => row.stateKey),
        pending: pending.map((row) => row.stateKey),
      }),
    );
  });
});
