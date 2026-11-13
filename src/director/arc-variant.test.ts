import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate, addDays } from "../core2/kernel/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  BRIBE_OFFERED,
  BRIBE_PRESSED,
  considerBribe,
  crimeRecord,
} from "../core2/modules/corruption";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import variantFile from "./data/arc-variants.json" with { type: "json" };
import situationFile from "./data/situation-types.json" with { type: "json" };
import { createDirector } from "./ledger";
import { chooseVariant } from "./arc-variant";
import { purposeScene, replyInScene } from "./purpose-scene";
import {
  composeSceneTalk,
  type PurposeType,
  type SceneTalk,
  type TreeNode,
} from "./scene-talk";

// One kind of scene, several arcs (owner, Nov 8, 9:50 voice note): the
// variants of the corruption scenes, picked from the records by one engine.
// The first half composes every variant from a generic fixture; the second
// plays a world drawn from all 56 places on a seed the builder did not
// choose, where different causes in one played year give different variants.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

type Row = { purpose: string; pull?: readonly string[] };
const FAMILIES = (
  variantFile as unknown as {
    families: Record<string, { variants: Record<string, Row> }>;
  }
).families;
const TYPES = (situationFile as unknown as { types: PurposeType[] }).types;
// A family is a purpose: the type that plays it (a reporter's call is the
// press-interview type, whose purpose is press-comment).
const typeOf = (family: string) =>
  TYPES.find((row) => row.key === family) ??
  TYPES.find((row) => row.purpose === family)!;
const played = (family: string, variant: string): PurposeType => {
  const type = typeOf(family);
  const purpose = FAMILIES[family]!.variants[variant]!.purpose;
  return purpose === type.purpose
    ? type
    : { ...type, purpose, family: type.purpose };
};

const base = enrichCivicInputs(
  buildPopulation({
    seed: "arc-variant-fixture",
    startedAt: "2021-01-01",
    minimumPeople: 300,
  }),
);
const age = (birth: string) =>
  ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
const adults = base.people.filter(
  (person) => person.tier !== "husk" && age(person.birthDate) >= 25,
);
const input = { ...base, playerId: adults[0]!.id };
const director = createDirector({ watch: [...initialFocusPeople(input)] });
const core = createLifeCore(input, { modules: [director.module] });
director.start(core);
advanceCore(core, "2021-01-03");
const askerId = adults[1]!.id;
const askedId = adults[0]!.id;
const fact = (text: string): Fact => ({ text, sourceRecordIds: [askerId] });
const generic: Record<string, Fact> = {
  name: fact("Pat Rivera"),
  first: fact(core.people.get(askedId)!.givenName),
  place: fact("the town"),
};

