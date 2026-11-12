/** Actual policy delivery and its press reader, through a whole played year. */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import {
  interviewQuestions,
  officeholderSpeaker,
  townConcernReader,
} from "./modules/press";
import {
  countedNewsConcern,
  countedNewsGroups,
  stanceAfterCase,
  VIEWS_MODULE_ID,
  type Stance,
} from "./modules/views";
import { coreAPI, fillInPerson } from "./state";
import { residentsRuntime } from "./modules/residents";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "counted-policy-delivery");
it(`a delivered policy argument reaches counted adults and the press in ${place.name} (${replay})`, () => {
  setBookkeeping(false);
  const core = buildBenchWorld(place.seed, gameStartDate(), {
    placeKey: place.key,
    twoLevel: true,
  }).core;
  const api = coreAPI(core),
    town = lawChain(api).townPlaceId;
  const opened = core.date;
  let witness: Record<string, unknown> | undefined;
  for (let day = 1; day <= 365; day++) {
    advanceCore(core, addDays(makeIsoDate(opened), day));
    // Every retained delivery row must conserve its represented audience,
    // including later waves after the first useful witness.
    for (const row of api
      .moduleState(VIEWS_MODULE_ID)
      .table("countedStances")
      .rows()) {
      expect(
        Number(row.reachedCount),
        `${core.date}: ${row.id}`,
      ).toBeGreaterThan(0);
      expect(
        Number(row.reachedCount),
        `${core.date}: ${row.id}`,
      ).toBeLessThanOrEqual(Number(row.representedCount) + 1e-9);
      expect(Number.isFinite(row.totalChange)).toBe(true);
    }
    if (witness) continue;
    const groups = countedNewsGroups(api);
    for (const row of api
      .moduleState(VIEWS_MODULE_ID)
      .table("countedStances")
      .rows()) {
      const stance = row as unknown as Stance;
      const group = groups.find(
        (g) => g.id === row.groupId && g.placeId === town && g.count > 0,
      );
      const cause = stance.causes.at(-1),
        source = cause?.learnedFrom;
      if (!group || stance.strength <= 0 || !source?.startsWith("news:"))
        continue;
      const story = api
        .moduleState("news")
        .table("stories")
        .get(source.slice(5));
      if (!story?.desiredChange) continue;
      expect(story.topic).toBe(stance.topic);
      expect(cause!.eventId.startsWith(`news.read:${story.id}:`)).toBe(true);
      expect(Number(row.reachedCount)).toBeGreaterThan(0);
      expect(Number(row.reachedCount)).toBeLessThanOrEqual(
        Number(row.representedCount) + 1e-9,
      );
      expect(group.audienceCount).toBeGreaterThanOrEqual(group.count);
      const strength = countedNewsConcern(api, town, stance.topic);
      expect(strength).toBeGreaterThan(0);
      const concern = townConcernReader(api)(stance.topic);
      expect(concern).toBeGreaterThan(0);
      const speaker = [...(core.peopleByPlace.get(town) ?? [])]
        .map((id) => officeholderSpeaker(api, id))
        .find(Boolean)!;
      expect(speaker).toBeDefined();
      const questions = interviewQuestions(api, speaker);
      expect(questions.length).toBeGreaterThan(0);
      if (!questions.includes(stance.topic)) continue;
      // A mass fraction mixes reached/unreached people after the same capped
      // full-reader move. This pure edge check inserts no record into play.
      const input = {
        view: group,
        hearer: group,
        event: { id: "test:partial-case", date: core.date },
        topic: stance.topic,
        desiredChange: "enact",
        size: 1,
        nearness: 1,
        keepCauses: false,
      };
      const full = stanceAfterCase(api, input)!;
      const half = stanceAfterCase(api, { ...input, exposure: 0.5 })!;
      expect(half.strength).toBeCloseTo(full.strength / 2, 12);
      expect(stanceAfterCase(api, { ...input, exposure: 0 })).toBeUndefined();
      for (const desiredChange of ["enact", "repeal"]) {
        const prior: Stance = { ...full, desiredChange, strength: 0.99 };
        const whole = stanceAfterCase(api, { ...input, prior, size: 100 })!;
        const partial = stanceAfterCase(api, {
          ...input,
          prior,
          size: 100,
          exposure: 0.25,
        })!;
        const signed = (row: Stance) =>
          (row.desiredChange === input.desiredChange ? 1 : -1) * row.strength;
        expect(signed(partial)).toBeCloseTo(
          signed(prior) * 0.75 + signed(whole) * 0.25,
          12,
        );
      }
      witness = {
        town: place.name,
        placeKey: place.key,
        replay,
        worldSeed: core.seed,
        observedOn: core.date,
        groupId: group.id,
        adults: group.count,
        audienceAdults: group.audienceCount,
        stance,
        sourceStory: story,
        weightedStrength: strength,
        concern,
        interviewPersonId: speaker.personId,
        questions,
      };
      break;
    }
  }
  expect(
    witness,
    `${place.name} /${replay}: no real policy delivery reached the press reader`,
  ).toBeDefined();
  // Opening a real counted person's card fills them in on the same day.
  // Cache invalidation must immediately exclude the newly named adults.
  const store = residentsRuntime(core)!.store;
  const adultCount = () =>
    [...store.liveHouseholds()].reduce(
      (total, h) =>
        total +
        store
          .countedMembers(h)
          .filter(
            (m) =>
              !core.people.has(store.ids[m]!) &&
              ageOnDate(store.born[m]!, core.date) >=
                api.parameter("votingAge"),
          ).length *
          store.weightOf(h),
      0,
    );
  const groupCount = () =>
    countedNewsGroups(api).reduce((n, group) => n + group.count, 0);
  const before = groupCount();
  expect(before).toBeCloseTo(adultCount(), 7);
  const member = [...store.liveHouseholds()]
    .flatMap((h) => store.countedMembers(h))
    .find(
      (m) =>
        !core.people.has(store.ids[m]!) &&
        ageOnDate(store.born[m]!, core.date) >= api.parameter("votingAge"),
    );
  expect(member).toBeDefined();
  const filledId = store.ids[member!]!;
  fillInPerson(core, filledId);
  expect(core.people.has(filledId)).toBe(true);
  const after = groupCount();
  expect(after).toBeCloseTo(adultCount(), 7);
  expect(after).toBeLessThan(before);
  const proof = {
    ...witness,
    through: core.date,
    cacheFillIn: { personId: filledId, before, after },
  };
  if (process.env.COUNTED_POLICY_PROOF)
    writeFileSync(
      process.env.COUNTED_POLICY_PROOF,
      JSON.stringify(proof, null, 2) + "\n",
    );
  console.log(JSON.stringify(proof));
}, 300_000);
