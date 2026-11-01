/**
 * Organizations that endorse a candidate and send volunteers (pool item
 * campaign-like-real-races, phase A; owner, Oct 29: "she was working with the
 * Democratic Socialists of America... then her campaign gained steam"), in a
 * place drawn from all 56 on a seed nobody chose (GOLDEN_PATH_SEED pins one).
 *
 * A town holds a cause group on one policy question, written the way the
 * drives engine's founding and joining write it: the founder's drive from an
 * event they lived through, the group's organization on that topic, each
 * member's membership naming their drive, and the member's tie to the
 * founder. Two candidates file in the same race, one for the group's side of
 * the question and one against. On the campaign engine's own turn (its
 * module calendar, no hand call), the group's founder weighs both by the one
 * endorsement rule: the group backs the candidate who agrees, writes the
 * endorsement record once, says it in public, reaches its members and asks
 * each to volunteer, and at least one says yes by their own reasons. No
 * endorsement goes to the candidate the group disagrees with.
 *
 * A group speaks only for its stance: where no candidate's platform takes up
 * its question, or one takes it up only against it, its speaker's friendship
 * with a candidate never turns into the group's backing. A person may still
 * back a friend whose platform they do not share, and that yes is kept as the
 * tie it is, never as agreement.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { closenessBetween } from "./closeness";
import { decisionLean } from "./trait-decisions";
import { setKeepEveryonesWhy } from "./why-kept";
import type { CoreAPI, CoreEventInput, CoreState, PersonState } from "./types";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openRecord } from "./modules/record";
import {
  ballot,
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "./modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  askForEndorsement,
  campaignFor,
  endorsementsOf,
  openCampaigns,
  organizedGroupsIn,
  parsePlatform,
  type CauseRow,
  type EndorsementRow,
} from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { agreementWith, viewOn, viewsModule } from "./modules/views";
import {
  campaignParameter,
  personLean,
  PLATFORM_QUESTIONS,
} from "./campaign-views";

// Keeps every reached member's recorded cause, not only the player's circle's.
setKeepEveryonesWhy(true);

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256")
    .update(`campaign-group-endorsements:${Date.now()}`)
    .digest("hex");

const age = (p: Readonly<PersonState>, date: string) =>
  Number(date.slice(0, 4)) - Number(p.birthDate.slice(0, 4));

function world(salt: string) {
  const place = drawPlace(runSeed, salt);
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: START,
      minimumPeople: 300,
    }),
    { modules: [viewsModule] },
  );
  openLaws(core);
  openOffices(core, place.seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openRecord(core);
  return {
    core,
    api: coreAPI(core),
    where: `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`,
  };
}

/** The campaign engine's record of the town: where it is and how it leans. */
const townRecord = (api: CoreAPI) =>
  api.moduleState(CAMPAIGNS_MODULE_ID).table("town").get("town") as unknown as {
    townPlaceId: string;
    lean: number;
  };
const townOf = (api: CoreAPI) => townRecord(api).townPlaceId;

/**
 * The stance a group's endorsement should name, read here from the group's
 * stance and the campaign's platform rows: of the platform questions the
 * group holds a position on and agrees with the candidate on (both
 * positions on one side), the one where the product of the two is largest,
 * ties to the lower question id, with the group's own position on it.
 */
function stanceEndorsedOn(
  api: CoreAPI,
  organizationId: string,
  filingId: string,
): { question: string; position: number } | null {
  const group = organizedGroupsIn(api, townOf(api)).find(
    (g) => g.organizationId === organizationId,
  );
  if (!group) return null;
  const held = new Map(group.stance.map((s) => [s.question, s.position]));
  const agreed = campaignFor(api, filingId)
    .platform.flatMap((plank) => {
      const own = held.get(plank.question);
      return own !== undefined && own * plank.position > 0
        ? [{ question: plank.question, own, product: own * plank.position }]
        : [];
    })
    .sort(
      (a, b) => b.product - a.product || (a.question < b.question ? -1 : 1),
    );
  return agreed[0]
    ? { question: agreed[0].question, position: agreed[0].own }
    : null;
}

