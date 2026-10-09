import { describe, expect, it } from "vitest";

import nominationRules from "../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import governmentFormBank from "../../data/english/parts/government-form.json" with { type: "json" };
import governmentFormMoves from "../../data/english/government-form-moves.json" with { type: "json" };
import { drawRandomPlace } from "../../tests/support/random-place";
import { searchLifePlaces, type LifePlace } from "../simulation/life-places";
import {
  municipalGovernmentForLifePlace,
  municipalGovernments,
  primaryReading,
  type MunicipalGovernment,
} from "../simulation/municipal-government";
import type { PartGradeLedger } from "./english-grades";
import { governmentFormTerm } from "./government-form-english";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectWorld39News } from "./world39-news";

const MOVES = governmentFormMoves.moves as Record<string, string>;

function recordedForm(government: MunicipalGovernment | null): string | null {
  return government ? primaryReading(government).form : null;
}

function termFor(form: string): string {
  const parts = governmentFormBank.parts.filter(
    (part) => part.move === MOVES[form],
  );
  expect(parts, form).toHaveLength(1);
  return parts[0]!.text;
}

function nameSays(name: string, term: string): boolean {
  const words = (text: string) =>
    ` ${text
      .toLowerCase()
      .replace(/[^a-z]+/g, " ")
      .trim()} `;
  return words(name).includes(words(term));
}

function expectTerm(government: MunicipalGovernment, label: string): void {
  const form = recordedForm(government);
  const term = governmentFormTerm(government);
  if (
    !form ||
    !(form in MOVES) ||
    nameSays(government.displayName, termFor(form))
  ) {
    expect(term, `${label} ${form}`).toBeNull();
    return;
  }
  expect(term, `${label} ${form}`).toEqual({
    text: termFor(form),
    parts: [
      `bank:${governmentFormBank.parts.find((part) => part.move === MOVES[form])!.key}`,
    ],
  });
}

function hasATerm(place: LifePlace): boolean {
  const government = municipalGovernmentForLifePlace(place);
  return government !== null && governmentFormTerm(government) !== null;
}

function openingNews(seed: string, place: LifePlace) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 34,
      questionnaire: "skipped",
    }),
  ).game!;
  console.info("GOVERNMENT_FORM_NEWS", {
    seed,
    placeKey: place.key,
    place: place.displayName,
    personId: game.playerPersonId,
  });
  return projectWorld39News(game.world, game.playerPersonId);
}

describe("how a town's government is organized, from its recorded form", () => {
  it("has one term in the bank for every recorded form it names", () => {
    for (const form of Object.keys(MOVES)) termFor(form);
  });

  it("names the term for every government whose form is recorded, and nothing for one that is not", () => {
    const governments = municipalGovernments();
    expect(
      governments.some((government) => recordedForm(government) === null),
    ).toBe(true);
    for (const government of governments)
      expectTerm(government, government.key);
  });

  it("does the same for every town and city in each of the 56 places", () => {
    const states = Object.keys(
      (nominationRules as { places: Record<string, unknown> }).places,
    );
    expect(states).toHaveLength(56);
    let named = 0;
    for (const state of states) {
      for (const place of searchLifePlaces("", 100_000, {
        stateJurisdictionKey: state,
      })) {
        if (place.scope === "state") continue;
        const government = municipalGovernmentForLifePlace(place);
        if (!government) continue;
        expectTerm(government, place.displayName);
        if (governmentFormTerm(government)) named += 1;
      }
    }
    expect(named).toBeGreaterThan(0);
  });

  it("shows no term that the government's own name already says", () => {
    const named = municipalGovernments().filter((government) => {
      const form = recordedForm(government);
      return (
        form !== null &&
        form in MOVES &&
        nameSays(government.displayName, termFor(form))
      );
    });
    expect(named.length).toBeGreaterThan(0);
    for (const government of named)
      expect(governmentFormTerm(government), government.displayName).toBeNull();
  });

  it("shows nothing once the owner grades the only term for a form down", () => {
    const government = municipalGovernments().find(
      (candidate) => governmentFormTerm(candidate) !== null,
    )!;
    const term = governmentFormTerm(government)!;
    const held: PartGradeLedger = {
      schema: "english-part-grades/1",
      batches: ["batch-test"],
      parts: {
        [term.parts[0]!]: {
          good: 0,
          bad: 1,
          fix: 0,
          sharedGood: 0,
          sharedBad: 0,
          sharedFix: 0,
        },
      },
    };
    expect(governmentFormTerm(government, held)).toBeNull();
  });

  it(
    "shows on News under the government of a randomly drawn town whose form is recorded",
    { timeout: 240_000 },
    () => {
      const seed = "government-form-news-oct9";
      const place = drawRandomPlace(seed, hasATerm);
      const government = openingNews(seed, place).standing.find(
        (item) => item.kind === "government",
      );
      expect(government, place.displayName).toBeDefined();
      expect(government!.formTerm).toBe(
        governmentFormTerm(municipalGovernmentForLifePlace(place)!)!.text,
      );
    },
  );

  it(
    "shows no term on News where the form is not recorded",
    { timeout: 240_000 },
    () => {
      const seed = "government-form-quiet-oct9";
      const place = drawRandomPlace(
        seed,
        (candidate) =>
          municipalGovernmentForLifePlace(candidate) !== null &&
          !hasATerm(candidate),
      );
      const news = openingNews(seed, place);
      for (const item of news.standing) expect(item.formTerm).toBeNull();
    },
  );
});
