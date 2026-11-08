import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "./life";
import { closenessBetween } from "./closeness";
import { FAMILY_CONTACT, FAMILY_GATHERING_MISSED } from "./modules/kin-contact";
import { livesElsewhere } from "./modules/moves";
import { partnershipsModule } from "./modules/partnerships";
import { registerModule } from "./state";
import { drawPlace } from "../../tests/golden-path/place";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreEventInput } from "./types";

// Word from relatives elsewhere (Lives, Nov 8, 2026): a town resident's close
// kin living elsewhere write to them in proportion to the tie's closeness; a
// tie at nothing writes nothing. A place drawn from all 56, one year.
const drawn = drawPlace("kin-contact", "lives-kin-contact");
const seed = process.env.GOLDEN_PATH_SEED ?? drawn.seed;
const key = process.env.GOLDEN_PATH_PLACE_KEY ?? drawn.key;
const input = generatedOpening(
  { seed, key },
  { economy: false, settings: { population: 700 } },
);
const core = createLifeCore(input, { modules: [partnershipsModule] });
const events: CoreEventInput[] = [];
registerModule(core, {
  id: "kin-contact:watch",
  eventKinds: [FAMILY_CONTACT, FAMILY_GATHERING_MISSED],
  onEvent: (_api, event) => void events.push(event),
});
const end = new Date(`${input.startedAt}T00:00:00Z`);
end.setUTCFullYear(end.getUTCFullYear() + 1);
advanceCore(core, end.toISOString().slice(0, 10));

const missed = () =>
  events.filter((row) => row.kind === FAMILY_GATHERING_MISSED);

describe(`word from relatives elsewhere in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("has relatives elsewhere write to town residents they are close to", () => {
    const contacts = events.filter((e) => e.kind === FAMILY_CONTACT);
    expect(contacts.length).toBeGreaterThan(0);
    for (const row of contacts) {
      const [reader, writer] = row.personIds.map((id) => core.people.get(id)!);
      expect(reader!.tier).not.toBe("husk");
      expect(livesElsewhere(core, writer!)).toBe(true);
      expect(reader!.familyIds.has(writer!.id)).toBe(true);
      expect(Number(row.facts?.closeness)).toBeGreaterThan(0);
      expect(row.facts?.writerId).toBe(writer!.id);
    }
  });

  it("misses the closest relative elsewhere at a birthday table at home", () => {
    expect(missed().length).toBeGreaterThan(0);
    for (const row of missed()) {
      const [honoree, absent] = row.personIds.map((id) => core.people.get(id)!);
      expect(row.facts?.occasion).toBe("birthday");
      expect(honoree!.tier).not.toBe("husk");
      expect(livesElsewhere(core, absent!)).toBe(true);
      expect(row.date.slice(5)).toBe(honoree!.birthDate.slice(5));
    }
  });

  it("writes each contact as time together on the tie, so closeness is read from it", () => {
    const row = events.find((e) => e.kind === FAMILY_CONTACT)!;
    const [reader, writer] = row.personIds;
    expect(
      core.relationships.get(
        reader! < writer! ? `${reader}:${writer}` : `${writer}:${reader}`,
      )?.lastContactDate,
    ).toBeTruthy();
    expect(closenessBetween(core, reader!, writer!)).toBeGreaterThan(0);
  });
});
