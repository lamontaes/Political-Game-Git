import { describe, expect, it } from "vitest";

import { explicitNewGameSetup } from "../../presentation/new-game-geography";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import {
  ARTICLE_V_STATE_KEYS,
  constitutionalActions,
  constitutionalPosition,
} from "../constitutional-process";
import {
  addDays,
  daysBetween,
  makeIsoDate,
  simulationMomentAtLocalTime,
} from "../dates";
import {
  cancelFutureDueItem,
  createFutureTransitionHandlerRegistry,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import { lifePlaces, stateJurisdictionForKey } from "../life-places";
import { congressSeats } from "../living-world/congress-seats";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { stateCandidacyPack } from "../candidacy-packs";
import {
  stateLegislatureEstablished,
  stateLegislators,
} from "../nationwide-world/state-legislature-opening";
import { createFormationContext, recordPrinciples } from "../politics";
import { SeededRng } from "../rng";
import type { EntityId, World } from "../types";
import { assertWorldIntegrity, withWorldIntegrityDeferred } from "../world";
import {
  applyArticleV,
  ARTICLE_V_CONVENTION,
  ARTICLE_V_PROFILE,
  ARTICLE_V_REVIEW,
  ARTICLE_V_STATE_ACTION,
  articleVConventionHandler,
  articleVReviewHandler,
  articleVStateActionHandler,
  CONVENTION_APPLICATION_EVENT,
  CONVENTION_CALL_EVENT,
  CONVENTION_RESCISSION_EVENT,
  conventionApplications,
} from "./article-v";
import { seatedCongressChamber } from "./congress-chambers";
import { lawInForce, statuteAnswer } from "./law-in-force";
import { ensureOfficeholderPrinciples } from "./officeholder-principles";

/** A life in a place drawn by the seed from every place a life can start. */
function openingWorld(seed: string): World {
  const place = new SeededRng(seed).pick(lifePlaces());
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...explicitNewGameSetup({ placeKey: place.key, seed }),
      startAge: 40,
    }),
  ).game!;
  return openOrdinaryLife(game.world, game.playerPersonId);
}

/** A question the national government decides that principles bear on. */
function federalQuestion(world: World): EntityId {
  const catalog = world.policyCatalog;
  return catalog.propositionOrder.find((id) => {
    const proposition = catalog.propositions[id]!;
    return (
      (catalog.issues[proposition.issueId]?.levels ?? []).includes("federal") &&
      (proposition.principles?.length ?? 0) > 0 &&
      lawInForce(world, NATIONAL_ELECTION_JURISDICTION.id, id)?.answer !== "yes"
    );
  })!;
}

/** A federal question exactly one principle bears on. */
/** A federal question not yet law, the fewest principles bearing on it. */
function singlePrincipleQuestion(world: World): EntityId {
  const catalog = world.policyCatalog;
  const bearings = (id: EntityId) =>
    catalog.propositions[id]!.principles?.length ?? 0;
  return catalog.propositionOrder
    .filter((id) => {
      const proposition = catalog.propositions[id]!;
      return (
        (catalog.issues[proposition.issueId]?.levels ?? []).includes(
          "federal",
        ) &&
        bearings(id) > 0 &&
        lawInForce(world, NATIONAL_ELECTION_JURISDICTION.id, id)?.answer !==
          "yes"
      );
    })
    .sort((a, b) => bearings(a) - bearings(b))[0]!;
}

/**
 * Every named person comes to hold the principles behind the policy, firmly
 * by default; `against` has them hold the opposite.
 */
