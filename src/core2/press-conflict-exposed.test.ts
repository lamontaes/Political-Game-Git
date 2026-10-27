/**
 * Generated play evidence (pool item press-exposes-more-than-bribes): a member
 * of a government's body votes a public contract to a firm they or their
 * family own; the award keeps the conflict; the town's reporters reach it at
 * a weekly desk; and where a reporter digs and the outlet runs it, the press
 * writes `press.exposed` citing the award, the official's scandal scene is
 * staged from it, and readers' view of the official moves.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { familyRelation } from "./closeness";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { BUSINESS_MODULE_ID } from "./business-module-id";
import { governments } from "./modules/budgets";
import { awardsOn, contractsOf } from "./modules/contracts";
import { governingMembers } from "./modules/legislature";
import { followersOf, outletsHere, PRESS_MODULE_ID } from "./modules/press";
import { impressionOf } from "./modules/campaigns";
import type { LogRecord } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
/**
 * Places drawn at most, until one has a conflict the press reached and ran.
 * A conflict needs a member of a government's body who owns a firm (or has
 * kin who do) that then wins a line by the body's vote, which measured about
 * one drawn place in eight to one in four; a place with no such member is
 * passed over before its year is played.
 */
const ATTEMPTS = 24;
/** Days for the opening's owners to be recorded before members are checked. */
const OPENING_DAYS = 3;
/** A year, then the week it takes the desk to sit on the last award. */
const DAYS = 365 + 8;
/** Awards this close to the end of the run have not been through a desk week. */
const DESK_WEEK = 8;

interface Tip {
  readonly id: string;
  readonly awardId: string;
  readonly memberId: string;
  readonly reporterId: string;
  readonly dig: number | null;
  readonly run: number | null;
  readonly storyId: string | null;
}

interface Found {
  readonly place: string;
  readonly reached: number;
  readonly exposed: number;
  readonly line: string | null;
}

/** Members of any government's body who own a firm or have kin or housemates who do. */
function interestedMembers(
  core: ReturnType<typeof buildBenchWorld>["core"],
): string[] {
  const api = coreAPI(core);
  const owners = (
    api.moduleState(BUSINESS_MODULE_ID).table("owners").rows() as unknown as {
      ownerId: string;
    }[]
  ).map((row) => row.ownerId);
  return [
    ...new Set(
      governments(api)
        .flatMap((gov) => governingMembers(api, gov))
        .map((term) => term.personId)
        .filter((id): id is string => !!id && core.people.has(id)),
    ),
  ].filter((id) =>
    owners.some((owner) => owner === id || familyRelation(core, id, owner)),
  );
}

