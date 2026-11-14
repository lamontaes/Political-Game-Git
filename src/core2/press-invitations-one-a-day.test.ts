/**
 * An outlet asks a candidate for an interview for its own reason, and the
 * answer is to that outlet (item campaign-interview-yes-sits-every-outlet-in-one-day).
 * The route is the ordinary one: the player files in a named place, the press
 * engine's weekly pass invites, the director stages each invitation as a call,
 * and the player says yes in its scene. Checked, in places named below with a
 * fixed world seed:
 *   - each outlet's invitation is its own record, the answer reads only that
 *     outlet's interview, and no day brings the player two invitations;
 *   - a yes writes one `interview-accepted` record for the outlet that asked,
 *     never one for every outlet of the week;
 *   - a national outlet asks only candidates in a federal or state race.
 */
import { describe, expect, it } from "vitest";
import { applyChosenPerson } from "../bench/creator";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gatherSignatures } from "./campaign-petition-kit";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  fileCandidacy,
  openContests,
  playerMayFileFor,
  type ContestRow,
} from "./modules/elections";
import {
  INTERVIEW_ACCEPTED_EVENT,
  interviewsFor,
  newsworthiness,
  outletCoversContest,
  pressParameter,
} from "./modules/press";
import { coreAPI } from "./state";
import type { PersonId } from "./types";
import { purposeScene, replyInScene } from "../director/purpose-scene";

const WORLD_SEED = "interview-invites-one-a-day";
/** Named places: a county race in a state that votes for its legislature the same day, so national outlets are shown refused the county race and let through the state one. */
const PLACES: readonly {
  key: string;
  level: string;
  family?: string;
}[] = [{ key: "1255375", level: "county" }];

interface Seen {
  invites: { date: string; interviewId: string; outletId: string }[];
  accepted: string[];
  sittings: number;
  contest: ContestRow;
  outletTier: Map<string, string>;
  /** Every outlet's own ask in the world: outlet tier and race level, counted. */
  asked: Map<string, number>;
  /** County filings newsworthy enough that a national outlet would have asked them without the beat. */
  wouldHaveAsked: number;
  beat: Record<string, boolean>;
}

function play(place: (typeof PLACES)[number]): Seen | string {
  setBookkeeping(false);
  const world = buildBenchWorld(`${WORLD_SEED}:${place.key}`, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const me = world.playerId! as PersonId;
  applyChosenPerson(core, me, {
    givenName: "Pat",
    familyName: core.people.get(me)!.familyName,
    gender: "female",
    birthYear: 1985,
    birthMonth: 6,
    birthDay: 1,
  });
  for (const id of [
    me,
    ...(core.households.get(core.people.get(me)!.householdId)?.memberIds ?? []),
  ])
    if (core.people.get(id)?.alive) director.watch(core, id as PersonId);
  const api = coreAPI(core);
  // Weekly from the start until a race of the wanted kind opens at least
  // eleven weeks ahead and the player may file for it.
  let contest: ContestRow | undefined;
  for (let week = 0; week < 110 && !contest; week += 1) {
    contest = [...openContests(api)]
      .filter(
        (c) =>
          c.level === place.level &&
          (!place.family || c.family === place.family) &&
          c.electionDate >= addDays(makeIsoDate(core.date), 77) &&
          playerMayFileFor(api, c.id),
      )
      .sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      )[0];
    if (!contest) advanceCore(core, addDays(makeIsoDate(core.date), 7));
  }
  if (!contest) return `${place.key}: no ${place.level} race to enter`;
  const filed = fileCandidacy(api, {
    personId: me,
    contestId: contest.id,
    platform: [],
    party: null,
  }) as { filing?: { status?: string } };
  if (!["petitioning", "on-ballot"].includes(filed.filing?.status ?? ""))
    return `${place.key}: the filing was refused: ${JSON.stringify(filed).slice(0, 300)}`;
  const petition = gatherSignatures(core, `filing:${contest.id}:${me}`);
  if (petition && !(petition.check && petition.check.valid >= petition.needed))
    return `${place.key}: the petition came up short`;

  // Weekly until the invitation weeks, then a day at a time.
  const closeIn = addDays(makeIsoDate(contest.electionDate), -56);
  while (core.date < closeIn)
    advanceCore(core, [addDays(makeIsoDate(core.date), 7), closeIn].sort()[0]!);
  const seen = new Set<string>();
  const accepted: string[] = [];
  while (core.date < contest.electionDate) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    for (const entry of director.ledger.people.get(me)!.schedule) {
      if (seen.has(entry.momentId)) continue;
      seen.add(entry.momentId);
      if (!entry.bindings.some((row) => row.typeKey === "interview-invite"))
        continue;
      const result = purposeScene(core, director, me, entry, {
        typeKey: "interview-invite",
      });
      if (result?.kind !== "composed") continue;
      const agree = result.scene.talk.tree.replies.findIndex(
        (reply) => reply.line.move === "agree",
      );
      if (agree < 0) continue;
      replyInScene(core, director, me, entry, [agree]);
      accepted.push(
        String(
          core.durableLog.get(result.scene.cause.id as never)!.facts!
            .interviewId,
        ),
      );
    }
  }
  const outletTier = new Map<string, string>();
  const pressOutlets = api
    .moduleState("core2-press-v1")
    .table("outlets")
    .rows() as unknown as { id: string; tier: string }[];
  for (const outlet of pressOutlets) outletTier.set(outlet.id, outlet.tier);
  const invites = [...core.durableLog.values()]
    .filter(
      (record) =>
        record.kind === "interview-invited" &&
        record.personIds.includes(me as never),
    )
    .map((record) => {
      const interviewId = String(record.facts!.interviewId);
      const row = interviewsFor(api, me).find((r) => r.id === interviewId)!;
      expect(
        record.facts!.interviewIds,
        `${place.key}: the old bundle of a week's outlets is gone`,
      ).toBeUndefined();
      return { date: record.date, interviewId, outletId: row.outletId };
    });
  const sittings = [...core.durableLog.values()].filter(
    (record) =>
      record.kind === INTERVIEW_ACCEPTED_EVENT &&
      record.personIds.includes(me as never),
  );
  const levelOf = new Map(
    (
      api
        .moduleState("core2-elections-v1")
        .table("contests")
        .rows() as unknown as { id: string; level: string }[]
    ).map((c) => [c.id, c.level]),
  );
  const asked = new Map<string, number>();
  for (const row of api
    .moduleState("core2-press-v1")
    .table("interviews")
    .rows() as unknown as {
    outletId: string;
    contestId: string | null;
    askedBy: string;
  }[]) {
    if (row.askedBy !== "outlet" || !row.contestId) continue;
    const key = `${outletTier.get(row.outletId)}:${levelOf.get(row.contestId)}`;
    asked.set(key, (asked.get(key) ?? 0) + 1);
  }
  const nationalOutlet = (
    api.moduleState("core2-press-v1").table("outlets").rows() as unknown as {
      id: string;
      tier: string;
    }[]
  ).find((o) => o.tier === "national")!;
  const contests = api
    .moduleState("core2-elections-v1")
    .table("contests")
    .rows() as unknown as ContestRow[];
  const filings = api
    .moduleState("core2-elections-v1")
    .table("filings")
    .rows() as unknown as { id: string; contestId: string }[];
  const wouldHaveAsked = filings.filter(
    (f) =>
      levelOf.get(f.contestId) === place.level &&
      newsworthiness(api, f as never) >= pressParameter("nationalInterviewBar"),
  ).length;
  const beat: Record<string, boolean> = {};
  for (const c of contests)
    beat[c.level] = outletCoversContest(nationalOutlet as never, c);
  return {
    wouldHaveAsked,
    beat,
    invites,
    accepted,
    sittings: sittings.length,
    contest,
    outletTier,
    asked,
  };
}

