import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import OUTLINES from "./data/speech-outlines.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { officialsIn } from "../core2/modules/officials";
import { townSeats } from "../core2/modules/offices";
import { governmentProperName } from "../core2/government-proper-name";
import { placeStateKeys } from "../core2/places";
import { coreStateName } from "../core2/place-lookup";
import { placeStateKey } from "../core2/place-map";
import {
  questionAbout,
  questionFamily,
  questionFigures,
  questionNumber,
  questionSide,
  questionTo,
  questionToday,
  questionTodayWordings,
} from "../english/question-names";
import { composeLocalAddress } from "./local-address";
import { composeOpeningStory } from "./opening-story";
import {
  outlineOf,
  themeOfQuestion,
  type PlannedPoint,
} from "./speech-outline";

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
    // The clause before the comma is read from where it starts: a list
    // inside a "Because ..." clause ("affordable, reliable energy") keeps
    // the clause subordinate (W-F, Nov 12).
    const clauseBefore = (at: number) => {
      let from = at - 1;
      while (
        from > 0 &&
        !CLAUSE_START.test(parts[from]!) &&
        !SUBORDINATE.test(parts[from]!)
      )
        from -= 1;
      return parts.slice(from, at).join(", ");
    };
    return parts.some(
      (part, at) =>
        at > 0 &&
        CLAUSE_START.test(part) &&
        !SUBORDINATE.test(clauseBefore(at)) &&
        FINITE.test(parts[at - 1]!),
    );
  });
}