/** A person's own endorsement event names no group's stance. */
function expectNoStance(event: CoreEventInput | undefined, where: string) {
  expect(event, where).toBeDefined();
  expect(event!.facts?.organizationId, where).toBeUndefined();
  expect(event!.facts, where).not.toHaveProperty("stanceQuestion");
  expect(event!.facts, where).not.toHaveProperty("stancePosition");
}

const weeklyWork = (core: CoreState, id: string) =>
  [...(core.work.commitmentsByPerson.get(id) ?? [])]
    .map((c) => core.work.commitments.get(c)?.expectedWeeklyMinutes ?? 0)
    .reduce((a, b) => a + b, 0);

/**
 * The group's question and side, and the residents who would found and join
 * it: the question on which the town's adults with no work hours hold the
 * firmest views on one side (a cause group forms where people care), its
 * firmest holders as members, the firmest of all as founder.
 */
function causeOf(api: CoreAPI, core: CoreState) {
  const town = townOf(api);
  const free = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        age(p, core.date) >= 18 &&
        weeklyWork(core, p.id) === 0,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  let best: {
    question: string;
    side: number;
    holders: { p: PersonState; view: number }[];
  } | null = null;
  for (const question of PLATFORM_QUESTIONS)
    for (const side of [1, -1]) {
      const holders = free
        .map((p) => ({
          p,
          view:
            side *
            viewOn(
              api,
              p.id,
              question,
              personLean(core.people, p, townRecord(api).lean),
            ),
        }))
        .filter((row) => row.view > 0)
        .sort((a, b) => b.view - a.view || a.p.id.localeCompare(b.p.id))
        .slice(0, 6);
      const firmness = holders.reduce((sum, row) => sum + row.view, 0);
      if (
        holders.length >= campaignParameter("groupFoundingMembers") &&
        (!best ||
          firmness > best.holders.reduce((sum, row) => sum + row.view, 0))
      )
        best = { question, side, holders };
    }
  return best;
}

/** The cause group, written as the drives engine's founding and joining write it. */
function foundGroup(
  api: CoreAPI,
  cause: NonNullable<ReturnType<typeof causeOf>>,
): { organizationId: string; founderId: string; memberIds: string[] } {
  const town = townOf(api);
  const [founder, ...joiners] = cause.holders.map((row) => row.p);
  const desiredChange = cause.side > 0 ? "enact" : "repeal";
  const driveFor = (person: PersonState) => {
    const eventId = `fixture:cause-told:${person.id}`;
    api.emit({
      id: eventId,
      date: api.state.date,
      kind: "cause.shared",
      personIds: [person.id],
      placeId: town,
      topic: cause.question,
      desiredChange,
      source: {
        tag: "ESTIMATED",
        asOf: api.state.date,
        citation: "Test fixture: a cause told to a resident",
        estimatedFrom: "the drives engine's cause-shared rule",
      },
    });
    const driveId = `cause:${cause.question}`;
    api.updateDrive(person.id, {
      id: driveId,
      kind: "cause",
      sourceEventId: eventId,
      topic: cause.question,
      desiredChange,
      strength: 0.8,
    });
    return driveId;
  };
  const organizationId = `organization:cause-group:${founder!.id}:cause:${cause.question}`;
  api.addOrganization({
    id: organizationId,
    placeId: town,
    name: organizationId,
    kind: "cause-group",
    topic: cause.question,
    liquidMinor: 0,
    source: {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: "Test fixture: a cause group founded by a resident's drive",
      estimatedFrom: "the drives engine's found-cause-group act",
    },
  });
  api.join(founder!.id, organizationId, driveFor(founder!));
  for (const joiner of joiners) {
    api.join(joiner.id, organizationId, driveFor(joiner));
    api.relationship(
      joiner.id,
      founder!.id,
      "group",
      api.parameter("relationContactGain"),
    );
  }
  return {
    organizationId,
    founderId: founder!.id,
    memberIds: [founder!.id, ...joiners.map((p) => p.id)],
  };
}