function favor(
  world: World,
  personIds: readonly EntityId[],
  propositionId: EntityId,
  options: {
    readonly conviction?: "tentative" | "settled";
    readonly against?: boolean;
  } = {},
): World {
  const conviction = options.conviction ?? "settled";
  let next = ensureOfficeholderPrinciples(world, personIds);
  const bearings = next.policyCatalog.propositions[propositionId]!.principles!;
  for (const personId of new Set(personIds)) {
    next = recordPrinciples(
      next,
      bearings.map((bearing) => ({
        stableKey: `b27-test:${personId}:${bearing.principleId}:${next.currentDate}:${conviction}:${options.against ? "against" : "for"}`,
        personId,
        principleId: bearing.principleId,
        formedAt: next.currentDate,
        stance:
          (bearing.bearing === "consistent-with") !== Boolean(options.against)
            ? ("endorses" as const)
            : ("rejects" as const),
        strength: conviction === "settled" ? 1 : 0.25,
        conviction,
        flexibility:
          conviction === "settled" ? ("firm" as const) : ("open" as const),
        qualification: null,
        formation: createFormationContext("other:drawn-before-play", {
          note: "Test fixture.",
        }),
        supersedesPrincipleRecordId:
          next.history.principles
            .filter(
              (row) =>
                row.personId === personId &&
                row.principleId === bearing.principleId,
            )
            .at(-1)?.id ?? null,
      })),
    );
  }
  return next;
}

function members(world: World, chamber: "house" | "senate") {
  return seatedCongressChamber(world, chamber)!.body.members.filter(
    (member) =>
      member.personId &&
      !(
        world.control.kind === "person" &&
        world.control.personId === member.personId
      ),
  );
}

/** The sitting members of every legislature seated in the world. */
function seatedLegislators(world: World): readonly EntityId[] {
  return ARTICLE_V_STATE_KEYS.flatMap((key) => {
    const pack = stateCandidacyPack(key);
    return pack && stateLegislatureEstablished(world, pack.packId)
      ? stateLegislators(world, pack.packId).map((m) => m.personId)
      : [];
  });
}

function passTo(world: World, date: string): World {
  return passArticleVDays(
    world,
    Math.max(1, daysBetween(world.currentDate, makeIsoDate(date)) + 1),
  );
}

/**
 * An authored constitutional-calendar setup, not a whole-country aging test.
 * Keep the real due-item dispatcher, member decisions and dated state actions.
 * Unrelated opening calendar entries are explicitly cancelled through their
 * writer, so no missing handler or overdue item is hidden by dropping records.
 */
function passArticleVDays(world: World, days: number): World {
  const through = addDays(world.currentDate, days);
  const registry = createFutureTransitionHandlerRegistry([
    [ARTICLE_V_REVIEW, articleVReviewHandler],
    [ARTICLE_V_CONVENTION, articleVConventionHandler],
    [ARTICLE_V_STATE_ACTION, articleVStateActionHandler],
  ]);
  let next = withWorldIntegrityDeferred(() => {
    let prepared = applyArticleV(addDays(world.currentDate, -1), world);
    const latest = new Map(
      prepared.history.futureDueItemStates.map((state) => [
        state.dueItemId,
        state,
      ]),
    );
    for (const due of prepared.history.futureDueItems) {
      if (
        registry.get(due.transitionKey) ||
        latest.get(due.id)?.status !== "scheduled"
      )
        continue;
      prepared = cancelFutureDueItem(prepared, {
        stableKey: `article-v-test:cancel:${due.id}`,
        dueItemId: due.id,
        effectiveAt: prepared.currentDate,
        reasonKey: "test:isolated-constitutional-calendar",
        context: "Authored test setup isolates the constitutional calendar.",
      });
    }
    return prepared;
  });
  assertWorldIntegrity(next);
  next = resolveFutureDueItemsThrough(next, through, registry);
  const result: World = {
    ...next,
    currentDate: through,
    currentMoment: simulationMomentAtLocalTime({
      date: through,
      minuteOfDay: world.currentMoment.minuteOfDay,
      timeZone: world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
    }),
  };
  assertWorldIntegrity(result);
  return result;
}

function nextReview(world: World): string {
  const year = Number(world.currentDate.slice(0, 4));
  const day = `${year}-${ARTICLE_V_PROFILE.reviewMonthDay}`;
  return day > world.currentDate
    ? day
    : `${year + 1}-${ARTICLE_V_PROFILE.reviewMonthDay}`;
}