describe("an outlet asks for its own reason, and the yes is to that outlet", () => {
  const results = new Map<string, Seen | string>();
  for (const place of PLACES)
    it(`${place.key}: one invitation a day, one sitting per yes`, () => {
      const out = play(place);
      results.set(place.key, out);
      expect(typeof out, String(out)).not.toBe("string");
      if (typeof out === "string") return;
      const days = out.invites.map((i) => i.date);
      console.log(`ASKED ${JSON.stringify([...out.asked])}`);
      // The beat: a national outlet asks federal and state races only, while
      // the world had a county or town race its local outlets did ask about.
      expect(
        [...out.asked.keys()].some(
          (k) => k.startsWith("local:") && !/:(federal|state)$/.test(k),
        ),
        `the world had no county or town race for the filter to turn away from`,
      ).toBe(true);
      expect(
        out.wouldHaveAsked,
        "a county candidate was newsworthy enough for a national outlet, so the beat is what kept it away",
      ).toBeGreaterThan(0);
      expect(out.beat.county ?? false, "a national outlet's beat: county").toBe(
        false,
      );
      for (const level of ["federal", "state"])
        if (level in out.beat)
          expect(out.beat[level], `a national outlet's beat: ${level}`).toBe(
            true,
          );
      for (const key of out.asked.keys())
        if (key.startsWith("national:"))
          expect(key, "a national outlet asked a county or town race").toMatch(
            /:(federal|state)$/,
          );
      console.log(
        `${place.key} ${out.contest.id} (${out.contest.level}): ` +
          out.invites
            .map(
              (i) =>
                `${i.date} ${i.interviewId} [${out.outletTier.get(i.outletId)}]`,
            )
            .join("; ") +
          ` | yes ${out.accepted.length}, sittings ${out.sittings}`,
      );
      expect(
        new Set(days).size,
        `${place.key}: two invitations fell on one day (${days.join(", ")})`,
      ).toBe(days.length);
      expect(
        out.sittings,
        `${place.key}: one sitting on the record for each yes`,
      ).toBe(out.accepted.length);
      for (const invite of out.invites) {
        const tier = out.outletTier.get(invite.outletId);
        if (tier === "national")
          expect(
            ["federal", "state"],
            `${place.key}: a national outlet asked a ${out.contest.level} race (${invite.interviewId})`,
          ).toContain(out.contest.level);
      }
    }, 600_000);
  it("at least one place put two or more outlets in one invitation week", () => {
    const counts = [...results.values()].map((r) =>
      typeof r === "string" ? 0 : r.invites.length,
    );
    expect(
      Math.max(0, ...counts),
      `no place had two invitations: ${[...results.values()].map((r) => (typeof r === "string" ? r : String(r.invites.length))).join(" | ")}`,
    ).toBeGreaterThanOrEqual(2);
  });
});
