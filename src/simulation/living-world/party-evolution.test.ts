import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { addDays } from "../dates";
import type { EntityId, World } from "../types";
import { advanceWorld, assertWorldIntegrity } from "../world";
import { partyRecords } from "../world-setup/integrity";
import {
  caucusMembership,
  nationalParties,
  projectCongress,
  publicPartyAffiliation,
} from "./congress";
import { homePartyChapters } from "./party-chapters";
import {
  PARTY_BODY_REVIEW_TRANSITION_KEY,
  PARTY_QUESTIONS,
  adoptPartyInitiative,
  affiliationAt,
  assessPartyInitiative,
  ensurePartyGoverningBodies,
  partyBodyDecisions,
  partyBodyMembers,
  partyEvolutionRecords,
  partyUnitLeaders,
  partyUnitOfficersAt,
  proposePartyInitiative,
  recordPartyBodyDecision,
  respondToPartyInitiative,
} from "./party-evolution";
import {
  organizationNameAt,
  partyColorOrder,
  partyUnitStatusAt,
} from "./party-registry";

const LONG = 900_000;

let base: World;
let playerId: EntityId;

beforeAll(() => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "world46-parties",
      startAge: 30,
      depth: "summarize-earlier-life",
    }),
  ).game!;
  base = game.world;
  playerId = game.playerPersonId;
}, LONG);

function firstHouseMember(world: World): EntityId {
  const seat = projectCongress(world)!.house.seats.find(
    (candidate) =>
      candidate.occupant.kind === "member" &&
      candidate.occupant.member.partyOrganizationId !== null,
  )!;
  return seat.occupant.kind === "member" ? seat.occupant.member.personId : "";
}

function foundParty(
  world: World,
  founder: EntityId,
  coOrganizer: EntityId,
  name: string,
  stableKey: string,
) {
  const proposed = proposePartyInitiative(world, {
    initiativeKind: "founding",
    proposerPersonId: founder,
    subjectOrganizationIds: [],
    proposedName: name,
    level: "national",
    reasonKeys: ["test:explicit-founding"],
    stableKey,
  });
  const answered = respondToPartyInitiative(proposed.world, {
    initiativeId: proposed.initiativeId,
    personId: coOrganizer,
    response: "consent",
    authority: "co-organizer",
  });
  return adoptPartyInitiative(answered, proposed.initiativeId);
}