// What a donor's gift hands the scene (purpose-scene.ts, campaign-gift): the
// amount, and the bill the donor holds the strongest view on.
const donorFacts: Record<string, Fact> = {
  ...generic,
  money: fact("$2,500"),
  gift: fact("$2,500"),
  bill: fact("Bill 14"),
  "donor-bill": fact("Bill 14"),
  // The side the donor wants and what the bill is about (donor-ask-facts.ts).
  "want-against": fact("yes"),
  about: fact("free fares on public transit"),
};
// What a reporter's call hands the scene (purpose-scene.ts, press-interview):
// the bill, the outlet, and the facts the variant's reads add to the scene
// (`read-<name>`, set only where the read came to more than nothing).
const pressFacts: Record<string, Fact> = {
  ...generic,
  bill: fact("Bill 14"),
  outlet: fact("the Courier"),
  "vote-held": fact("Bill 14"),
  "read-town-against": fact("yes"),
  "read-scandal": fact("yes"),
  // The member's own vote on it, as the facts module reads it from the roll
  // (press-comment-facts.ts): a reporter calls after the vote.
  "own-vote": fact("yes"),
  "stand-against": fact("yes"),
  about: fact("free fares on public transit"),
  "next-dead": fact("yes"),
};
// What an accusation hands the plain arc's lines (a bill the accuser names).
const accuseFacts: Record<string, Fact> = { ...generic, bill: fact("Bill 14") };
// What a colleague's ask for a vote hands the scene: the bill, the bill the
// asker already voted for (`earlier`) and the reads that came to something.
const voteFacts: Record<string, Fact> = {
  ...generic,
  bill: fact("Bill 14"),
  earlier: fact("Bill 9"),
  "read-holds-post": fact("yes"),
  "read-same-party": fact("yes"),
  "read-favor-given": fact("yes"),
  "read-town-for-bill": fact("yes"),
  "read-close": fact("yes"),
};
// What an office-hours visit hands the scene (constituent-help-facts.ts): the
// employer lost and how long ago, the rent owed and its day, the pay and the
// floor, the relative who is ill, and the reads that came to something.
const helpFacts: Record<string, Fact> = {
  ...generic,
  employer: fact("Hartley Foods"),
  since: fact("two months"),
  owed: fact("$1,850"),
  deadline: fact("March 14th"),
  pay: fact("$6.50"),
  floor: fact("$7.25"),
  relative: fact("Dana"),
  "read-laid-off": fact("yes"),
  "read-notice-served": fact("yes"),
  "read-paid-under-floor": fact("yes"),
  "read-household-illness": fact("yes"),
  // The case on the office's books (caseFacts).
  "problem-work": fact("yes"),
  "money-left": fact("running low"),
  agency: fact("the workforce office"),
  "respond-in": fact("in seven days"),
};
// What a bribe hands the scene (bribe-facts.ts): the price and the bill.
const bribeFactsOf: Record<string, Fact> = {
  ...generic,
  amount: fact("about $400"),
  "favor-vote": fact("yes"),
  bill: fact("the free-fares ordinance"),
};
const factsOf = (family: string) =>
  family === "bribe-offer" || family === "bribe-pressed"
    ? bribeFactsOf
    : family === "donor-ask"
      ? donorFacts
      : family === "press-comment"
        ? pressFacts
        : family === "conflict-accuse"
          ? accuseFacts
          : family === "ask-vote"
            ? voteFacts
            : family === "constituent-help"
              ? helpFacts
              : generic;

const everyLine = (node: TreeNode | null, into: string[] = []): string[] => {
  if (!node) return into;
  for (const line of node.lines) into.push(line.text);
  if (node.end?.close) into.push(node.end.close.text);
  for (const reply of node.replies) {
    into.push(reply.line.text);
    everyLine(reply.next, into);
  }
  for (const branch of node.branches ?? []) everyLine(branch.node, into);
  return into;
};

/** The facts of a wage case: the problem is the pay, not a job lost. */
const wageCase = (facts: Record<string, Fact>): Record<string, Fact> => {
  const wage = {
    ...facts,
    "problem-wage": fact("yes"),
    agency: fact("the labor standards office"),
  };
  delete wage["problem-work"];
  delete wage["money-left"];
  return wage;
};

const compose = (
  family: string,
  variant: string,
  // A wage case is the short-pay scene's: the case's own problem (caseFacts).
  facts: Record<string, Fact> = variant === "short-pay"
    ? wageCase(factsOf(family))
    : factsOf(family),
  causeId = "cause-a",
): SceneTalk => {
  const result = composeSceneTalk(
    core,
    director,
    { askerId, askedId, causeId },
    played(family, variant),
    facts,
    {},
    { includeHeld: true },
  );
  expect(result.kind, `${family}/${variant} ${JSON.stringify(result)}`).toBe(
    "composed",
  );
  if (result.kind !== "composed") throw new Error("not composed");
  return result.talk;
};

