/**
 * The on-ramp scenes' facts: a party's ask to run names the party and the day
 * filing closes, from the `party-asked` record; a cause's invitation names the
 * town body's next posted meeting where the office-day engine has one.
 *
 * HAND-STAGED: the two records, as the engines write them (candidacy.ts
 * writeAsk, public-action.ts inviteThePlayer). Places are drawn from all 56
 * and named; a draw with no party leader, open contest or posted meeting is
 * passed over and said.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { pairKey } from "../core2/kernel/ids";
import { advanceCore } from "../core2/life";
import { ELECTIONS_MODULE_ID } from "../core2/modules/elections";
import { partiesHere } from "../core2/modules/parties";
import { applyCoreEvent, coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { nextMeetingFacts } from "./meeting-facts";
import { purposeScene } from "./purpose-scene";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;

function staged(
  core: Parameters<typeof advanceCore>[0],
  book: {
    schedule: { bindings: { typeKey: string }[]; momentId: string }[];
    momentsById: Map<string, { causeId: string }>;
  },
  typeKey: string,
  recordId: string,
) {
  for (let day = 0; day < 14; day += 1) {
    const entry = book.schedule.find(
      (row) =>
        row.bindings.some((b) => b.typeKey === typeKey) &&
        book.momentsById.get(row.momentId)?.causeId === recordId,
    );
    if (entry) return entry;
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  }
  return undefined;
}

it(`a party's ask names its party and the filing deadline; an invite names a posted meeting (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  let asked = 0;
  let invited = 0;
  for (let at = 0; at < DRAWS && !(asked && invited); at += 1) {
    const place = drawPlace(`${seed}:${at}`, "on-ramp-facts");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const me = playerId as PersonId;
    director.watch(core, me);
    const book = director.ledger.people.get(me)!;
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));

    // The party's ask.
    const party = partiesHere(api).find(
      (row) => row.leaderId && core.people.has(row.leaderId as PersonId),
    );
    const contest = core.modules.has(ELECTIONS_MODULE_ID)
      ? (
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("contests")
            .rows() as unknown as {
            id: string;
            title: string;
            filingDeadline: string;
          }[]
        ).find((row) => row.filingDeadline)
      : undefined;
    if (!asked && party && contest) {
      const id = `party-asked:${contest.id}:${party.id}:${me}`;
      applyCoreEvent(core, {
        id,
        date: core.date,
        kind: "party-asked",
        personIds: [me, party.leaderId],
        placeId: core.people.get(me)!.placeId,
        source: { tag: "SOURCED", citation: "hand-staged", asOf: core.date },
        facts: {
          askedId: me,
          chairId: party.leaderId,
          partyId: party.id,
          party: party.name,
          contestId: contest.id,
          office: contest.title,
          filingDeadline: contest.filingDeadline,
        },
      } as never);
      const entry = staged(core, book as never, "party-recruit", id);
      const result = entry
        ? purposeScene(core, director, me, entry as never, {
            typeKey: "party-recruit",
          })
        : null;
      if (result?.kind === "composed") {
        const facts = result.scene.facts;
        expect(facts.find((f) => f.key === "party")?.text, where).toBe(
          party.name,
        );
        const deadline = facts.find((f) => f.key === "deadline");
        expect(deadline?.recordIds, where).toContain(id);
        expect(deadline?.text, where).not.toMatch(/\d{4}-\d{2}-\d{2}/);
        asked += 1;
      } else passed.push(`${where}: ask not composed`);
    } else if (!asked) passed.push(`${where}: no party leader or contest`);

    // The cause's invitation.
    const meeting = nextMeetingFacts(core);
    const home = core.people.get(me)!.householdId;
    const sharer = [...core.people.values()]
      .filter(
        (p) =>
          p.id !== me &&
          p.alive &&
          p.householdId !== home &&
          core.relationships.has(pairKey(me, p.id)),
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (!invited && sharer && meeting.meeting) {
      const topic = "budget-line:naturalResources";
      const id = `cause.shared:${core.date}:${sharer.id}:${me}:cause:${topic}`;
      applyCoreEvent(core, {
        id,
        date: core.date,
        kind: "cause.shared",
        personIds: [sharer.id],
        witnessIds: [me],
        placeId: sharer.placeId,
        topic,
        desiredChange: topic,
        stressImpulse: 0.5,
        moodImpulse: -0.5,
        source: { tag: "ESTIMATED", asOf: core.date, citation: "hand-staged" },
      } as never);
      const entry = staged(core, book as never, "cause-invite", id);
      const result = entry
        ? purposeScene(core, director, me, entry as never, {
            typeKey: "cause-invite",
          })
        : null;
      if (result?.kind === "composed") {
        const got = result.scene.facts.find((f) => f.key === "meeting");
        expect(got?.text, where).toBe(meeting.meeting.text);
        expect(got?.recordIds, where).toContain(id);
        invited += 1;
      } else passed.push(`${where}: invite not composed`);
    } else if (!invited) passed.push(`${where}: no sharer or posted meeting`);
  }
  console.log(
    `on-ramp facts: proved ${asked} ask, ${invited} invite; passed over: ${passed.join("; ")}`,
  );
  expect(asked + invited, passed.join("; ")).toBeGreaterThan(0);
}, 600_000);
