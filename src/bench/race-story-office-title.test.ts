import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { ELECTIONS_MODULE_ID } from "../core2/modules/elections";
import type { CoreState } from "../core2/types";
import { wordPrintedStory } from "./archive-words";
import { buildBenchWorld } from "./world";

// The paper names a race for the seat by what the place calls whoever holds it
// (pool item press-reporter-names-alderman-race-as-council-member): "alderman"
// where the body is the Board of Aldermen, "council member" where the record's
// title is the only name there is. The word comes from the body's own name
// through the table the seat reader uses (data/english/seat-words.json).
// Pinned places: Aberdeen, Mississippi (a Board of Aldermen) and Searsboro,
// Iowa (a council), each on a fixed seed.
const ALDERMEN = [
  { key: "2800180", name: "Aberdeen, Mississippi" },
  { key: "2200240", name: "Abita Springs, Louisiana" },
  { key: "2900244", name: "Adrian, Missouri" },
] as const;

function worldAt(key: string, seedText: string) {
  setBookkeeping(false);
  const seed = createHash("sha256").update(seedText).digest("hex");
  return buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
  }).core;
}

/** The council's race in this town, from the contest records. */
function councilRace(core: CoreState) {
  const races = coreAPI(core)
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as { id: string; title: string; officeId: string }[];
  return races
    .filter((row) => row.officeId.endsWith(":council"))
    .sort((a, b) => a.id.localeCompare(b.id))[0];
}

/** What the paper prints about a race, from each story kind that names its office. */
function printed(core: CoreState, race: { id: string; title: string }) {
  const out: string[] = [];
  for (const [kind, extra] of [["debate", {}]] as const) {
    const id = `${kind}:${race.id}:person_x`;
    const words = wordPrintedStory(core, {
      id: `printed:outlet:newspaper:0:x:${id}`,
      kind: "press.printed",
      date: "2025-06-01",
      facts: {
        sourceRecordId: id,
        contestId: race.id,
        office: race.title,
        ...extra,
      },
    } as never);
    out.push(
      `${kind}: ${words?.headline ?? ""} | ${(words?.paragraphs ?? [words?.lede ?? ""]).join(" ")}`,
    );
  }
  return out.join("\n");
}

it.each(ALDERMEN)(
  "a race for a Board of Aldermen is printed as the race for alderman ($name)",
  ({ key, name }) => {
    const core = worldAt(key, "race-story-office-title:aldermen");
    const race = councilRace(core);
    const where = `${name} (${key})`;
    expect(race, `${where}: no council race`).toBeTruthy();
    const text = printed(core, race!);
    expect(text, `${where}\n${text}`).not.toMatch(/council member/i);
    expect(text, `${where}\n${text}`).toMatch(/alderman/i);
    if (process.env.LINES_LOG)
      appendFileSync(process.env.LINES_LOG, `${where}\n${text}\n\n`);
  },
  600_000,
);

it("a race for a council keeps the record's own title", () => {
  const place = drawPlace("de4ef0f8ff6efdfb:agree:15", "concession-reported");
  const core = worldAt(place.key, "race-story-office-title:council");
  const race = councilRace(core);
  const where = `${place.name} (${place.key})`;
  expect(race, `${where}: no council race`).toBeTruthy();
  const text = printed(core, race!);
  expect(text, `${where}\n${text}`).toMatch(/council member/i);
  expect(text, `${where}\n${text}`).not.toMatch(/alderman/i);
}, 600_000);