describe("a kind with several arcs", () => {
  it("gives each corruption kind at least three variants besides its plain arc", () => {
    for (const family of [
      "bribe-offer",
      "bribe-pressed",
      "donor-ask",
      "press-comment",
    ]) {
      const names = Object.keys(FAMILIES[family]!.variants);
      expect(names.length, family).toBeGreaterThanOrEqual(4);
      expect(names).toContain("plain");
    }
  });

  it("composes every variant whole: a setup, a statement, replies, a close, a tree two deep", () => {
    for (const [family, row] of Object.entries(FAMILIES))
      for (const variant of Object.keys(row.variants)) {
        const talk = compose(family, variant);
        const where = `${family}/${variant}`;
        expect(talk.narration.length, where).toBeGreaterThan(0);
        expect(talk.depth, where).toBeGreaterThanOrEqual(2);
        expect(talk.tree.replies.length, where).toBeGreaterThanOrEqual(3);
        expect(talk.purpose, where).toBe(row.variants[variant]!.purpose);
        for (const text of everyLine(talk.tree))
          expect(text, where).not.toMatch(/[{}]/);
        // No end hangs on a missing piece or an ending no row names.
        expect(
          talk.gaps.filter((gap) =>
            /\/(reply|follow|close|end|ending)\//.test(gap),
          ),
          where,
        ).toEqual([]);
        // The engines read these ending ids: every variant keeps them whole.
        if (family === "bribe-offer")
          for (const id of ["took-it", "put-off"])
            expect(
              talk.endingCounts[id] ?? 0,
              `${where} ${id}`,
            ).toBeGreaterThan(0);
        else if (family === "donor-ask")
          for (const id of ["looking-again", "hearing-only", "put-off"])
            expect(
              talk.endingCounts[id] ?? 0,
              `${where} ${id}`,
            ).toBeGreaterThan(0);
        else if (family === "press-comment")
          for (const id of ["on-record", "no-comment"])
            expect(
              talk.endingCounts[id] ?? 0,
              `${where} ${id}`,
            ).toBeGreaterThan(0);
        else if (family === "ask-vote") {
          process.stdout.write(
            `ASK VOTE ENDINGS ${variant}: ${JSON.stringify(talk.endingCounts)}\n`,
          );
          // The keeps the engines read (favor-owed, promise, trust-lost,
          // relationship-strained) come from these endings.
          for (const id of ["vote-given", "traded"])
            expect(
              talk.endingCounts[id] ?? 0,
              `${where} ${id}`,
            ).toBeGreaterThan(0);
        } else if (family === "conflict-accuse")
          for (const id of ["disclosed", "feud"])
            expect(
              talk.endingCounts[id] ?? 0,
              `${where} ${id}`,
            ).toBeGreaterThan(0);
        else if (family === "owed-apology")
          for (const id of ["apology-taken", "grudge"])
            expect(
              talk.endingCounts[id] ?? 0,
              `${where} ${id}`,
            ).toBeGreaterThan(0);
        else if (family === "constituent-help") {
          // The keeps the engines read (promise, meeting-set,
          // relationship-strained) come from these endings.
          for (const id of ["will-call", "caseworker"])
            expect(
              talk.endingCounts[id] ?? 0,
              `${where} ${id}`,
            ).toBeGreaterThan(0);
        } else
          expect(
            talk.endingCounts["said-you-would-report"] ?? 0,
            where,
          ).toBeGreaterThan(0);
      }
  }, 300_000);

  it("makes the variants differ in their steps, their replies and their endings, not only their words", () => {
    for (const [family, row] of Object.entries(FAMILIES)) {
      const names = Object.keys(row.variants);
      const shape = (variant: string) => {
        const talk = compose(family, variant);
        return {
          state: talk.state.move,
          replies: talk.tree.replies
            .map((reply) => reply.line.move)
            .sort()
            .join("/"),
          endings: Object.keys(talk.endingCounts).sort().join("/"),
          lines: new Set(everyLine(talk.tree)),
        };
      };
      const shapes = new Map(names.map((name) => [name, shape(name)]));
      for (const a of names)
        for (const b of names) {
          if (a >= b) continue;
          const [x, y] = [shapes.get(a)!, shapes.get(b)!];
          const same =
            x.state === y.state &&
            x.replies === y.replies &&
            x.endings === y.endings;
          // Two variants may share a skeleton, never every line of it.
          const shared = [...x.lines].filter((line) =>
            y.lines.has(line),
          ).length;
          expect(
            !same || shared < Math.min(x.lines.size, y.lines.size) / 2,
            `${family}: ${a} and ${b} are one arc in two coats`,
          ).toBe(true);
        }
      // At least three variants differ in the step or the replies they offer.
      const skeletons = new Set(
        names.map(
          (name) => `${shapes.get(name)!.state}|${shapes.get(name)!.replies}`,
        ),
      );
      expect(skeletons.size, family).toBeGreaterThanOrEqual(3);
    }
  }, 300_000);

  it("says a variant's own lines, and the family's where the variant has none", () => {
    const small = compose("bribe-offer", "small");
    const plain = compose("bribe-offer", "plain");
    expect(small.state.move).toBe("offer");
    expect(plain.state.move).toBe("request");
    expect(small.state.text).not.toBe(plain.state.text);
    // The family's greeting is not the variant's.
    expect(small.state.parts[0]).toMatch(/^scene-talk\.state-offer\./);
  });

  it("picks a scene's lines on its cause: two causes between the same two people do not repeat each other", () => {
    const first = new Set<string>();
    for (let n = 0; n < 12; n += 1)
      first.add(
        compose("bribe-offer", "plain", bribeFactsOf, `cause-${n}`).state.text,
      );
    expect(first.size).toBeGreaterThan(1);
    // The same cause says the same words.
    expect(
      compose("bribe-offer", "friend", bribeFactsOf, "cause-z").state.text,
    ).toBe(
      compose("bribe-offer", "friend", bribeFactsOf, "cause-z").state.text,
    );
  });

  it("reads no kind's name: a kind without a row plays its one arc", () => {
    expect(
      chooseVariant(core, {
        family: "confirm-vote",
        askerId,
        askedId,
        cause: { id: "x", date: core.date, facts: {} },
      }),
    ).toBeNull();
  });
});