describe("Build 27 step 5: amending the Constitution on any subject", () => {
  it("Congress proposes what two-thirds of both houses believe in, the states ratify, and the law in force follows", () => {
    let world = openingWorld("b27-article-v-congress");
    const question = federalQuestion(world);
    const everyone = [
      ...members(world, "house"),
      ...members(world, "senate"),
    ].map((member) => member.personId!);
    world = favor(world, [...everyone, ...seatedLegislators(world)], question);
    const reviewDay = nextReview(world);
    world = passTo(world, reviewDay);
    const measure = world.history.constitutionalMeasures!.find(
      (row) =>
        row.ruleDelta.kind === "policy-provision" &&
        row.ruleDelta.propositionId === question,
    )!;
    expect(measure.sponsoringAuthority).toBe(
      "The Congress of the United States",
    );
    const votes = constitutionalActions(world, measure.id).filter(
      (action) => action.detail.kind === "proposal-vote",
    );
    expect(votes).toHaveLength(2);
    for (const action of votes)
      if (action.detail.kind === "proposal-vote")
        // Each member's own reason is on the roll call.
        expect(
          action.detail.vote.dispositions.every(
            (row) => row.disposition === "absent" || row.reason,
          ),
        ).toBe(true);
    expect(constitutionalPosition(world, measure.id).phase).toBe(
      "ratification",
    );
    // Not yet law before the states act.
    // Any state reads the U.S. Constitution; one is drawn by the seed.
    const place = stateJurisdictionForKey(
      new SeededRng("b27-article-v-congress:place").pick(ARTICLE_V_STATE_KEYS),
    )!.id;
    expect(lawInForce(world, place, question)?.level).not.toBe(
      "federal-constitution",
    );
    world = passArticleVDays(
      world,
      ARTICLE_V_PROFILE.stateActionWindowDays + 2,
    );
    const position = constitutionalPosition(world, measure.id);
    expect(position.phase).toBe("operative");
    expect(position.ratifiedStates.length).toBeGreaterThanOrEqual(38);
    expect(lawInForce(world, place, question)).toMatchObject({
      answer: "yes",
      level: "federal-constitution",
      measureId: measure.id,
    });
    // A legislature reads the question as closed to statute: a bill against
    // it could never take effect, so no member files one.
    expect(statuteAnswer(lawInForce(world, place, question))).toBe("closed");
  }, 1_800_000);

  it("34 state legislatures call a convention that Congress would not, and 38 are still needed to ratify", () => {
    let world = openingWorld("b27-article-v-convention");
    const question = federalQuestion(world);
    // Representatives of the 34 states with the most House seats favor it
    // (each has three or more, so they outnumber its two senators); no
    // senator does, so Congress never reaches two-thirds.
    const big = new Set(
      Object.entries(
        congressSeats()
          .filter((seat) => seat.chamberKey === "us-house")
          .reduce<Record<string, number>>((counts, seat) => {
            counts[seat.stateUsps] = (counts[seat.stateUsps] ?? 0) + 1;
            return counts;
          }, {}),
      )
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 34)
        .map(([usps]) => usps),
    );
    const house = members(world, "house").filter((member) =>
      big.has(/:us-house:([A-Z]{2})-/.exec(member.memberKey)?.[1] ?? ""),
    );
    const legislatures = ARTICLE_V_STATE_KEYS.filter((key) =>
      big.has(key.slice(3)),
    ).flatMap((key) => {
      const pack = stateCandidacyPack(key);
      return pack && stateLegislatureEstablished(world, pack.packId)
        ? stateLegislators(world, pack.packId).map((m) => m.personId)
        : [];
    });
    world = favor(
      world,
      [...house.map((member) => member.personId!), ...legislatures],
      question,
    );
    world = passTo(world, nextReview(world));
    const applying = conventionApplications(world, question);
    expect(applying.length).toBeGreaterThanOrEqual(
      ARTICLE_V_PROFILE.applicationsToCall,
    );
    expect(
      world.history.events.filter(
        (event) =>
          event.type === CONVENTION_APPLICATION_EVENT &&
          event.tags.includes(`proposition:${question}`),
      ).length,
    ).toBe(applying.length);
    const call = world.history.events.find(
      (event) =>
        event.type === CONVENTION_CALL_EVENT &&
        event.tags.includes(`proposition:${question}`),
    )!;
    expect(call.summary).toContain("Congress called a convention");
    // No proposal from Congress itself.
    expect(
      (world.history.constitutionalMeasures ?? []).some(
        (row) =>
          row.ruleDelta.kind === "policy-provision" &&
          row.ruleDelta.propositionId === question &&
          row.proposedBy !== "convention",
      ),
    ).toBe(false);
    world = passArticleVDays(world, ARTICLE_V_PROFILE.conventionDays + 1);
    const measure = world.history.constitutionalMeasures!.find(
      (row) =>
        row.proposedBy === "convention" &&
        row.ruleDelta.kind === "policy-provision" &&
        row.ruleDelta.propositionId === question,
    )!;
    expect(constitutionalPosition(world, measure.id).phase).toBe(
      "ratification",
    );
    world = passArticleVDays(
      world,
      ARTICLE_V_PROFILE.stateActionWindowDays + 2,
    );
    const position = constitutionalPosition(world, measure.id);
    // The states whose legislatures favor it ratify; it becomes law only if
    // that reaches 38 of 50.
    expect([...position.ratifiedStates].sort()).toEqual([...applying].sort());
    expect(position.operativeAt !== null).toBe(
      position.ratifiedStates.length >= 38,
    );
  }, 1_800_000);

  it("Congress does not propose again a question it rejected while nothing has changed", () => {
    let world = openingWorld("b27-article-v-repeat");
    const question = singlePrincipleQuestion(world);
    const everyone = [
      ...members(world, "house"),
      ...members(world, "senate"),
    ].map((member) => member.personId!);
    // Every member leans toward it, but only tentatively: not enough to clear
    // the bar of amending the Constitution.
    world = favor(world, everyone, question, { conviction: "tentative" });
    world = passTo(world, nextReview(world));
    const proposals = (w: World) =>
      (w.history.constitutionalMeasures ?? []).filter(
        (row) =>
          row.ruleDelta.kind === "policy-provision" &&
          row.ruleDelta.propositionId === question &&
          row.proposedBy !== "convention",
      );
    expect(proposals(world)).toHaveLength(1);
    expect(constitutionalPosition(world, proposals(world)[0]!.id).phase).toBe(
      "rejected",
    );
    // A year later the same members would vote the same way: no new proposal.
    world = passTo(world, nextReview(world));
    expect(proposals(world)).toHaveLength(1);
  }, 1_800_000);

  it("a state's convention application stands until its legislature rescinds it", () => {
    let world = openingWorld("b27-article-v-rescind");
    const question = federalQuestion(world);
    // Ten states' voices favor the question: too few to call a convention.
    const chosen = ARTICLE_V_STATE_KEYS.slice(0, 10);
    const voices = (keys: readonly string[]) =>
      keys.flatMap((key) => {
        const usps = key.slice(3);
        const pack = stateCandidacyPack(key);
        const legislators =
          pack && stateLegislatureEstablished(world, pack.packId)
            ? stateLegislators(world, pack.packId).map((m) => m.personId)
            : [];
        const delegation = [
          ...members(world, "house"),
          ...members(world, "senate"),
        ]
          .filter((member) =>
            new RegExp(`:us-(house|senate):${usps}[-:]`).test(member.memberKey),
          )
          .map((member) => member.personId!);
        return [...legislators, ...delegation];
      });
    world = favor(world, voices(chosen), question);
    world = passTo(world, nextReview(world));
    const applied = conventionApplications(world, question);
    for (const key of chosen) expect(applied).toContain(key);
    // Three of those legislatures come to oppose it, and rescind.
    const turned = chosen.slice(0, 3);
    world = favor(world, voices(turned), question, { against: true });
    world = passTo(world, nextReview(world));
    const standing = conventionApplications(world, question);
    for (const key of turned) expect(standing).not.toContain(key);
    for (const key of chosen.slice(3)) expect(standing).toContain(key);
    const rescissions = world.history.events.filter(
      (event) =>
        event.type === CONVENTION_RESCISSION_EVENT &&
        event.tags.includes(`proposition:${question}`),
    );
    expect(
      rescissions
        .map((event) => event.tags.find((t) => t.startsWith("state:")))
        .sort(),
    ).toEqual(turned.map((key) => `state:${key}`).sort());
  }, 1_800_000);
});
