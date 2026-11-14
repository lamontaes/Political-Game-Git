import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { wordPrintedStory } from "./archive-words";
import type { EntityId } from "../core2/kernel/brands";
import { setBookkeeping } from "../core2/bookkeeping";
import { playTownRace } from "../core2/campaign-race-test-kit";
import { gameStartDate } from "../core2/game-start";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "./world";

// The paper's race result stories read like a paper (Words lead, Nov 13,
// rules 30 to 37): one story for a race that fills several seats, a name in
// full once then by last name, no share for an unopposed race or a race for
// several seats, the runner-up from that race's own count, the office in
// lower case in a sentence, and no two outlets printing the same story.
// Pinned places: Searsboro, Iowa (a mayor's race and an at-large council
// race with two Lowes on the ballot) and Excursion Inlet, Alaska (a borough
// whose seats mostly had one name on the ballot), drawn by
// concession-reported's purpose.
// A third place is drawn on a seed nobody chose (GOLDEN_PATH_SEED pins
// it): the first of six draws with a town race open for filing, the others
// named as passed over.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const PLACES = [
  "de4ef0f8ff6efdfb:agree:15",
  "de4ef0f8ff6efdfb:agree:19",
  `${seed}:drawn`,
];

/** A bench world on concession-reported's draw, as the race kit plays it. */
function townWorld(draw: string) {
  const place = drawPlace(draw, "concession-reported");
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  return { core, where: `${place.name} (${place.key}), seed ${draw}` };
}

function play(draw: string) {
  const { core, where } = townWorld(draw);
  return playTownRace(core, where, 10);
}

for (const draw of PLACES)
  it(`the race result stories read like a paper (${draw})`, () => {
    let played = play(draw.endsWith(":drawn") ? `${seed}:agree:0` : draw);
    const passed: string[] = [];
    for (let n = 1; draw.endsWith(":drawn") && n < 6; n += 1) {
      if (
        played.printed.some((s) =>
          String(s.facts.sourceRecordId).startsWith("election-result:"),
        )
      )
        break;
      passed.push(`${played.where}: no race story printed`);
      played = play(`${seed}:agree:${n}`);
    }
    if (passed.length)
      process.stdout.write(`passed over: ${passed.join("; ")}\n`);
    const { core, where, printed } = played;
    const races = printed.filter((s) =>
      String(s.facts.sourceRecordId).startsWith("election-result:"),
    );
    expect(races.length, `${where}: race stories printed`).toBeGreaterThan(0);
    const byRace = new Map<string, string[]>();
    for (const story of races) {
      const record = core.durableLog.get(
        story.facts.sourceRecordId as EntityId,
      );
      const f = (record?.facts ?? {}) as Record<string, string>;
      const outlet = story.id.split(":").slice(1, 4).join(":");
      const race = f.race ?? f.contestId!;
      const here = `${where}: ${story.id}`;
      const words = wordPrintedStory(core, story)!;
      expect(words, here).toBeTruthy();
      const body = (words.paragraphs ?? [words.lede!]).join(" ");
      const told = `${words.headline} | ${body}`;
      // One story a race, at each outlet.
      const key = `${outlet}|${race}`;
      expect(byRace.has(key), `${here}: a second story of ${race}`).toBe(false);
      byRace.set(key, [body]);
      const totals = JSON.parse(f.totals ?? "{}") as Record<string, number>;
      // Nobody "wins with 100%", and no story says a share it should not.
      expect(told, here).not.toMatch(/100 ?(?:%|percent)|%/);
      if (Object.keys(totals).length < 2 || Number(f.seats) > 1)
        expect(told, `${here}: a share in ${told}`).not.toMatch(/percent/);
      expect(told, here).not.toMatch(/won the election/);
      // As people say it: no "Town of" before a body, the district before
      // the office, the turnout as "A total of", never "The count drew".
      expect(told, here).not.toMatch(
        /\b(?:Town|City|Village) of \w+ (?:Board|Council|Commission)|for \w+ for District|The count drew/,
      );
      const seats = Number(f.seats ?? 1);
      if (Object.keys(totals).length <= seats) {
        // Without opposition: said so, and no vote total.
        expect(told, `${here}: ${told}`).toMatch(
          /unopposed|without opposition|no opposition|No challenger|No contest/,
        );
        expect(body, `${here}: ${body}`).not.toMatch(
          /\bvotes?\b|\bvoted\b|\bvoters\b/,
        );
      }
      // A race for several seats names as many winners as seats.
      if (seats > 1 && seats <= 3)
        expect(body, `${here}: ${body}`).not.toMatch(/ and \w+ others?\b/);
      // A share under half says the field it led.
      const share = /(\d+) percent/.exec(body)?.[1];
      if (share && Number(share) < 50)
        expect(body, `${here}: ${body}`).toMatch(/field of/);
      // A full name at most once in the body; anyone named is on this
      // race's count.
      for (const [id] of Object.entries(totals)) {
        const p = core.people.get(id as EntityId);
        if (!p) continue;
        const full = `${p.givenName} ${p.familyName}`;
        expect(
          body.split(full).length - 1,
          `${here}: ${full} in full twice: ${body}`,
        ).toBeLessThanOrEqual(1);
      }
      const onCount = new Set(
        Object.keys(totals).flatMap((id) => {
          const p = core.people.get(id as EntityId);
          return p ? [`${p.givenName} ${p.familyName}`] : [];
        }),
      );
      for (const p of core.people.values()) {
        const full = `${p.givenName} ${p.familyName}`;
        // Someone else of the same name (a cabinet secretary) is not a twin.
        if (body.includes(full) && !onCount.has(full))
          expect(
            Object.keys(totals),
            `${here}: ${full} is not on the count: ${body}`,
          ).toContain(p.id);
      }
      // The office in lower case in a sentence: its title never stands
      // mid-sentence with a capital ("for Council member").
      if (f.office && f.office !== f.office.toLowerCase())
        expect(body, `${here}: ${body}`).not.toMatch(
          new RegExp(`[a-z,] ${f.office}`),
        );
    }
    // No two outlets print the same story of one race.
    const seen = new Map<string, string>();
    for (const [key, [told]] of byRace) {
      const race = key.split("|")[1]!;
      const twin = seen.get(`${race}|${told}`);
      expect(twin, `${where}: ${key} prints ${twin}'s story: ${told}`).toBe(
        undefined,
      );
      seen.set(`${race}|${told}`, key);
    }
  }, 300_000);