const run = (attemptSeed: string, log: string[]): Found => {
  const drawn = drawPlace(attemptSeed, "press-conflict-exposed");
  // GOLDEN_PATH_PLACE_KEY and GOLDEN_PATH_WORLD_SEED pin one place's world.
  const place = process.env.GOLDEN_PATH_PLACE_KEY
    ? {
        ...drawn,
        key: process.env.GOLDEN_PATH_PLACE_KEY,
        seed: process.env.GOLDEN_PATH_WORLD_SEED ?? drawn.seed,
      }
    : drawn;
  const where = process.env.GOLDEN_PATH_PLACE_KEY
    ? `place ${place.key}, seed ${place.seed}`
    : `${place.name} (${place.key}), seed ${place.seed}`;
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  for (let day = 0; day < OPENING_DAYS; day++)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const candidates = interestedMembers(core);
  if (!candidates.length) {
    log.push(`${where}: passed over, no member owns a firm or has kin who do`);
    return { place: where, reached: 0, exposed: 0, line: null };
  }
  const end = addDays(makeIsoDate(core.date), DAYS);
  // Reporters who could cover each conflict on the day it was awarded.
  const eligible = (memberId: string, ownerId: string) =>
    outletsHere(api)
      .filter((o) => o.tier !== "national")
      .flatMap((o) => o.reporterIds ?? [])
      .filter(
        (id) =>
          core.people.get(id)?.alive &&
          [memberId, ownerId].every(
            (party) => id !== party && familyRelation(core, id, party) === null,
          ),
      );
  const coverable = new Map<string, readonly string[]>();
  // The exposures staged for their official: checked the day after, once the
  // director has measured the day.
  const exposures = new Map<string, string>();
  const staged = new Map<string, boolean>();
  const seen = new Set<string>();
  let conflicts = 0;
  // After an exposure, is the official's scandal scene staged for them? A
  // scene of the same kind the same day takes a second record into its
  // sitting (the director's rule), so the scene may cite it as joined.
  const checkStaged = () => {
    for (const [exposureId, officialId] of exposures) {
      if (staged.get(exposureId)) continue;
      const scene = (director.ledger.people.get(officialId)?.schedule ?? [])
        .flatMap((row) => row.bindings.map((binding) => ({ row, binding })))
        .find(
          ({ row, binding }) =>
            binding.typeKey === "scandal" &&
            (row.momentId.includes(exposureId) ||
              binding.joined?.some((joined) => joined.causeId === exposureId)),
        );
      const exposed = scene?.binding.roles.find((r) => r.role === "exposed");
      staged.set(
        exposureId,
        !!scene && exposed?.personIds.join() === officialId,
      );
    }
  };
  for (let day = 0; day < DAYS; day++) {
    const today = addDays(makeIsoDate(core.date), 1);
    advanceCore(core, today);
    for (const award of awardsOn(api, core.date))
      for (const conflict of award.conflicts) {
        conflicts += 1;
        coverable.set(
          `${award.id}:${conflict.memberId}`,
          eligible(conflict.memberId, conflict.ownerId),
        );
        // The member is someone the story follows from the vote on.
        if (!director.ledger.people.has(conflict.memberId))
          director.watch(core, conflict.memberId);
      }
    checkStaged();
    for (const id of core.logByKind.get("press.exposed") ?? []) {
      if (seen.has(id)) continue;
      seen.add(id);
      const event = core.durableLog.get(id) as LogRecord | undefined;
      if (event?.personIds[0]) exposures.set(id, event.personIds[0]);
    }
  }
  checkStaged();
  expect(core.date, where).toBe(end);
  const governmentAwards = governments(api).flatMap((gov) =>
    contractsOf(api, gov.id),
  );
  const tips = api
    .moduleState(PRESS_MODULE_ID)
    .table("tips")
    .rows() as unknown as Tip[];
  const exposed = (
    core.logByKind.get("press.exposed") ?? new Set<string>()
  ).values();
  const exposedEvents = [...exposed].map(
    (id) => core.durableLog.get(id) as LogRecord,
  );
  let reached = 0,
    ran = 0,
    line: string | null = null;
  for (const award of governmentAwards) {
    for (const conflict of award.conflicts) {
      const who = `${where}: ${award.id} ${conflict.memberId}`;
      // The record names a real vote: the member's first choice, the winner,
      // owned by the member or their family.
      expect(award.basis, who).toBe("vote");
      expect(award.votes[conflict.memberId], who).toBe(award.organizationId);
      expect(conflict.organizationId, who).toBe(award.organizationId);
      if (conflict.relation === "self")
        expect(conflict.ownerId, who).toBe(conflict.memberId);
      else
        expect(
          familyRelation(core, conflict.memberId, conflict.ownerId),
          who,
        ).toBe(conflict.relation);
      const tip = tips.find(
        (row) => row.awardId === award.id && row.memberId === conflict.memberId,
      );
      const key = `${award.id}:${conflict.memberId}`;
      const old = award.awardedOn <= addDays(makeIsoDate(end), -DESK_WEEK);
      // The desk reached every conflict a reporter could cover (one who is
      // neither the member, the owner nor either one's relative, at the award
      // and still on the masthead at the end).
      const stillThere = (coverable.get(key) ?? []).filter(
        (id) => core.people.get(id)?.alive,
      );
      const couldReach = old && stillThere.length > 0;
      if (couldReach && !tip)
        expect.fail(
          `${who}: no tip row though ${stillThere[0]} could cover it`,
        );
      if (!tip) continue;
      reached += 1;
      // The tip names the reporter who weighed it, and the award is the
      // paper trail (a dig always weighed).
      expect(tip.dig, who).not.toBeNull();
      const ofAward = exposedEvents.filter(
        (event) =>
          event.facts?.[`award:${award.id}`] === "conflict-of-interest",
      );
      const mine = ofAward.filter(
        (event) => event.facts?.memberId === conflict.memberId,
      );
      const runs = (tip.dig ?? 0) > 0 && (tip.run ?? 0) > 0;
      // Dug and let run is exposed, exactly once; anything less is not.
      expect(mine.length, `${who}: exposures`).toBe(runs ? 1 : 0);
      expect(!!tip.storyId, who).toBe(runs);
      if (!runs) continue;
      ran += 1;
      const event = mine[0]!;
      expect(event.kind, who).toBe("press.exposed");
      expect(event.personIds, who).toEqual([conflict.memberId]);
      expect(event.publicRecord, who).toBe(true);
      expect(event.topic, who).toBe(`conduct:${conflict.memberId}`);
      expect(event.facts?.organizationId, who).toBe(conflict.organizationId);
      expect(event.source.citation, who).toContain(award.id);
      // Readers hear it as a printed story that cites the exposure.
      expect(tip.storyId, who).toBe(
        `printed:${event.facts?.outletId}:${event.id}`,
      );
      // The official's scandal scene is staged from the exposure, with the
      // reporter who dug in it.
      expect(
        staged.get(event.id),
        `${who}: scandal scene for ${event.id}`,
      ).toBe(true);
      // The outlet's readers think less of the official: the exposure left an
      // impression with them that the next election's ballots read.
      const readers = followersOf(api, String(event.facts?.outletId)).filter(
        (id) => id !== conflict.memberId && core.people.get(id)?.alive,
      );
      const moved = readers.filter(
        (id) => (impressionOf(api, id, conflict.memberId)?.causes ?? 0) > 0,
      );
      expect(
        moved.length,
        `${who}: readers with an impression`,
      ).toBeGreaterThan(0);
      line ??= `award ${award.id}, member ${conflict.memberId}, firm ${conflict.organizationId} (owner ${conflict.ownerId}, ${conflict.relation}), tip dig ${tip.dig!.toFixed(2)} run ${tip.run!.toFixed(2)} by ${tip.reporterId}, exposure ${event.id}, scandal scene staged, ${moved.length} of ${readers.length} readers hold an impression of the official`;
    }
  }
  log.push(
    `${where}: ${candidates.length} members own a firm or have kin who do, ${governmentAwards.length} awards, ${governmentAwards.filter((a) => a.basis === "vote").length} by vote, ${conflicts} conflict votes, ${reached} reached by the desk, ${ran} exposed`,
  );
  return { place: where, reached, exposed: ran, line };
};

it(`a member's vote for a family-owned firm reaches the desk and is exposed (up to ${ATTEMPTS} drawn places from seed ${seed})`, () => {
  const log: string[] = [];
  let found: Found | undefined;
  for (let attempt = 0; attempt < ATTEMPTS && !found; attempt += 1) {
    const result = run(
      createHash("sha256").update(`${seed}:${attempt}`).digest("hex"),
      log,
    );
    if (result.exposed) found = result;
  }
  for (const line of log) process.stdout.write(`CONFLICT ${line}\n`);
  expect(
    found,
    `no drawn place from seed ${seed} had a conflict the press reached and ran:\n${log.join("\n")}`,
  ).toBeTruthy();
  process.stdout.write(`CONFLICT EXPOSED ${found!.place}: ${found!.line}\n`);
}, 3_600_000);