describe("WORLD46 party organizations", () => {
  it("current openings have standing chapter bodies and a scheduled review", () => {
    const chapters = homePartyChapters(base);
    expect(chapters.length).toBeGreaterThanOrEqual(2);
    for (const chapter of chapters) {
      expect(partyBodyMembers(base, chapter.organizationId).length).toBe(5);
      expect(partyUnitLeaders(base, chapter.organizationId)).toContain(
        chapter.organizerPersonId,
      );
    }
    expect(
      base.history.futureDueItems.filter(
        (item) => item.transitionKey === PARTY_BODY_REVIEW_TRANSITION_KEY,
      ),
    ).toHaveLength(chapters.length);
    // A second call never adds another body.
    expect(ensurePartyGoverningBodies(base, playerId)).toBe(base);
  });

  it("a founding needs a consenting co-organizer; with one it creates a third party", () => {
    const member = firstHouseMember(base);
    const committee = partyBodyMembers(
      base,
      homePartyChapters(base)[0]!.organizationId,
    ).find(
      (id) =>
        !partyUnitLeaders(
          base,
          homePartyChapters(base)[0]!.organizationId,
        ).includes(id),
    )!;
    const alone = proposePartyInitiative(base, {
      initiativeKind: "founding",
      proposerPersonId: member,
      subjectOrganizationIds: [],
      proposedName: "Civic Renewal Party",
      reasonKeys: ["test:alone"],
      stableKey: "test:founding-alone",
    });
    const refused = adoptPartyInitiative(alone.world, alone.initiativeId);
    expect(refused.kind).toBe("not-met");
    expect(refused.world).toBe(alone.world);

    const oldParty = publicPartyAffiliation(base, member);
    const oldCaucus = caucusMembership(base, member);
    const result = foundParty(
      base,
      member,
      committee,
      "Civic Renewal Party",
      "test:founding",
    );
    expect(result.kind).toBe("adopted");
    const world = result.world;
    assertWorldIntegrity(world);
    const parties = nationalParties(world, []);
    expect(parties).toHaveLength(3);
    expect(parties.map((party) => party.name)).toContain("Civic Renewal Party");
    const created = result.kind === "adopted" ? result.organizationIds[0]! : "";
    expect(partyColorOrder(world).at(-1)).toBe(created);
    expect(partyColorOrder(world).slice(0, 2)).toEqual(partyColorOrder(base));

    // Leaving a party is not leaving office, and earlier days keep old labels.
    expect(publicPartyAffiliation(world, member)).toBe(created);
    expect(caucusMembership(world, member)).toBe(oldCaucus);
    const seat = projectCongress(world)!.house.seats.find(
      (candidate) =>
        candidate.occupant.kind === "member" &&
        candidate.occupant.member.personId === member,
    );
    expect(seat).toBeDefined();
    const later = advanceWorld(
      world,
      1,
      createCampaignElectionTransitionRegistry(),
    );
    expect(
      affiliationAt(later, member, world.currentDate).partyOrganizationId,
    ).toBe(created);
    expect(
      affiliationAt(later, member, addDays(world.currentDate, -1))
        .partyOrganizationId,
    ).toBe(oldParty);
    expect(
      projectCongress(later, {
        asOf: addDays(world.currentDate, -1),
      })!.house.seats.find(
        (candidate) =>
          candidate.occupant.kind === "member" &&
          candidate.occupant.member.personId === member,
      )!.occupant,
    ).toMatchObject({ member: { partyOrganizationId: oldParty } });
    const officers = partyUnitOfficersAt(world, created);
    expect(officers.map((officer) => officer.personId).sort()).toEqual(
      [member, committee].sort(),
    );
  });

  it("a split requires the proposer's actual disputed decision and a faction that elects to leave", () => {
    const chapter = homePartyChapters(base)[0]!;
    let world = base;
    for (const question of [...PARTY_QUESTIONS, ...PARTY_QUESTIONS]) {
      world = recordPartyBodyDecision(world, {
        organizationId: chapter.organizationId,
        questionKey: question.key,
      });
    }
    const decisions = partyBodyDecisions(world, chapter.organizationId);
    expect(decisions).toHaveLength(8);
    const disputed = decisions.find(
      (decision) => decision.dissentingPersonIds.length > 0,
    );
    expect(disputed).toBeDefined();
    const proposer = disputed!.dissentingPersonIds[0]!;
    const bystander = partyBodyMembers(world, chapter.organizationId).find(
      (id) => !disputed!.dissentingPersonIds.includes(id),
    )!;
    expect(() =>
      proposePartyInitiative(world, {
        initiativeKind: "split",
        proposerPersonId: bystander,
        subjectOrganizationIds: [chapter.organizationId],
        disputedDecisionIds: [disputed!.id],
        reasonKeys: ["test"],
      }),
    ).toThrow(/actually disputed/);
    const proposed = proposePartyInitiative(world, {
      initiativeKind: "split",
      proposerPersonId: proposer,
      subjectOrganizationIds: [chapter.organizationId],
      questionKey: disputed!.questionKey,
      disputedDecisionIds: [disputed!.id],
      proposedName: "Reform Caucus",
      level: "local",
      jurisdictionId: chapter.jurisdictionId,
      reasonKeys: ["test:explicit-split"],
      stableKey: "test:split",
    });
    const noFaction = adoptPartyInitiative(
      proposed.world,
      proposed.initiativeId,
    );
    expect(noFaction).toMatchObject({ kind: "not-met", reason: "no-faction" });
    const withFaction = respondToPartyInitiative(proposed.world, {
      initiativeId: proposed.initiativeId,
      personId: bystander,
      response: "elect-to-leave",
      authority: "faction-member",
    });
    const split = adoptPartyInitiative(withFaction, proposed.initiativeId);
    expect(split.kind).toBe("adopted");
    const evolution = partyEvolutionRecords(split.world).at(-1)!;
    expect(evolution.change).toBe("split-off");
    expect(evolution.fromOrganizationIds).toEqual([chapter.organizationId]);
    expect(evolution.movedPersonIds.sort()).toEqual(
      [proposer, bystander].sort(),
    );
    // The source chapter remains, without the leavers on its body.
    expect(partyUnitStatusAt(split.world, chapter.organizationId).kind).toBe(
      "active",
    );
    const remaining = partyBodyMembers(split.world, chapter.organizationId);
    expect(remaining).not.toContain(proposer);
    expect(remaining).not.toContain(bystander);
  });

  it("a merger needs every side's authorized leader; a rename and a dissolution are dated", () => {
    const member = firstHouseMember(base);
    const chapter = homePartyChapters(base)[0]!;
    const committee = partyBodyMembers(base, chapter.organizationId).filter(
      (id) => id !== chapter.organizerPersonId,
    );
    const a = foundParty(
      base,
      member,
      committee[0]!,
      "Party A",
      "test:merge-a",
    );
    if (a.kind !== "adopted") throw new Error("setup");
    const b = foundParty(
      a.world,
      committee[1]!,
      committee[2]!,
      "Party B",
      "test:merge-b",
    );
    if (b.kind !== "adopted") throw new Error("setup");
    const [partyA, partyB] = [a.organizationIds[0]!, b.organizationIds[0]!];
    const proposed = proposePartyInitiative(b.world, {
      initiativeKind: "merger",
      proposerPersonId: member,
      subjectOrganizationIds: [partyA, partyB],
      proposedName: null,
      reasonKeys: ["test:merger"],
      stableKey: "test:merger",
    });
    const oneSide = respondToPartyInitiative(proposed.world, {
      initiativeId: proposed.initiativeId,
      personId: member,
      response: "accept",
      authority: "authorized-leader",
      actingForOrganizationId: partyA,
    });
    expect(adoptPartyInitiative(oneSide, proposed.initiativeId).kind).toBe(
      "not-met",
    );
    expect(() =>
      respondToPartyInitiative(oneSide, {
        initiativeId: proposed.initiativeId,
        personId: member,
        response: "accept",
        authority: "authorized-leader",
        actingForOrganizationId: partyB,
      }),
    ).toThrow(/actual leader/);
    const bothSides = respondToPartyInitiative(oneSide, {
      initiativeId: proposed.initiativeId,
      personId: committee[1]!,
      response: "accept",
      authority: "authorized-leader",
      actingForOrganizationId: partyB,
    });
    const merged = adoptPartyInitiative(bothSides, proposed.initiativeId);
    expect(merged.kind).toBe("adopted");
    expect(partyUnitStatusAt(merged.world, partyB)).toMatchObject({
      kind: "merged",
      successorOrganizationId: partyA,
    });
    expect(publicPartyAffiliation(merged.world, committee[1]!)).toBe(partyA);
    expect(
      nationalParties(merged.world, []).map((party) => party.organizationId),
    ).not.toContain(partyB);
    expect(partyColorOrder(merged.world)).toContain(partyB);

    const today = merged.world.currentDate;
    const moved = advanceWorld(
      merged.world,
      2,
      createCampaignElectionTransitionRegistry(),
    );
    const rename = proposePartyInitiative(moved, {
      initiativeKind: "rename",
      proposerPersonId: member,
      subjectOrganizationIds: [partyA],
      proposedName: "United Renewal Party",
      reasonKeys: ["test:rename"],
    });
    const renamed = adoptPartyInitiative(
      respondToPartyInitiative(rename.world, {
        initiativeId: rename.initiativeId,
        personId: member,
        response: "accept",
        authority: "authorized-leader",
        actingForOrganizationId: partyA,
      }),
      rename.initiativeId,
    );
    expect(renamed.kind).toBe("adopted");
    expect(organizationNameAt(renamed.world, partyA)).toBe(
      "United Renewal Party",
    );
    expect(organizationNameAt(renamed.world, partyA, today)).toBe("Party A");

    const dissolve = proposePartyInitiative(renamed.world, {
      initiativeKind: "dissolution",
      proposerPersonId: member,
      subjectOrganizationIds: [partyA],
      reasonKeys: ["test:dissolution"],
    });
    const dissolved = adoptPartyInitiative(
      respondToPartyInitiative(dissolve.world, {
        initiativeId: dissolve.initiativeId,
        personId: member,
        response: "accept",
        authority: "authorized-leader",
        actingForOrganizationId: partyA,
      }),
      dissolve.initiativeId,
    );
    expect(dissolved.kind).toBe("adopted");
    expect(partyUnitStatusAt(dissolved.world, partyA).kind).toBe("dissolved");
    const record = partyEvolutionRecords(dissolved.world).at(-1)!;
    expect(record.obligations?.otherResources).toBe("none-represented");
    expect(record.obligations?.participationsEnded.length).toBeGreaterThan(0);
    // History keeps the unit; today it has no affiliates or officers.
    expect(publicPartyAffiliation(dissolved.world, member)).toBeNull();
    expect(partyUnitOfficersAt(dissolved.world, partyA)).toHaveLength(0);
    assertWorldIntegrity(dissolved.world);
  });

  it(
    "ordinary time: bodies meet quarterly, and any change carries its recorded reasons",
    () => {
      const year = advanceWorld(
        base,
        366,
        createCampaignElectionTransitionRegistry(),
      );
      const chapters = homePartyChapters(base);
      for (const chapter of chapters) {
        expect(
          partyBodyDecisions(year, chapter.organizationId).length,
        ).toBeGreaterThanOrEqual(3);
      }
      const records = partyRecords(year);
      for (const evolution of partyEvolutionRecords(year)) {
        const initiative = records.find(
          (record) => record.id === evolution.initiativeId,
        )!;
        expect(initiative.kind).toBe("party-initiative");
        if (initiative.kind !== "party-initiative") continue;
        expect(
          initiative.reasonKeys.some((key) =>
            key.startsWith("repeated-dispute:"),
          ),
        ).toBe(true);
        expect(initiative.disputedDecisionIds.length).toBeGreaterThanOrEqual(2);
      }
      console.info(
        JSON.stringify({
          decisions: partyBodyDecisions(year).length,
          evolutions: partyEvolutionRecords(year).map(
            (record) => record.change,
          ),
        }),
      );
    },
    LONG,
  );

  it("no dispute, no initiative: a member who never lost a vote stays", () => {
    const chapter = homePartyChapters(base)[0]!;
    for (const personId of partyBodyMembers(base, chapter.organizationId)) {
      expect(
        assessPartyInitiative(
          base,
          personId,
          chapter.organizationId,
          "test:none",
        ).kind,
      ).toBe("none");
    }
  });
});
