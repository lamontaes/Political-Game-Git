import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld, NoPlayerHereError } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { closenessBetween } from "../core2/closeness";
import { advanceCore } from "../core2/life";
import { partyOf } from "../core2/candidate-pool";
import {
  CANDIDACY_MODULE_ID,
  decisionOf,
  platformForContest,
} from "../core2/modules/candidacy";
import {
  ENDORSEMENT_ASKED_EVENT,
  VOLUNTEER_JOINED_EVENT,
  campaignFor,
  endorsementsOf,
  enlistVolunteer,
} from "../core2/modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  fileCandidacy,
  openContests,
  type FilingRow,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { lastLayoff } from "./constituent-help-facts";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { ScheduleEntry } from "./scheduling";
import type { TreeNode } from "./scene-talk";

// K1 (Story thread #9750, part 3): someone who has worked for the player a
// year or more files to run on their own and their campaign asks the player
// for an endorsement. The ask is the campaigns engine's endorsement-asked
// record; the scene's packet says why now, each fact from the record that
// holds it, and the player's reply writes the one endorsement row. Places are
// drawn (never named in the test): the player files in the first race that
// takes them, someone from their circle says they will work the campaign
// (`enlistVolunteer`, the engine's own writer), the world runs a year, and
// that volunteer files in a later race the player is not in.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const WEEK = 7;
const WEEKS_FOR_RACE = 104;
const WEEKS_FOR_LATER = 260;
// One world a run (a played year of this size is about 3 GB); a second place is a second seed.
const PLACES = 1;

/** Every path of a talk, as the lead reads it: who says what, each menu under "You say:", each ending. */
function talkPaths(
  where: string,
  talk: { lines: { speaker: string; text: string }[]; tree: TreeNode },
): string {
  const spoken = (line: { speaker: string; text: string }) =>
    `${line.speaker}: ${line.text}`;
  const paths: string[] = [];
  (function walk(node: TreeNode, before: string[]) {
    for (const reply of node.replies) {
      const menu = node.replies.map(
        (row) =>
          `  ${row === reply ? "[pressed]" : "         "} ${row.line.text}`,
      );
      const here = [
        ...before,
        "You say:",
        ...menu,
        ...(reply.next?.lines ?? []).map(spoken),
      ];
      const end = reply.next?.end;
      if (end?.ending)
        paths.push(
          [
            ...here,
            ...(end.close ? [spoken(end.close)] : []),
            `ENDING ${end.ending.id}, keeps ${end.ending.keeps}`,
          ].join("\n    "),
        );
      if (reply.next) walk(reply.next, here);
    }
  })(talk.tree, []);
  const firstReply = talk.lines.findIndex(
    (line) => line.text === talk.tree.replies[0]?.line.text,
  );
  const opening = talk.lines
    .slice(0, firstReply < 0 ? 0 : firstReply)
    .map(spoken)
    .join("\n    ");
  return `ENDORSEMENT ASK ${where}:\n  opening:\n    ${opening}\n${paths.map((path, n) => `  path ${n + 1}:\n    ${path}`).join("\n")}\n`;
}

interface Played {
  readonly where: string;
  readonly facts: Readonly<
    Record<string, { text: string; recordIds: string[] }>
  >;
  readonly answer: string;
}

