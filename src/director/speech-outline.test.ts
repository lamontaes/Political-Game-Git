import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { officialsIn } from "../core2/modules/officials";
import { placeStateKeys } from "../core2/places";
import { coreStateName } from "../core2/place-lookup";
import { placeStateKey } from "../core2/place-map";
import { questionSubject } from "../english/policy-names";
import { composeLocalAddress } from "./local-address";
import { composeOpeningStory } from "./opening-story";
import { outlineOf } from "./speech-outline";

// The one speech outline (words composer, unit 3; owner, Nov 12: "This should
// apply to all speeches ... the problem is the engine"). Ten places drawn from
// all 56 on a seed nobody chose; in each, the President's opening address and
// the governor's and mayor's addresses go through the one planner, and the
// composed text is read the way the owner read it on Nov 12.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 10;
setBookkeeping(false);

/** Two full clauses joined by a comma alone (a simple reader; the shared composed check replaces it once it lands on main). */
const CLAUSE_START =
  /^(?:I|I'm|I'll|I've|I'd|we|we're|we'll|we've|you're|you'll|it's|they're|they'll|that's|this is)\b/i;
const SUBORDINATE =
  /^(?:if|when|whether|because|while|as|since|after|before|until|though|although|once|unless|where|whoever|whatever|wherever|and|but|so|or|nor|for|yet|with|without|from|to|in|on|at|over|under|across|all|every|whichever|however|first|second|third|next|then|now)\b/i;
const FINITE =
  /\b(?:I'm|I'll|I've|I'd|we're|we'll|we've|it's|that's|is|are|was|were|am|will|has|have|had|can|did|does)\b/i;
export function commaSplices(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((sentence) => {
    const parts = sentence.split(/,\s+/);
    if (parts.length > 3) return false;
    return parts.some(
      (part, at) =>
        at > 0 &&
        CLAUSE_START.test(part) &&
        !SUBORDINATE.test(parts[at - 1]!) &&
        FINITE.test(parts[at - 1]!),
    );
  });
}

interface Speech {
  readonly who: string;
  readonly text: string;
  readonly theme: string | null;
  readonly asks: readonly string[];
  /** The state whose speech it is; null for the President's, which names none. */
  readonly ownState: string | null;
}

const stateNames = placeStateKeys().map((key) => ({
  key,
  name: coreStateName(key.replace(/^US-/, "")) ?? key,
}));

describe("every speech through the one outline planner", () => {
  it(
    "says one theme, each ask once, people by title first, no stray state and no comma splice, in ten drawn places",
    () => {
      const leads: string[] = [];
      const failures: string[] = [];
      for (let at = 0; at < DRAWS; at += 1) {
        const place = drawPlace(`${seed}:${at}`, "speech-outline");
        const where = `${place.name} (${place.key}), seed ${seed}:${at}`;
        const world = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const core = world.core;
        const api = coreAPI(core);
        const opening = composeOpeningStory(core, world.playerId);
        expect(opening, `${where}: no President's address`).toBeTruthy();
        const own = placeStateKey(core.placeMetadata.placeKey);
        const speeches: Speech[] = [
          {
            who: "President",
            text: opening!.address.text,
            theme: opening!.theme,
            asks: opening!.asks,
            ownState: null,
          },
          ...(["state", "town"] as const).flatMap((level): Speech[] => {
            const local = composeLocalAddress(core, level);
            return local
              ? [
                  {
                    who: level === "state" ? "governor" : "mayor",
                    text: local.text,
                    theme: local.theme,
                    asks: local.asks,
                    ownState: own,
                  },
                ]
              : [];
          }),
        ];
        if (opening!.asks[0]) leads.push(opening!.asks[0]);
        // The people the President's address may name, and their titles.
        const people = [
          ["US:vice-president", "Vice President"],
          ["US:us-house", "Speaker"],
        ].flatMap(([seat, title]) => {
          const row = officialsIn(api, seat!).find(
            (entry) =>
              seat !== "US:us-house" || entry.leadership === "presiding",
          );
          const person = row ? core.people.get(row.id) : undefined;
          return person
            ? [
                {
                  name: `${person.givenName} ${person.familyName}`,
                  title: title!,
                },
              ]
            : [];
        });
        for (const speech of speeches) {
          const label = `${where}, the ${speech.who}'s address`;
          // One theme: every ask belongs to it.
          for (const ask of speech.asks)
            if (questionSubject(ask) !== speech.theme)
              failures.push(
                `${label}: ask ${ask} is outside the theme ${speech.theme}`,
              );
          // Each ask once.
          if (new Set(speech.asks).size !== speech.asks.length)
            failures.push(
              `${label}: an ask is repeated (${speech.asks.join(", ")})`,
            );
          // A person by title at first mention.
          for (const person of people) {
            const first = speech.text.indexOf(person.name);
            if (
              first >= 0 &&
              !speech.text.slice(0, first).endsWith(`${person.title} `)
            )
              failures.push(
                `${label}: ${person.name} is first said without "${person.title}"`,
              );
          }
          // No state named outside its own jurisdiction's speech.
          for (const state of stateNames)
            if (
              state.key !== speech.ownState &&
              new RegExp(`\\b${state.name}\\b`).test(speech.text)
            )
              failures.push(`${label}: names ${state.name}`);
          // No comma splice.
          for (const sentence of commaSplices(speech.text))
            failures.push(`${label}: comma splice: "${sentence}"`);
        }
        console.log(
          `SPEECH OUTLINE ${where}\n${speeches
            .map(
              (speech) =>
                `  [${speech.who}; theme ${speech.theme}; asks ${speech.asks.join(", ") || "none"}]\n  ${speech.text}`,
            )
            .join("\n")}`,
        );
      }
      expect(failures, failures.join("\n")).toEqual([]);
      // The leading ask is not one question in more than half the draws.
      const most = Math.max(
        0,
        ...[...new Set(leads)].map(
          (lead) => leads.filter((row) => row === lead).length,
        ),
      );
      expect(
        most,
        `seed ${seed}: leading asks ${leads.join(", ")}`,
      ).toBeLessThanOrEqual(DRAWS / 2);
    },
    40 * 60 * 1000,
  );

  it("has an outline row for every kind of speech, with a salutation first and a close last", () => {
    for (const kind of [
      "inaugural",
      "state-of-the-union",
      "state-of-the-state",
      "town-address",
      "campaign",
      "floor",
      "victory",
      "concession",
      "swearing-in",
    ]) {
      const row = outlineOf(kind);
      expect(row.sections[0], kind).toBe("salutation");
      expect(row.sections.at(-1), kind).toBe("close");
      for (const section of row.required)
        expect(row.sections, kind).toContain(section);
    }
    expect(outlineOf("inaugural").numberedAsks).toBe(false);
    expect(outlineOf("inaugural").ownRecord).toBe(false);
  });
});
