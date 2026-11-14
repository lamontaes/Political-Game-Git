/**
 * A player's campaign gets endorsed and the paper prints what it printed
 * (F5, Nov 14, carrying #9046; Words lead: "briefs never printed from a
 * world"). Three pinned places, three world seeds: the player files for the
 * council seat the place is voting on, gathers the signatures, asks everyone
 * they know to endorse, and plays to the day before the vote. The press's
 * printed stories about that filing are worded and read:
 *  - a public group's endorsement prints (North Courtland, Alabama; Laurel,
 *    Montana), said by what the group works for;
 *  - a household's endorsement is not printed: the desk files only the top
 *    stories of a week by score (press-desk.ts), and two named people rank
 *    below the week's votes and races (Mullan, Idaho). That is the engine
 *    working, so the case asserts the cause instead of forcing a story.
 */
import { expect, it } from "vitest";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { playerContests } from "../core2/modules/elections";
import { endorsementsOf } from "../core2/modules/campaigns";
import { coreAPI } from "../core2/state";
import { wordPrintedStory } from "./archive-words";
import { campaignAct } from "./campaign";
import { fileForOffice } from "./government";
import { buildBenchWorld } from "./world";

const played = (placeKey: string, seed: string, ready: string) => {
  setBookkeeping(false);
  const { core, playerId } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(core);
  const born = core.people.get(playerId!)!.birthDate;
  const eighteen = makeIsoDate(
    `${Number(born.slice(0, 4)) + 18}-${born.slice(5) === "02-29" ? "03-01" : born.slice(5)}`,
  );
  if (eighteen > core.date) advanceCore(core, eighteen);
  if (ready > core.date) advanceCore(core, makeIsoDate(ready));
  const where = `place ${placeKey}, seed ${seed}`;
  const contest = [...playerContests(api)]
    .sort(
      (a, b) =>
        a.electionDate.localeCompare(b.electionDate) ||
        a.id.localeCompare(b.id),
    )
    .find((c) => {
      const r = fileForOffice(core, playerId!, c.id) as {
        filing?: { status?: string };
      };
      return ["petitioning", "on-ballot"].includes(r.filing?.status ?? "");
    });
  expect(contest, `${where}: a race the player can file for`).toBeTruthy();
  const filingId = `filing:${contest!.id}:${playerId}`;
  gatherSignatures(core, filingId);
  advanceCore(core, addDays(makeIsoDate(core.date), 3));
  campaignAct(core, playerId!, { filingId, kind: "endorsement" } as never);
  const end = addDays(makeIsoDate(contest!.electionDate), -1);
  while (core.date < end)
    advanceCore(core, [addDays(makeIsoDate(core.date), 14), end].sort()[0]!);
  const yes = endorsementsOf(api, filingId).filter((r) => r.answer === "yes");
  const stories = (
    api.moduleState("news").table("stories").rows() as unknown as {
      kind: string;
      facts?: Record<string, string>;
    }[]
  )
    .filter(
      (s) =>
        s.kind === "press.printed" &&
        String(s.facts?.sourceRecordId).includes(filingId),
    )
    .map((s) => wordPrintedStory(core, s as never));
  return { where, yes, stories };
};

it("North Courtland, Alabama: the player's endorsements print", () => {
  const { where, yes, stories } = played(
    "0155044",
    "f5-courtland",
    "2025-07-01",
  );
  process.stdout.write(
    `${where}: ${yes.length} yes; ${stories.map((s) => `${s?.headline} | ${s?.lede}`).join(" // ")}\n`,
  );
  expect(yes.length, where).toBeGreaterThan(0);
  expect(stories.length, `${where}: a printed endorsement`).toBeGreaterThan(0);
  for (const s of stories) expect(s?.headline, where).toBeTruthy();
}, 600_000);

it("Laurel, Montana: a group's endorsement is told by what it works for", () => {
  const { where, yes, stories } = played(
    "3042700",
    "61920e6dab2c03e17ef5ac6f144609e87ba9b08f99dcf251c8f0ef6b7d82e6a4",
    "2025-08-15",
  );
  process.stdout.write(
    `${where}: ${yes.length} yes; ${stories.map((s) => `${s?.headline} | ${s?.lede}`).join(" // ")}\n`,
  );
  expect(yes.length, where).toBeGreaterThan(0);
  expect(stories.length, `${where}: a printed endorsement`).toBeGreaterThan(0);
  expect(
    stories.some((s) =>
      /civilian board that reviews the police/.test(
        `${s?.headline} ${s?.lede}`,
      ),
    ),
    where,
  ).toBe(true);
}, 600_000);

it("Mullan, Idaho: a household's endorsements are recorded and not printed", () => {
  const { where, yes, stories } = played(
    "1655630",
    "1928376769bef39fbee5ad36be87b13ab77faa297d8e71475a32a1e1d5e01ec4",
    "2025-08-15",
  );
  process.stdout.write(
    `${where}: ${yes.length} yes; ${stories.length} printed\n`,
  );
  expect(yes.length, where).toBeGreaterThan(0);
  // Some of the yes answers are a person's (no group named); the desk's
  // weekly top stories are not theirs to take (press-desk.ts runDesk, score
  // by proximity, care, people and renown).
  expect(
    yes.some((r) => !r.organizationId),
    where,
  ).toBe(true);
  expect(stories.length, `${where}: none printed, by the desk's score`).toBe(0);
}, 600_000);
