/**
 * How a heard speech lands follows how the listener feels about the speaker,
 * the one read every decision that weighs a person uses (`feelingBetween`):
 * their tie row and the hours other engines keep for two people with no tie
 * row (members who sit together), less any grudge the listener holds. The
 * term never goes below none, so it stays inside its fitted weight.
 */
import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import { closenessBetween, registerSharedHours } from "../closeness";
import { createLifeCore } from "../life";
import { buildPopulation } from "../population";
import { coreAPI } from "../state";
import { RUN_SEED } from "../trait-test-kit";
import { drawPlace } from "../../../tests/golden-path/place";
import { standingWith, viewOf, viewsModule } from "./views";

const SEED = `${RUN_SEED}:feeling`;
const place = drawPlace(SEED, "feeling-read");
const input = buildPopulation({
  seed: SEED,
  placeKey: place.key,
  startedAt: "2025-01-20",
  minimumPeople: 900,
});
const core = createLifeCore(input, { modules: [viewsModule] });
const api = coreAPI(core);
const today = makeIsoDate(input.startedAt);
const adults = [...core.people.values()]
  .filter(
    (p) =>
      p.alive &&
      ageOnDate(makeIsoDate(p.birthDate), today) >= 18 &&
      viewOf(api, p.id) !== null,
  )
  .sort((a, b) => a.id.localeCompare(b.id));
const tieKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

const standing = (listenerId: string, speakerId: string) =>
  standingWith(
    api,
    viewOf(api, listenerId)!,
    speakerId,
    "fixture:park",
    "build-park",
  );

// A fixture: the drives engine's own grudge row, put on the listener directly
// (a drive normally forms from an event the person lived through).
const grudgeAgainst = (holderId: string, targetId: string, strength: number) =>
  core.people.get(holderId)!.drives.set(`grudge:grudge:${targetId}`, {
    id: `grudge:grudge:${targetId}`,
    kind: "grudge",
    topic: `grudge:${targetId}`,
    desiredChange: "fixture.grudge",
    strength,
    sourceEventId: "fixture:feeling-read",
  });

describe(`how a speech lands in ${place.name} (seed ${SEED})`, () => {
  it("a listener who holds a grudge against the speaker stands them lower than the same listener without one", () => {
    // A listener and speaker with a real tie between them, so there is
    // closeness for the grudge to take from.
    const pair = adults
      .flatMap((listener) =>
        adults
          .filter((other) => other.id !== listener.id)
          .map((speaker) => ({ listener, speaker })),
      )
      .find(
        ({ listener, speaker }) =>
          closenessBetween(core, listener.id, speaker.id) > 0.1 &&
          !core.people
            .get(listener.id)!
            .drives.has(`grudge:grudge:${speaker.id}`),
      );
    expect(pair, "a tie in the drawn world").toBeDefined();
    const { listener, speaker } = pair!;
    const before = standing(listener.id, speaker.id);
    grudgeAgainst(listener.id, speaker.id, 0.8);
    const after = standing(listener.id, speaker.id);
    console.log(
      `grudge: ${place.name}, seed ${SEED}, ${listener.id} to ${speaker.id}: standing ${before.toFixed(4)} then ${after.toFixed(4)} with a grudge of 0.8`,
    );
    expect(after).toBeLessThan(before);
  });

  it("a grudge never takes the term below none: with no tie, the grudge changes nothing", () => {
    const pair = adults
      .flatMap((listener) =>
        adults
          .filter((other) => other.id !== listener.id)
          .map((speaker) => ({ listener, speaker })),
      )
      .find(
        ({ listener, speaker }) =>
          !core.relationships.has(tieKey(listener.id, speaker.id)) &&
          closenessBetween(core, listener.id, speaker.id) === 0 &&
          !core.people
            .get(listener.id)!
            .drives.has(`grudge:grudge:${speaker.id}`),
      );
    expect(pair, "two strangers in the drawn world").toBeDefined();
    const { listener, speaker } = pair!;
    const before = standing(listener.id, speaker.id);
    grudgeAgainst(listener.id, speaker.id, 1);
    expect(standing(listener.id, speaker.id)).toBe(before);
  });

  it("two people with no tie row who share hours another engine keeps stand closer than strangers", () => {
    const pair = adults
      .flatMap((listener) =>
        adults
          .filter((other) => other.id > listener.id)
          .map((speaker) => ({ listener, speaker })),
      )
      .find(
        ({ listener, speaker }) =>
          !core.relationships.has(tieKey(listener.id, speaker.id)) &&
          !core.people
            .get(listener.id)!
            .drives.has(`grudge:grudge:${speaker.id}`),
      );
    expect(pair, "two with no tie row").toBeDefined();
    const { listener, speaker } = pair!;
    const strangers = standing(listener.id, speaker.id);
    // The hook sittings use: an engine's own record of time two people spent together.
    registerSharedHours((_, a, b) =>
      (a === listener.id && b === speaker.id) ||
      (a === speaker.id && b === listener.id)
        ? 300
        : 0,
    );
    const colleagues = standing(listener.id, speaker.id);
    console.log(
      `shared hours: ${place.name}, seed ${SEED}, ${listener.id} and ${speaker.id}: standing ${strangers.toFixed(4)} as strangers, ${colleagues.toFixed(4)} with 300 shared hours`,
    );
    expect(colleagues).toBeGreaterThan(strangers);
  });
});
