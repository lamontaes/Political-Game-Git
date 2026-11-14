import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { governmentSaidName } from "../core2/government-proper-name";
import { placeLocalities } from "../core2/places";
import { composeLocalAddress } from "./local-address";

// A town head's address says the place and its board the way people name
// them (Words lead, Nov 14: "Charter Township of Green Township Board" and
// "I want Charter Township of Green to hear" should be "the Green Township
// Board" and "Green Township"). Three township places are pinned by name and
// seed; the rule itself is checked on the listing forms.
setBookkeeping(false);

describe("a government is said as people say it", () => {
  it("puts the kind after the place and drops the legal form", () => {
    expect(governmentSaidName("Charter Township of Green")).toBe(
      "Green Township",
    );
    expect(governmentSaidName("Township of Haines")).toBe("Haines Township");
    expect(governmentSaidName("County of Maui")).toBe("Maui County");
    expect(governmentSaidName("Borough of Kodiak Island")).toBe(
      "Kodiak Island Borough",
    );
    expect(governmentSaidName("Town of Groton")).toBe("Groton");
    expect(governmentSaidName("City of McCall")).toBe("McCall");
    // Already said as people say it, or a name with no kind: kept.
    expect(governmentSaidName("DeKalb County")).toBe("DeKalb County");
    expect(governmentSaidName("Idaho")).toBe("Idaho");
  });
});

const PLACES = [
  {
    state: "US-MI",
    name: "Allendale, Michigan",
    seed: "s8a",
    place: "Allendale Township",
    board: "the Allendale Township Board",
  },
  {
    state: "US-MI",
    name: "Advance, Michigan",
    seed: "s8b",
    place: "Eveline Township",
    board: "the Eveline Township Board",
  },
  {
    state: "US-PA",
    name: "Aaronsburg, Pennsylvania",
    seed: "s8c",
    place: "Haines Township",
    board: "the Haines Township Board of Supervisors",
  },
] as const;

describe("a township head's address names the place and its board", () => {
  for (const row of PLACES) {
    it(`${row.name} (seed ${row.seed}) says ${row.place} and ${row.board}`, () => {
      const locality = [...placeLocalities(row.state)].find(
        (entry) => entry.displayName === row.name,
      );
      expect(locality, `${row.name} is a recorded place`).toBeTruthy();
      const world = buildBenchWorld(row.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: locality!.key,
      });
      const story = composeLocalAddress(world.core, "town");
      expect(story, `${row.name} gives an address`).not.toBeNull();
      const where = `${row.name}, seed ${row.seed}: ${story!.text}`;
      // The legal form is never said in a sentence.
      expect(story!.text, where).not.toMatch(/\b(?:Charter )?Township of\b/);
      expect(story!.text, where).not.toMatch(/\bTownship Township\b/);
      expect(story!.text, where).toContain(row.place);
      // The board is said once in full where the greeting names it.
      expect(story!.text.toLocaleLowerCase("en-US"), where).toContain(
        row.board.toLocaleLowerCase("en-US"),
      );
    }, 180_000);
  }
});