interface Speech {
  readonly who: string;
  readonly text: string;
  readonly theme: string | null;
  readonly asks: readonly string[];
  readonly points: readonly PlannedPoint[];
  /** The state whose speech it is; null for the President's, which names none. */
  readonly ownState: string | null;
  readonly sentences: readonly {
    readonly text: string;
    readonly facts: readonly string[];
    readonly stand?: { readonly about: string };
  }[];
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
      const shapes: string[] = [];
      const themes: string[] = [];
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
            points: opening!.points,
            ownState: null,
            sentences: opening!.address.sentences,
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
                    points: local.points,
                    ownState: own,
                    sentences: local.sentences,
                  },
                ]
              : [];
          }),
        ];
        if (opening!.asks[0]) leads.push(opening!.asks[0]);
        themes.push(opening!.theme ?? "none");
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
            if (themeOfQuestion(ask) !== speech.theme)
              failures.push(
                `${label}: ask ${ask} is outside the theme ${speech.theme}`,
              );
          // At least two points (the owner, on the rally: "a four-line rally
          // is not a speech"), and each opens on how its question stands
          // today before its ask: never a bare ask.
          const points = new Map<string, (typeof speech.sentences)[number][]>();
          for (const sentence of speech.sentences)
            if (sentence.stand)
              points.set(sentence.stand.about, [
                ...(points.get(sentence.stand.about) ?? []),
                sentence,
              ]);
          // A speech makes at least one point; it is shorter, not padded,
          // when its theme holds one question the speaker can speak to (the
          // words lead, Nov 12: "If only one or two questions fit the theme,
          // the speech is shorter; it does not pad with unrelated ones").
          if (points.size < 1)
            failures.push(
              `${label}: ${points.size} point(s); a speech makes at least one`,
            );
          // Each point says how its question stands today, in its paragraph:
          // first, after the belief or the question, or after the ask.
          for (const [about, said] of points)
            if (
              !said.some((sentence) =>
                // today, today-clause, today-question and their -2, -3 wordings
                sentence.facts.some((key) => key.startsWith("today")),
              )
            )
              failures.push(
                `${label}: the point on ${about} never says how it stands today: "${said.map((row) => row.text).join(" ")}"`,
              );
          // The six points of the lead's Nov 12 reading, by the plan.
          const pointShapes = new Set<string>();
          for (const point of speech.points) {
            const name = `${label}, point ${point.question}`;
            shapes.push(point.shape);
            // 3. No two points of a speech take the same shape.
            if (pointShapes.has(point.shape))
              failures.push(`${name}: shape ${point.shape} is used twice`);
            pointShapes.add(point.shape);
            // 1. The context's side is the ask's side, and it is said.
            // Any of the side's wordings: the planner says the one that makes
            // a different point from the belief beside it (words builder,
            // Nov 12: "judged by people who have done the job" then "to
            // people who know the work").
            const forms = (side: "for" | "against") =>
              [true, false].flatMap((law) =>
                questionTodayWordings(point.question, law, side),
              );
            const otherSide = point.side === "for" ? "against" : "for";
            if (!point.today || !forms(point.side).includes(point.today))
              failures.push(
                `${name}: today is not the ${point.side} side's ("${point.today}")`,
              );
            // The sentence said is the speaker's side's, never the other's.
            for (const other of [true, false].flatMap((law) =>
              questionTodayWordings(point.question, law, otherSide),
            ))
              if (other && speech.text.includes(other.slice(1, -1)))
                failures.push(
                  `${name}: says the other side's today ("${other}")`,
                );
            if (
              point.today &&
              !point.todays.some((said) =>
                speech.text.includes(said.slice(1, -1)),
              )
            )
              failures.push(
                `${name}: its today is not said ("${point.today}")`,
              );
            // 2. The belief's family is the question's, on the speaker's pole.
            const family = questionFamily(point.question);
            const pole = family
              ? point.side === "for"
                ? family.forPole
                : family.forPole === "a"
                  ? "b"
                  : "a"
              : null;
            if (
              point.family !== (family?.family ?? null) ||
              point.pole !== pole
            )
              failures.push(
                `${name}: belief ${point.family}/${point.pole}, the question's is ${family?.family}/${pole}`,
              );
            // 4. A figure only where the question's row lets this side use it.
            if (
              point.figure &&
              !questionFigures(point.question).some(
                (row) =>
                  row.measure === point.figure && row.side === point.side,
              )
            )
              failures.push(
                `${name}: figure ${point.figure} is not on the question's row for ${point.side}`,
              );
            // 5. A name that is several things never takes a singular verb.
            const about = questionAbout(point.question)!;
            if (questionNumber(point.question) === "many")
              for (const bad of [
                " is ",
                " isn't ",
                " does ",
                " has ",
                " comes ",
              ])
                if (
                  speech.text
                    .toLowerCase()
                    .includes(`${about.toLowerCase()}${bad}`)
                )
                  failures.push(
                    `${name}: "${about}${bad.trimEnd()}" disagrees in number`,
                  );
          }
          // 2. "Because ..." leads into what the speaker will do, never into
          // a statement of fact.
          for (const sentence of speech.text.split(/(?<=[.!?])\s+/))
            if (/^Because\b[^,]*,[^,]*\bis the law\b/.test(sentence))
              failures.push(
                `${label}: a belief leads into a fact: "${sentence}"`,
              );
          // 3. One belief frame, once (words lead, rule 38): at most one
          // sentence of an address opens "Because I".
          const becauseI = speech.text
            .split(/(?<=[.!?])\s+/)
            .filter((sentence) => /^Because I\b/.test(sentence));
          if (becauseI.length > 1)
            failures.push(
              `${label}: ${becauseI.length} sentences open "Because I"`,
            );
          // 4. A tag ("On crime, ...") is said at most once (words lead, round 4).
          const tags = speech.text
            .split(/(?<=[.!?])\s+/)
            .filter((sentence) => /^On (?!average\b)[a-z' ]+, /.test(sentence));
          if (tags.length > 1)
            failures.push(`${label}: ${tags.length} sentences open with a tag`);
          // 5. A meaning line plays only right after its own fact line, and
          // a past-tense condition takes no "now" opener (words lead, round 6).
          for (const [at, sentence] of speech.sentences.entries()) {
            const meaning =
              sentence.facts.includes("context-name") &&
              !sentence.facts.includes("context-years") &&
              !sentence.facts.includes("figure-ties") &&
              sentence.facts.some(
                (key) => key.startsWith("context-") && key !== "context-name",
              );
            if (
              meaning &&
              !speech.sentences[at - 1]?.facts.includes("context-years")
            )
              failures.push(
                `${label}: a meaning line has no fact line before it: "${sentence.text}"`,
              );
            if (
              /^(As of right now|For now|As of today|As it is now|These days|As things stand|As matters stand|Today|At this moment|As we meet tonight|As we stand here), (the|a|an|some)?\s?[^,.]*\b(went|rose|fell|grew|dropped|was|were|became|ended|passed|took|raised|cut|lost|gained)\b/.test(
                sentence.text,
              )
            )
              failures.push(
                `${label}: a past-tense condition opens with a "now": "${sentence.text}"`,
              );
          }
          // 6. Removed by kind: the last office's lesson, a greeting that is
          // not a list, a close that warns against its own ask.
          for (const [pattern, why] of [
            [/\bI learned\b/, "the last office's lesson"],
            [/before anything else/, "a greeting fragment"],
            [/folks will feel it for years/, "a close that reads as a warning"],
          ] as const)
            if (pattern.test(speech.text))
              failures.push(`${label}: says ${why}`);
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
          // No state named outside its own jurisdiction's speech; a question
          // that is about a place ("statehood for the District of Columbia")
          // names it in its own words.
          const withoutAsks = speech.asks.reduce(
            (text, ask) =>
              [
                questionAbout(ask),
                questionTo(ask),
                questionToday(ask, true, "for"),
                questionToday(ask, false, "for"),
                questionToday(ask, true, "against"),
                questionToday(ask, false, "against"),
                questionSide(ask, "for"),
                questionSide(ask, "against"),
                questionSide(ask, "repeal"),
              ].reduce(
                (rest, words) => (words ? rest.split(words).join("") : rest),
                text,
              ),
            speech.text,
          );
          // A governor names their own state ("West Virginia" holds
          // "Virginia"), so its name is taken out before the others are read.
          const ownName = stateNames.find(
            (state) => state.key === speech.ownState,
          )?.name;
          // A speaker may name any government they sit in or under, from the
          // place record (words lead, Nov 14: Delaware County in Oklahoma is
          // not a stray state). This checks the rule; it does not loosen it:
          // a state that is neither the speaker's own nor the name of one of
          // their governments still fails.
          const governmentNames = new Set<string>(
            speech.ownState
              ? townSeats(api).flatMap((seat) => {
                  const proper = governmentProperName(
                    seat.office.governmentName,
                    seat.office.jurisdiction,
                  );
                  const bare = proper
                    .replace(/^\w+ of /, "")
                    .replace(/ (?:County|Parish|Borough)$/, "");
                  return [proper, bare];
                })
              : [],
          );
          // A drawn person's own name is not a place ("Virginia Shah" is
          // a person, not the state), so the names of the people the speech
          // names are taken out too, whole, before the states are read.
          const unowned = [
            ...(ownName ? [ownName] : []),
            ...governmentNames,
            ...people.map((person) => person.name),
          ]
            .sort((a, b) => b.length - a.length)
            .reduce((text, name) => text.split(name).join(""), withoutAsks);
          for (const state of stateNames)
            if (
              // "Washington" is said for the federal government as often as for the state.
              state.name !== "Washington" &&
              state.key !== speech.ownState &&
              new RegExp(`\\b${state.name}\\b`).test(unowned)
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
      // 3. Across the draws no shape opens more than half the points.
      console.log(`POINT SHAPES seed ${seed}: ${shapes.join(", ")}`);
      for (const shape of new Set(shapes))
        expect(
          shapes.filter((row) => row === shape).length,
          `seed ${seed}: shapes ${shapes.join(", ")}`,
        ).toBeLessThanOrEqual(shapes.length / 2);
      // The leading ask is not one question in more than half the draws
      // ("why is it always stock trading?"): the theme comes from the
      // speaker's own issues first.
      console.log(`LEADING ASKS seed ${seed}: ${leads.join(", ")}`);
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
      // The President's theme comes from the person: at least four different
      // themes lead across the draws (owner: "why is it always stock
      // trading?").
      console.log(`THEMES seed ${seed}: ${themes.join(", ")}`);
      expect(
        new Set(themes).size,
        `seed ${seed}: themes ${themes.join(", ")}`,
      ).toBeGreaterThanOrEqual(4);
    },
    40 * 60 * 1000,
  );

  it("puts how a question stands before the ask in every point shape (rule 44)", () => {
    for (const [name, shape] of Object.entries(OUTLINES.pointShapes.shapes)) {
      const moves = shape.moves as readonly string[];
      const asked = moves.indexOf("ask");
      expect(asked, name).toBeGreaterThan(-1);
      for (const before of ["today", "figure", "question"])
        if (moves.includes(before))
          expect(moves.indexOf(before), `${name}: ${before}`).toBeLessThan(
            asked,
          );
    }
  });

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