/** One drawn place: the volunteer's ask for the player, its facts checked against the records, one reply pressed. */
function playAt(
  draw: number,
  press: "agree" | "decline",
  passedOver: string[],
): Played | null {
  const place = drawPlace(`${seed}:${draw}`, "endorsement-ask-asker-facts");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  setBookkeeping(false);
  let built: ReturnType<typeof buildBenchWorld>;
  try {
    built = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
  } catch (error) {
    if (!(error instanceof NoPlayerHereError)) throw error;
    passedOver.push(`${where}: ${error.message}`);
    return null;
  }
  const { core, director } = built;
  const api = coreAPI(core);
  const playerId = core.playerId as PersonId;
  const player = core.people.get(playerId)!;
  director.watch(core, playerId);
  const week = () => advanceCore(core, addDays(makeIsoDate(core.date), WEEK));
  const sorted = () =>
    [...openContests(api)].sort(
      (a, b) =>
        a.electionDate.localeCompare(b.electionDate) ||
        a.id.localeCompare(b.id),
    );

  // The player files in the first race that takes them.
  let mine: FilingRow | undefined;
  const refusals = new Set<string>();
  for (let n = 0; !mine && n < WEEKS_FOR_RACE; n += 1) {
    for (const contest of sorted()) {
      const result = fileCandidacy(api, {
        personId: playerId,
        contestId: contest.id,
        platform: platformForContest(api, playerId, null, contest),
        party: null,
      });
      if (result.status !== "refused") {
        mine = result.filing;
        break;
      }
      refusals.add(
        `${contest.id}: ${result.unmet
          .filter((c) => !c.met)
          .map((c) => c.rule)
          .join(", ")}`,
      );
    }
    if (!mine) week();
  }
  if (!mine) {
    passedOver.push(
      `${where}: no race took the player's filing in ${WEEKS_FOR_RACE} weeks (${[...refusals].join("; ")})`,
    );
    return null;
  }

  // Someone from their circle says they will work the campaign.
  const town = player.placeId;
  const clerks = new Set(
    sorted().flatMap((c) => filingClerkFor(api, c.id)?.personId ?? []),
  );
  const circle = [...new Set([...player.familyIds, ...player.knownIds])]
    .sort()
    .filter((id) => {
      const p = core.people.get(id);
      return (
        p?.alive &&
        p.placeId === town &&
        !clerks.has(id) &&
        // The scene's receive rule is "apart": someone who lives with the player
        // asks at home and the ask goes to the Journal (campaign-manager-household).
        p.householdId !== player.householdId &&
        ageOnDate(p.birthDate, core.date) >= 18
      );
    });
  const volunteerId = circle.find((id) => enlistVolunteer(api, mine!.id, id));
  if (!volunteerId) {
    passedOver.push(
      `${where}: nobody in the player's circle who lives apart could volunteer`,
    );
    return null;
  }
  const joinedId = `${VOLUNTEER_JOINED_EVENT}:${mine.id}:${volunteerId}`;
  const joined = core.durableLog.get(joinedId);
  expect(joined, `${where}: no join record ${joinedId}`).toBeTruthy();

  // A year on, they file in a later race the player is not in.
  let theirs: FilingRow | undefined;
  for (let n = 0; !theirs && n < WEEKS_FOR_LATER; n += 1) {
    week();
    if (ageOnDate(makeIsoDate(joined!.date), core.date) < 1) continue;
    for (const contest of sorted()) {
      if (contest.id === mine.contestId) continue;
      const result = fileCandidacy(api, {
        personId: volunteerId,
        contestId: contest.id,
        platform: platformForContest(
          api,
          volunteerId as PersonId,
          null,
          contest,
        ),
        party: null,
      });
      if (result.status !== "refused") {
        theirs = result.filing;
        break;
      }
    }
  }
  if (!theirs) {
    passedOver.push(
      `${where}: the volunteer ${volunteerId} found no later race to file in within ${WEEKS_FOR_LATER} weeks of ${joined!.date}`,
    );
    return null;
  }

  // Their campaign asks the player.
  const rowId = `endorsement:${theirs.id}:${playerId}`;
  for (
    let day = 0;
    day < 60 &&
    !endorsementsOf(api, theirs.id).some((row) => row.speakerId === playerId);
    day += 1
  )
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const row = endorsementsOf(api, theirs.id).find(
    (r) => r.speakerId === playerId,
  );
  if (!row) {
    passedOver.push(
      `${where}: ${volunteerId} filed (${theirs.id}) and their campaign never asked the player within 60 days`,
    );
    return null;
  }
  expect(row.id).toBe(rowId);
  expect(row.answer, `${where}: ${rowId}`).toBe("asked");
  const record = [...core.durableLog.values()]
    .filter(
      (r) =>
        r.kind === ENDORSEMENT_ASKED_EVENT && r.facts?.endorsementId === rowId,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1)!;
  expect(record.personIds, where).toEqual([volunteerId, playerId]);

  // The scene staged from that record, with its packet.
  const book = director.ledger.people.get(playerId)!;
  const entry = book.schedule.find(
    (e) =>
      book.momentsById.get(e.momentId)?.causeId === record.id &&
      e.bindings.some((b) => b.typeKey === "endorsement-ask"),
  ) as ScheduleEntry | undefined;
  expect(
    entry,
    `${where}: no scene staged from ${record.id}; its entries: ${JSON.stringify(
      book.schedule
        .filter((e) => book.momentsById.get(e.momentId)?.causeId === record.id)
        .map((e) => ({
          types: e.bindings.map((b) => b.typeKey),
          outcome: e.outcome,
          heldBack: e.heldBack,
        })),
    )}`,
  ).toBeTruthy();
  const shown = purposeScene(core, director, playerId, entry!, {
    typeKey: "endorsement-ask",
  });
  expect(
    shown?.kind,
    `${where}: ${JSON.stringify(shown)} (entry ${JSON.stringify({ outcome: entry!.outcome, heldBack: entry!.heldBack })})`,
  ).toBe("composed");
  if (shown?.kind !== "composed") throw new Error("not composed");
  const facts = Object.fromEntries(
    shown.scene.facts.map((f) => [f.key, f]),
  ) as Played["facts"];

  // Each fact is there exactly when its record holds it, and cites that record.
  const today = record.date;
  expect(facts["years-with-you"], `${where}: years-with-you`).toBeTruthy();
  expect(facts["years-with-you"]!.recordIds, where).toContain(joinedId);
  const filings = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .query("byPerson", [volunteerId]) as unknown as FilingRow[];
  const earlier = filings.find(
    (f) => f.contestId !== theirs!.contestId && f.filedOn < today,
  );
  expect(!!facts["ran-before"], `${where}: ran-before`).toBe(!!earlier);
  if (earlier) expect(facts["ran-before"]!.recordIds).toContain(earlier.id);
  const volunteer = core.people.get(volunteerId as PersonId)!;
  const layoff = lastLayoff(core, volunteerId as PersonId, today);
  expect(!!facts["lost-job"], `${where}: lost-job`).toBe(
    !!layoff && !volunteer.jobId,
  );
  if (facts["lost-job"])
    expect(facts["lost-job"].recordIds).toContain(layoff!.id);
  const decision = core.modules.has(CANDIDACY_MODULE_ID)
    ? decisionOf(api, theirs.contestId, volunteerId as PersonId)
    : null;
  if (facts["carries-cause"]) {
    expect(
      decision?.reasons.cause ?? 0,
      `${where}: carries-cause`,
    ).toBeGreaterThan(0);
    expect(facts["carries-cause"].recordIds).toContain(decision!.id);
  }
  const theirParty = theirs.party ?? partyOf(api, volunteerId as PersonId);
  expect(!!facts["same-party"], `${where}: same-party`).toBe(
    !!theirParty && theirParty === partyOf(api, playerId),
  );
  // Someone the player backs stands in the asker's race: their yes on that
  // candidate's endorsement row, or their name on that campaign's helpers.
  const backed = ballot(api, theirs.contestId).filter(
    (f) =>
      f.personId !== volunteerId &&
      f.personId !== playerId &&
      (endorsementsOf(api, f.id).some(
        (r) => r.speakerId === playerId && r.answer === "yes",
      ) ||
        campaignFor(api, f.id).volunteerIds.includes(playerId) ||
        campaignFor(api, f.id).staffIds.includes(playerId)),
  );
  expect(!!facts["against-your-ally"], `${where}: against-your-ally`).toBe(
    backed.length > 0,
  );
  if (backed.length)
    expect(facts["against-your-ally"]!.recordIds).toContain(backed[0]!.id);

  process.stdout.write(
    `K1 ${where}: ${volunteerId} worked for the player from ${joined!.date} (${joinedId}), filed ${theirs.id} on ${theirs.filedOn}, asked on ${today} (${record.id}); packet ${Object.entries(
      facts,
    )
      .filter(([key]) =>
        [
          "years-with-you",
          "carries-cause",
          "lost-job",
          "ran-before",
          "same-party",
          "against-your-ally",
        ].includes(key),
      )
      .map(([key, f]) => `${key}="${f.text}" [${f.recordIds.join(", ")}]`)
      .join("; ")}\n`,
  );
  process.stdout.write(talkPaths(where, shown.scene.talk));

  // The reply pressed writes the one endorsement row.
  const before = closenessBetween(core, playerId, volunteerId as PersonId);
  const replies = shown.scene.talk.tree.replies.map((r) => r.line.move);
  expect(replies, where).toEqual(expect.arrayContaining([press]));
  // A no is pressed through to its ending (the ask presses once: "Can I ask why?", and the answer stands).
  const first = replies.indexOf(press);
  const pressed = shown.scene.talk.tree.replies[first]!.next;
  const last =
    pressed?.replies.findIndex((r) => r.line.move === "refuse") ?? -1;
  const path = press === "decline" && last >= 0 ? [first, last] : [first];
  const sent = replyInScene(core, director, playerId, entry!, path, {
    typeKey: "endorsement-ask",
  });
  expect(sent, `${where}: the reply wrote nothing`).toBeTruthy();
  const after = endorsementsOf(api, theirs.id).find(
    (r) => r.speakerId === playerId,
  )!;
  expect(after.answer, `${where}: ${rowId}`).toBe(
    press === "agree" ? "yes" : "no",
  );
  const told = [...core.durableLog.values()].some(
    (r) => r.kind === "campaign-endorsed" && r.facts?.endorsementId === rowId,
  );
  expect(told, `${where}: a yes is public, a no is not`).toBe(
    press === "agree",
  );
  if (press === "decline")
    expect(
      closenessBetween(core, playerId, volunteerId as PersonId),
    ).toBeLessThan(before);
  return { where, facts, answer: after.answer };
}

it(`a volunteer of a year or more asks the player to endorse them to run, and the packet says why now (seed ${seed})`, () => {
  const passedOver: string[] = [];
  const played: Played[] = [];
  for (let draw = 0; draw < 8 && played.length < PLACES; draw += 1) {
    // The reply pressed follows the seed's own parity: an odd seed refuses, an even one agrees.
    const press = parseInt(seed.slice(-1), 16) % 2 ? "decline" : "agree";
    const one = playAt(draw, press, passedOver);
    if (one) played.push(one);
  }
  process.stdout.write(
    `K1 seed ${seed}: ${played.length} places played, passed over ${passedOver.length}${passedOver.map((line) => `\n  ${line}`).join("")}\n`,
  );
  expect(
    played.length,
    `no drawn place held the case:\n${passedOver.join("\n")}`,
  ).toBeGreaterThanOrEqual(1);
}, 3_000_000);
