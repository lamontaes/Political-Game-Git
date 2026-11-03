/**
 * A past race's story names its seat (pool item
 * elections-past-race-names-the-district; Words, Nov 1): "won the race for
 * State Senator in District 4", or "won the at-large race" for a seat its
 * record says is at large, never "District" for an at-large seat. A district
 * its record names by place prints the office only
 * (SG-GOV-named-district-story). Every race still prints.
 *
 * Two places a run, both drawn from all 56 on a seed nobody chose
 * (GOLDEN_PATH_SEED pins it): the first drawn place whose state's Census
 * legislative districts are numbered and whose opening paper holds a past
 * legislature race, and the first drawn place whose jurisdiction has no
 * Census legislative districts, where the seats are at large.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { districtIdentityCatalog } from "../districts/catalog";
import { wordArchiveStory } from "./archive-words";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 400;
/** Worlds built looking for a numbered place with a past legislature race. */
const BUILDS = 4;

/** A district name the Census numbers: "State Senate District 4", "Assembly District 12". */
const NUMBERED = /(?:^|\bDistrict )(\d+[A-Z]?|[A-Z])$/;
const catalog = districtIdentityCatalog().filter(
  (d) => d.chamber !== "congressional" && !d.isUnassignedResidual,
);
const numberedStates = new Set(
  catalog
    .filter((d) => NUMBERED.test(d.sourceName ?? ""))
    .map((d) => d.stateUsps),
);
const districtedStates = new Set(catalog.map((d) => d.stateUsps));
const usps = (state: string) => state.replace(/^US-/, "");

interface Seat {
  readonly id: string;
  readonly officeId: string;
  readonly district: string | null;
  readonly districtName?: string;
}

/** Every past legislature race on the opening paper, worded, checked against its seat. */
function checkPlace(place: ReturnType<typeof drawPlace>, where: string) {
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const offices = new Map(
    (
      api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
        id: string;
        kind: string;
        title: string;
      }[]
    ).map((o) => [o.id, o]),
  );
  const seats = new Map(
    (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("seats")
        .rows() as unknown as Seat[]
    ).map((s) => [s.id, s]),
  );
  const stories = (
    api.moduleState(NEWS_MODULE_ID).table("stories").rows() as unknown as {
      id: string;
      kind: string;
      date: string;
      facts: Record<string, string>;
    }[]
  ).filter(
    (story) =>
      story.facts.recordKind === "election-result" &&
      offices.get(story.facts.officeId ?? "")?.kind.startsWith("legislature-"),
  );
  const told = { numbered: 0, atLarge: 0, named: 0 };
  const lines: string[] = [];
  for (const story of stories) {
    const seat = seats.get(story.facts.seatId ?? "");
    expect(
      seat,
      `${where}: ${story.id} has no seat ${story.facts.seatId}`,
    ).toBeTruthy();
    const words = wordArchiveStory(core, story);
    // Every race still prints.
    expect(words, `${where}: ${story.id} printed nothing`).not.toBeNull();
    const text = `${words!.headline ?? ""} | ${words!.lede ?? ""}`;
    const name = seat!.districtName ?? seat!.district ?? "";
    const number = NUMBERED.exec(name)?.[1]?.replace(/^0+(?=\w)/, "");
    if (/large/i.test(name)) {
      told.atLarge += 1;
      expect(words!.lede, `${where}: ${story.id} ${text}`).toContain(
        "at-large race",
      );
      expect(words!.headline, `${where}: ${story.id} ${text}`).toContain(
        "at-large seat",
      );
      // A piece that needs {district} never prints for an at-large seat.
      expect(text, `${where}: ${story.id}`).not.toMatch(/\bDistrict\b/);
    } else if (number) {
      told.numbered += 1;
      expect(words!.lede, `${where}: ${story.id} (${name}) ${text}`).toContain(
        `in District ${number}.`,
      );
      expect(
        words!.headline,
        `${where}: ${story.id} (${name}) ${text}`,
      ).toContain(`takes District ${number}`);
    } else {
      told.named += 1;
      expect(text, `${where}: ${story.id} (${name})`).not.toMatch(
        /\bDistrict\b|at-large/,
      );
    }
    lines.push(`${seat!.id} "${name}": ${text}`);
  }
  return { told, stories: stories.length, lines };
}

it(`a past legislature race's story names its district or says it is at large (seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const reports: string[] = [];
    let numberedDone = false;
    let atLargeDone = false;
    let builds = 0;
    for (
      let draw = 0;
      draw < DRAWS && !(numberedDone && atLargeDone);
      draw += 1
    ) {
      const place = drawPlace(`${seed}:${draw}`, "past-race-district");
      const state = usps(place.state);
      const atLarge = !districtedStates.has(state);
      if (atLarge ? atLargeDone : numberedDone || !numberedStates.has(state))
        continue;
      if (!atLarge && builds >= BUILDS) continue;
      if (!atLarge) builds += 1;
      const where = `${place.name} (${place.key}), seed ${seed} draw ${draw}, world seed ${place.seed}`;
      const result = checkPlace(place, where);
      reports.push(
        `${where}: ${result.stories} past legislature races, ${result.told.numbered} by number, ${result.told.atLarge} at large, ${result.told.named} named by place\n  ${result.lines.slice(0, 4).join("\n  ")}`,
      );
      if (atLarge) {
        expect(
          result.told.atLarge,
          `${where}: no at-large race`,
        ).toBeGreaterThan(0);
        atLargeDone = true;
      } else if (result.told.numbered > 0) numberedDone = true;
    }
    console.log(`past race district:\n${reports.join("\n")}`);
    expect(
      numberedDone,
      `seed ${seed}: no numbered district race in ${BUILDS} worlds`,
    ).toBe(true);
    expect(
      atLargeDone,
      `seed ${seed}: no drawn place without Census districts`,
    ).toBe(true);
  } finally {
    setBookkeeping(true);
  }
}, 1_500_000);