type Cause = NonNullable<ReturnType<typeof causeOf>>;

/** The group's question, one candidate for its side and one against. */
const forAndAgainst = (cause: Cause): [string[], string[]] => [
  [`${cause.question}=${cause.side}`],
  [`${cause.question}=${-cause.side}`],
];

/**
 * Two adults filed in the first contest that takes them both, on the two
 * platforms given (by default one for the group's side, one against).
 */
function twoCandidates(
  api: CoreAPI,
  core: CoreState,
  cause: Cause,
  members: ReadonlySet<string>,
  platforms: [string[], string[]] = forAndAgainst(cause),
): { agrees: FilingRow; disagrees: FilingRow } | null {
  const founder = core.people.get(cause.holders[0]!.p.id)!;
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        age(p, core.date) >= 35 &&
        !members.has(p.id) &&
        !founder.knownIds.has(p.id) &&
        !founder.familyIds.has(p.id),
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  for (const contest of openContests(api)) {
    const filed: FilingRow[] = [];
    for (const adult of adults) {
      const result = fileCandidacy(api, {
        personId: adult.id,
        contestId: contest.id,
        platform: platforms[filed.length]!,
      });
      if (
        result.status === "refused" ||
        !["petitioning", "on-ballot"].includes(result.filing.status ?? "")
      )
        continue;
      filed.push(result.filing);
      if (filed.length === 2)
        return { agrees: filed[0]!, disagrees: filed[1]! };
    }
  }
  return null;
}

function setUp(
  platformsOf: (cause: Cause) => [string[], string[]] = forAndAgainst,
) {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const w = world(`group-endorsement:${attempt}`);
    const cause = causeOf(w.api, w.core);
    if (!cause) {
      tried.push(
        `${w.where}: no question with enough free residents on one side`,
      );
      continue;
    }
    const group = foundGroup(w.api, cause);
    const pair = twoCandidates(
      w.api,
      w.core,
      cause,
      new Set(group.memberIds),
      platformsOf(cause),
    );
    if (!pair) {
      tried.push(`${w.where}: no two candidates for one contest`);
      continue;
    }
    return { ...w, cause, group, pair };
  }
  throw new Error(
    `no drawn place suited the case in 8 draws (run seed ${runSeed}): ${tried.join("; ")}`,
  );
}