// A played world: offers to the player's seat through the game's own
// considerBribe (the offerer's choice to offer forced by dev mode's pick, as
// the dev harness does, so every offer is a real record), shaped by who the
// offerer is: how much money they hold, their tie to the player, what the
// favor is worth. A type stages at most six scenes in a season, so each part
// of the proof keeps inside it and moves the clock a season on.
const SEASON_DAYS = 100;

/** The indices of the replies that lead to the first end with this ending, or null. */
function pathTo(node: TreeNode, ending: string): number[] | null {
  for (const [index, reply] of node.replies.entries()) {
    if (reply.next?.end?.ending?.id === ending) return [index];
    const deeper = reply.next ? pathTo(reply.next, ending) : null;
    if (deeper) return [index, ...deeper];
  }
  return null;
}

describe(`variants in a played year (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(`${seed}:0`, "arc-variant");
  const where = `${place.name} (${place.key}), seed ${seed}:0`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(world.core);
  const me = world.playerId as PersonId;
  const { core: played, director: dir } = world;
  const residents = () =>
    [...played.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.tier !== "husk" &&
          row.id !== me &&
          row.birthDate <= "2000-01-01" &&
          row.livingCostDailyMinor > 0 &&
          row.liquidMinor > 0,
      )
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      );
  const entryOf = (eventId: string) =>
    dir.ledger.people
      .get(me)
      ?.schedule.find((row) => row.momentId.includes(eventId));
  const day = (days: number) =>
    advanceCore(played, addDays(makeIsoDate(played.date), days));

  it("gives different causes in one season different variants, each from its own records", () => {
    if (!dir.ledger.people.has(me)) dir.watch(played, me);
    const all = residents();
    const picks = [
      { row: all[0]!, stake: 600_000_000, hours: 0 },
      { row: all[1]!, stake: 300_000, hours: 0 },
      { row: all[2]!, stake: 1_500_000, hours: 400 },
      { row: all.at(-1)!, stake: 600_000_000, hours: 0 },
      { row: all.at(-2)!, stake: 300_000, hours: 0 },
    ];
    const crimes: { id: string; offerer: PersonId }[] = [];
    for (const [index, pick] of picks.entries()) {
      if (pick.hours)
        api.relationship(pick.row.id, me, "contact", pick.hours, undefined, {
          cause: "arc-variant-test",
          sourceId: pick.row.id,
        });
      const record = considerBribe(api, {
        offererId: pick.row.id,
        officialId: me,
        stakeMinor: pick.stake,
        subjectId: `contract:arc-variant-${index}`,
        pick: { offer: true },
      });
      if (record?.pending) crimes.push({ id: record.id, offerer: pick.row.id });
    }
    expect(crimes.length, `${where}: offers to the player`).toBeGreaterThan(2);
    day(2);
    const lines: string[] = [];
    const variants = new Map<string, string>();
    for (const crime of crimes) {
      const entry = entryOf(`${BRIBE_OFFERED}:${crime.id}`);
      expect(entry, `${where}: a moment for ${crime.id}`).toBeTruthy();
      const result = purposeScene(played, dir, me, entry!, {
        typeKey: "bribe-offer",
      });
      expect(
        result?.kind,
        `${where}: ${crime.id} ${JSON.stringify(result)}`,
      ).toBe("composed");
      if (result?.kind !== "composed") continue;
      const { scene } = result;
      expect(scene.variant, where).toBeTruthy();
      expect(scene.talk.purpose, where).toBe(scene.variant!.purpose);
      // The scene says why: the crime record the reads came from.
      expect(scene.variant!.recordIds, where).toContain(crime.id);
      variants.set(crime.id, scene.variant!.variant);
      lines.push(
        `  ${scene.variant!.variant.padEnd(9)} ${crime.id}\n    "${scene.talk.state.text}" reads ${JSON.stringify(
          Object.fromEntries(
            Object.entries(scene.variant!.reads).map(([k, v]) => [
              k,
              Math.round(v * 100) / 100,
            ]),
          ),
        )} scores ${scene
          .variant!.scores.slice(0, 3)
          .map((row) => `${row.variant}:${row.score.toFixed(2)}`)
          .join(" ")}`,
      );
    }
    process.stdout.write(
      `ARC VARIANTS offers, ${where}\n${lines.join("\n")}\n`,
    );
    expect(
      new Set(variants.values()).size,
      `${where}: ${[...variants.values()].join(",")}`,
    ).toBeGreaterThan(1);
  }, 1_800_000);

  it("plays a second ask from the same person as another scene, and the answer to the first reaches the engine that reads it", () => {
    day(SEASON_DAYS);
    const why: string[] = [];
    for (const offerer of residents().slice(0, 30)) {
      const first = considerBribe(api, {
        offererId: offerer.id,
        officialId: me,
        stakeMinor: 3_000_000,
        subjectId: `contract:first-${offerer.id}`,
        pick: { offer: true },
      });
      if (!first?.pending) continue;
      day(1);
      const entry = entryOf(`${BRIBE_OFFERED}:${first.id}`);
      const scene = entry
        ? purposeScene(played, dir, me, entry, { typeKey: "bribe-offer" })
        : null;
      const path =
        scene?.kind === "composed"
          ? pathTo(scene.scene.talk.tree, "handed-back")
          : null;
      if (scene?.kind !== "composed" || !entry || !path) {
        why.push(
          `${offerer.id}: ${entry ? "no direct refusal in its tree" : "no first scene"}`,
        );
        continue;
      }
      // The player turns it down in the scene, by the path the tree gives.
      const recordId = replyInScene(played, dir, me, entry, path, {
        typeKey: "bribe-offer",
      });
      expect(recordId, where).toBeTruthy();
      const written = played.durableLog.get(recordId!)!;
      expect(written.facts?.variant, where).toBe(scene.scene.variant!.variant);
      expect(written.facts?.ending, where).toBe("handed-back");
      expect(crimeRecord(api, first.id)!.pending, where).toBeUndefined();
      expect(
        played.durableLog.has(`corruption.bribe-refused:${first.id}`),
        where,
      ).toBe(true);
      // Days later the same person offers again about another matter.
      day(3);
      const second = considerBribe(api, {
        offererId: offerer.id,
        officialId: me,
        stakeMinor: 3_000_000,
        subjectId: `contract:second-${offerer.id}`,
        pick: { offer: true },
      });
      if (!second?.pending) {
        why.push(`${offerer.id}: no second offer`);
        continue;
      }
      day(1);
      const again = entryOf(`${BRIBE_OFFERED}:${second.id}`);
      expect(again, `${where}: the second offer is its own scene`).toBeTruthy();
      expect(again!.momentId, where).not.toBe(entry.momentId);
      const next = purposeScene(played, dir, me, again!, {
        typeKey: "bribe-offer",
      });
      expect(next?.kind, where).toBe("composed");
      if (next?.kind !== "composed") continue;
      const choice = next.scene.variant!;
      const score = (name: string, of = choice) =>
        of.scores.find((row) => row.variant === name)!.score;
      // The earlier refusal is on its reads, and the first ask had none.
      expect(choice.reads["refused-before"], where).toBeGreaterThan(0);
      expect(scene.scene.variant!.reads["refused-before"], where).toBe(0);
      expect(
        choice.recordIds.some((id) => id.includes(first.id)),
        where,
      ).toBe(true);
      // The asker's pull multiplies the world's score (arc-variant.ts): a
      // person at the floor of every facet the again variant lists never
      // presses again, however plain the earlier refusal, so it scores 0.
      const traits = played.people.get(offerer.id)?.traits ?? {};
      const facets = FAMILIES["bribe-offer"]!.variants.again!.pull ?? [];
      const pull =
        facets.reduce((sum, key) => sum + (traits[key] ?? 0), 0) /
        Math.max(1, facets.length);
      if (pull > -1) expect(score("again"), where).toBeGreaterThan(0);
      else expect(score("again"), where).toBe(0);
      process.stdout.write(`ARC VARIANTS repeat pull ${pull.toFixed(2)}\n`);
      expect(score("again", scene.scene.variant!), where).toBe(0);
      process.stdout.write(
        `ARC VARIANTS repeat, ${where}: first ${first.id} played ${scene.scene.variant!.variant} and was handed back (${recordId}); second ${second.id} played ${choice.variant}, the earlier refusal on its reads (${choice.recordIds.join(", ")}), again scored ${score("again").toFixed(2)}\n`,
      );
      return;
    }
    throw new Error(`${where}: ${why.join("; ")}`);
  }, 1_800_000);

  it("ends a variant's pressed scene in the ending the press engine reads", () => {
    day(SEASON_DAYS);
    const seen: string[] = [];
    for (const offerer of residents().slice(0, 60)) {
      const offer = considerBribe(api, {
        offererId: offerer.id,
        officialId: me,
        stakeMinor: 600_000_000,
        subjectId: `contract:pressed-${offerer.id}`,
        pick: { offer: true },
      });
      if (!offer?.pending) continue;
      // The refusal, written as the scene writes it; the offerer's own reasons decide whether they press.
      api.emit({
        id: `scene.reply:arc-variant-refuse:${offer.id}`,
        date: played.date,
        kind: "scene.reply",
        personIds: [me, offerer.id],
        placeId: played.people.get(me)!.placeId,
        facts: {
          typeKey: "bribe-offer",
          causeId: `${BRIBE_OFFERED}:${offer.id}`,
          ending: "handed-back",
        },
        source: { tag: "SOURCED", asOf: played.date, citation: "test" },
      });
      if (!played.durableLog.has(`${BRIBE_PRESSED}:${offer.id}`)) continue;
      day(3);
      const entry = entryOf(`${BRIBE_PRESSED}:${offer.id}`);
      if (!entry) continue;
      const result = purposeScene(played, dir, me, entry, {
        typeKey: "bribe-pressed",
      });
      if (result?.kind !== "composed") continue;
      const { scene } = result;
      seen.push(scene.variant!.variant);
      expect(scene.talk.purpose, where).toBe(scene.variant!.purpose);
      expect(
        scene.variant!.scores.map((row) => row.variant).sort(),
        where,
      ).toEqual(Object.keys(FAMILIES["bribe-pressed"]!.variants).sort());
      const path = pathTo(scene.talk.tree, "said-you-would-report");
      expect(path, `${where}: a reply that reports`).toBeTruthy();
      const before = played.logByKind.get("scandal.reported")?.size ?? 0;
      replyInScene(played, dir, me, entry, path!, { typeKey: "bribe-pressed" });
      const after = played.logByKind.get("scandal.reported")?.size ?? 0;
      expect(after, `${where}: the press learns of it`).toBe(before + 1);
      process.stdout.write(
        `ARC VARIANTS pressed, ${where}: ${offer.id} pressed as ${scene.variant!.variant} (${entry.momentId}), the reply that reports reached the press\n`,
      );
      return;
    }
    throw new Error(`${where}: no pressed scene (seen ${seen.join(",")})`);
  }, 1_800_000);
});
