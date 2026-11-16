import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { ADDRESS_FACT } from "./opening-facts";
import { OPENING_ADDRESS_EVENT } from "./opening-story";
import { addressPartsOf, rememberedOf, saidOf } from "./address-render";

// A speech that was given is a record of what was said (the lead, Nov 16):
// the President's opening is composed once on its day, its record keeps each
// sentence's pieces, the facts its slots said and their ties, and every view
// says it from the record. Pinned to the item's own place (Hawaii, run
// addr-a) and its seed: the record says the address the world composed, and a
// month later, after its speaker's own record changed, it says the same words.
it("says an address from its record, the same a month later and after its speaker's record changes", () => {
  const was = setBookkeeping(false);
  try {
    const place = drawPlace("addr-a", "address-now");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core } = world;
    const story = world.director.ledger.opening!;
    expect(story, where).toBeTruthy();
    const record = core.durableLog.get(
      `${OPENING_ADDRESS_EVENT}:${story.date}`,
    )!;
    const said = saidOf(record.facts);
    expect(addressPartsOf(record.facts), where).toEqual(story.address.parts);
    // Each piece carries its tie, and each sentence the records it rests on.
    for (const sentence of said) {
      expect(sentence.ties.length, where).toBe(sentence.pieces.length);
      expect(sentence.ties, where).not.toContain(null);
      expect(sentence.sources.length, where).toBeGreaterThan(0);
    }
    const quote = rememberedOf(record.facts);
    expect(quote, where).toBe(story.address.rememberedLine.text);
    for (const gone of ["text", "parts", "opening", "remembered"])
      expect(record.facts?.[`address:${gone}`], where).toBeUndefined();
    expect(record.facts?.[ADDRESS_FACT.said], where).toBeTruthy();

    // A month on, with the President renamed on their own record.
    advanceCore(core, addDays(makeIsoDate(core.date), 30));
    const president = core.people.get(story.president.id)!;
    president.familyName = `${president.familyName}-Renamed`;
    const later = core.durableLog.get(record.id)!;
    expect(addressPartsOf(later.facts), where).toEqual(story.address.parts);
    expect(rememberedOf(later.facts), where).toBe(quote);
  } finally {
    setBookkeeping(was);
  }
}, 120_000);