describe("organizations that endorse and send volunteers", () => {
  it("a cause group backs the candidate who agrees on its campaign turn, says so in public, and its members volunteer", () => {
    const { core, api, where, cause, group, pair } = setUp();
    const town = townOf(api);
    // The one read-only view of the town's organizations holds the group.
    const seen = organizedGroupsIn(api, town).find(
      (g) => g.organizationId === group.organizationId,
    );
    expect(seen, where).toBeDefined();
    expect(seen!.kind).toBe("cause-group");
    expect(seen!.speakerId).toBe(group.founderId);
    expect([...seen!.memberIds].sort()).toEqual([...group.memberIds].sort());
    expect(seen!.stance).toEqual([
      { question: cause.question, position: cause.side },
    ]);
    // Anything said in public about the race, as any engine hears it, with
    // the stance each group's endorsement should name, read the day it is said.
    const said: CoreEventInput[] = [];
    const stanceSaid = new Map<
      string,
      { question: string; position: number } | null
    >();
    api.subscribeEvents(
      "test:campaign-endorsed",
      ["campaign-endorsed"],
      (_api, event) => {
        said.push(event);
        const org = event.facts?.organizationId;
        if (org)
          stanceSaid.set(
            event.id,
            stanceEndorsedOn(api, org, event.facts!.filingId!),
          );
      },
    );
    // The campaign engine's turn comes on its own calendar.
    advanceCore(
      core,
      addDays(makeIsoDate(core.date), campaignParameter("campaignTurnDays")),
    );
    const rows = endorsementsOf(api, pair.agrees.id).filter(
      (row) => row.organizationId === group.organizationId,
    );
    expect(rows.length, where).toBe(1);
    const row: EndorsementRow = rows[0]!;
    expect(row.id).toBe(
      `endorsement:${pair.agrees.id}:${group.organizationId}`,
    );
    expect(row.answer).toBe("yes");
    expect(row.reason).toBe("agrees");
    expect(row.speakerId).toBe(group.founderId);
    expect(row.candidateId).toBe(pair.agrees.personId);
    expect(row.askerId).toBeNull();
    expect(row.agreement).toBe(1);
    expect(row.rivalFilingId).not.toBeNull();
    expect(row.backing).toBeGreaterThan(row.rivalBacking!);
    // Said in public, by record id, naming the group and its speaker.
    const logged = said.find((e) => e.id === `campaign-endorsed:${row.id}`);
    expect(logged, `${where}: the endorsement's public event`).toBeDefined();
    expect(logged!.publicRecord).toBe(true);
    expect(logged!.personIds).toContain(group.founderId);
    expect(logged!.facts).toMatchObject({
      endorsementId: row.id,
      filingId: pair.agrees.id,
      candidateId: pair.agrees.personId,
      contestId: pair.agrees.contestId,
      organizationId: group.organizationId,
      speakerId: group.founderId,
    });
    // Every group's endorsement names the stance it stands on: the group's
    // own position on the platform question it agrees with the candidate on
    // most, on its record and in its public event.
    const groupSaid = said.filter((e) => e.facts?.organizationId);
    expect(groupSaid.length, where).toBeGreaterThan(0);
    const named: string[] = [];
    for (const event of groupSaid) {
      const expected = stanceSaid.get(event.id) ?? null;
      expect(expected, `${where}: ${event.id} agrees on a question`).not.toBe(
        null,
      );
      expect(event.facts!.stanceQuestion, `${where}: ${event.id}`).toBe(
        expected!.question,
      );
      expect(event.facts!.stancePosition, `${where}: ${event.id}`).toBe(
        String(expected!.position),
      );
      const kept = endorsementsOf(api, event.facts!.filingId!).find(
        (r) => r.id === event.facts!.endorsementId,
      );
      expect(kept?.stance, `${where}: ${event.id}`).toEqual(expected);
      named.push(
        `${event.facts!.endorsementId} stands on ${event.facts!.stanceQuestion}=${event.facts!.stancePosition}`,
      );
    }
    expect(row.stance).toEqual({
      question: cause.question,
      position: cause.side,
    });
    console.log(`${where}: group endorsements: ${named.join("; ")}`);
    // Every other member heard it as the group's endorsement, from its
    // speaker (a party chapter that also backed the candidate reaches its own
    // members the same way, under its chair's name).
    const heard = (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("causes")
        .query("byCandidate", [pair.agrees.personId]) as unknown as CauseRow[]
    ).filter(
      (c) => c.act === "group-endorsement" && c.actorId === group.founderId,
    );
    const others = group.memberIds.filter((id) => id !== group.founderId);
    expect([...new Set(heard.map((c) => c.voterId))].sort()).toEqual(
      others.sort(),
    );
    expect(row.reached).toBe(others.length);
    // At least one member gave their evenings, by their own reasons.
    const volunteers = campaignFor(api, pair.agrees.id).volunteerIds;
    const fromGroup = row.volunteerIds;
    expect(
      fromGroup.length,
      `${where}: volunteers from the group`,
    ).toBeGreaterThan(0);
    for (const id of fromGroup) {
      expect(group.memberIds).toContain(id);
      expect(volunteers).toContain(id);
    }
    // No endorsement goes to the candidate the group disagrees with.
    expect(
      endorsementsOf(api, pair.disagrees.id).filter(
        (r) => r.organizationId === group.organizationId,
      ),
      where,
    ).toEqual([]);
    // A group backs one candidate in a race, once: another turn writes no second row.
    advanceCore(
      core,
      addDays(makeIsoDate(core.date), campaignParameter("campaignTurnDays")),
    );
    expect(
      [pair.agrees.id, pair.disagrees.id].flatMap((id) =>
        endorsementsOf(api, id).filter(
          (r) => r.organizationId === group.organizationId,
        ),
      ),
    ).toHaveLength(1);
    console.log(
      `${where}: ${group.organizationId} on ${cause.question} (${cause.side > 0 ? "for" : "against"}) endorsed ${pair.agrees.id}; ${row.reached} members reached, ${fromGroup.length} volunteered`,
    );
  });

  it("a person a candidate asks leaves an answer record, a refusal as well as a yes", () => {
    const { core, api, where, pair } = setUp();
    const said: CoreEventInput[] = [];
    api.subscribeEvents(
      "test:campaign-endorsed",
      ["campaign-endorsed"],
      (_api, event) => {
        said.push(event);
      },
    );
    const candidate = core.people.get(pair.disagrees.personId)!;
    const asked = [...candidate.familyIds, ...candidate.knownIds]
      .filter((id) => core.people.get(id)?.alive)
      .sort()
      .slice(0, 5);
    expect(asked.length, where).toBeGreaterThan(0);
    const answers = asked.map((id) => ({
      id,
      yes: askForEndorsement(api, pair.disagrees.id, id),
    }));
    const rows = endorsementsOf(api, pair.disagrees.id).filter(
      (row) => row.organizationId === null,
    );
    for (const { id, yes } of answers) {
      const row = rows.find((r) => r.speakerId === id);
      expect(row, `${where}: ${id} asked`).toBeDefined();
      expect(row!.id).toBe(`endorsement:${pair.disagrees.id}:${id}`);
      expect(row!.askerId).toBe(pair.disagrees.personId);
      expect(row!.answer).toBe(yes ? "yes" : "no");
      // A person's own word stands on no group's stance.
      expect(row!.stance).toBeNull();
      if (yes)
        expectNoStance(
          said.find((e) => e.id === `campaign-endorsed:${row!.id}`),
          `${where}: ${row!.id}`,
        );
      expect([
        "agrees",
        "close-tie",
        "disagrees",
        "prefers-rival",
        "declines",
      ]).toContain(row!.reason);
      expect(["agrees", "close-tie"].includes(row!.reason)).toBe(yes);
      // A yes is agreement only where they agree; else it is their tie.
      if (row!.reason === "agrees") expect(row!.agreement).toBeGreaterThan(0);
      if (row!.reason === "close-tie")
        expect(row!.agreement).toBeLessThanOrEqual(0);
      // A refusal for a rival names a rival standing in the same race whom
      // they back at all.
      if (row!.reason === "prefers-rival") {
        expect(row!.rivalFilingId).not.toBeNull();
        expect(row!.rivalFilingId).not.toBe(pair.disagrees.id);
        expect(row!.rivalBacking).toBeGreaterThanOrEqual(row!.backing);
        expect(row!.rivalBacking).toBeGreaterThan(0);
      }
    }
  });

  it("a group never backs its speaker's friend on a platform that leaves its cause out or goes against it, and a person backing a friend is kept as the tie", () => {
    // One candidate on a question the group holds nothing on; the other
    // takes up the group's question, a little against it.
    const { core, api, where, cause, group, pair } = setUp((c) => [
      [`${PLATFORM_QUESTIONS.find((q) => q !== c.question)!}=1`],
      [`${c.question}=${-c.side / 10}`],
    ]);
    const tieWeight = campaignParameter("endorsementTieWeight");
    const town = townOf(api);
    const said: CoreEventInput[] = [];
    api.subscribeEvents(
      "test:campaign-endorsed",
      ["campaign-endorsed"],
      (_api, event) => {
        said.push(event);
      },
    );
    const field = ballot(api, pair.agrees.contestId).filter(
      (f) => f.filedOn <= core.date,
    );
    // The group's speaker becomes close to both candidates.
    for (const filing of [pair.agrees, pair.disagrees])
      api.relationship(group.founderId, filing.personId, "contact", 5000);
    for (const filing of [pair.agrees, pair.disagrees])
      expect(
        closenessBetween(core, group.founderId, filing.personId),
        where,
      ).toBeGreaterThan(0.5);
    // A resident who does not share the second candidate's platform, close
    // to them, with no tie to anyone else standing: by the one rule they back
    // their friend over every rival.
    const members = new Set(group.memberIds);
    const standing = new Set(field.map((f) => f.personId));
    let friend: PersonState | null = null;
    for (const p of [...core.people.values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    )) {
      if (
        !p.alive ||
        p.placeId !== town ||
        age(p, core.date) < 18 ||
        p.id === core.playerId ||
        members.has(p.id) ||
        standing.has(p.id) ||
        field.some((f) => closenessBetween(core, p.id, f.personId) > 0) ||
        decisionLean(core, p, "campaigns.endorse", "endorse", "decline") < 0
      )
        continue;
      const lean = personLean(core.people, p, townRecord(api).lean);
      const own = agreementWith(
        api,
        p.id,
        lean,
        parsePlatform(pair.disagrees.platform),
      );
      if (own > 0) continue;
      const rivals = field
        .filter((f) => f.id !== pair.disagrees.id)
        .map((f) => agreementWith(api, p.id, lean, parsePlatform(f.platform)));
      if (own + tieWeight * 0.9 <= Math.max(0, ...rivals)) continue;
      api.relationship(p.id, pair.disagrees.personId, "contact", 5000);
      if (
        own +
          tieWeight * closenessBetween(core, p.id, pair.disagrees.personId) >
        Math.max(0, ...rivals)
      ) {
        friend = p;
        break;
      }
    }
    expect(
      friend,
      `${where}: a resident who would back a friend`,
    ).not.toBeNull();
    expect(askForEndorsement(api, pair.disagrees.id, friend!.id), where).toBe(
      true,
    );
    const answer = endorsementsOf(api, pair.disagrees.id).find(
      (r) => r.speakerId === friend!.id && r.organizationId === null,
    )!;
    expect(answer.answer).toBe("yes");
    expect(answer.reason, where).toBe("close-tie");
    expect(answer.agreement).toBeLessThanOrEqual(0);
    expect(answer.tie).toBeGreaterThan(0);
    // A person's own endorsement (asked, no group) names no stance.
    expect(answer.askerId).toBe(pair.disagrees.personId);
    expect(answer.stance).toBeNull();
    expectNoStance(
      said.find((e) => e.id === `campaign-endorsed:${answer.id}`),
      `${where}: ${answer.id}`,
    );
    // The campaign engine's turn: the group weighs the race and backs no one.
    advanceCore(
      core,
      addDays(makeIsoDate(core.date), campaignParameter("campaignTurnDays")),
    );
    expect(
      [pair.agrees.id, pair.disagrees.id].flatMap((id) =>
        endorsementsOf(api, id).filter(
          (r) => r.organizationId === group.organizationId,
        ),
      ),
      `${where}: ${group.organizationId} on ${cause.question}`,
    ).toEqual([]);
    console.log(
      `${where}: ${group.organizationId} on ${cause.question} backed no one; ${friend!.id} backed a friend (${pair.disagrees.id}) as a close tie; ${answer.id} names no stance`,
    );
  });
});
