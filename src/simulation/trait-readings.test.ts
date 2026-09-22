import { describe, expect, it } from "vitest";

import { peopleTraitPack } from "./people-trait-pack";
import { loadTraitPacks, type DecisionDeclaration } from "./trait-packs";
import { readTrait, registeredTraitConsiderations } from "./trait-readings";
import { ensurePeopleTraitCatalog, personTrait } from "./people-traits";
import { CONTACT_ANSWER_DECISION } from "./people-contact-decisions";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { ensurePeopleTraits } from "./people-traits";

const DECISIONS: readonly DecisionDeclaration[] = [CONTACT_ANSWER_DECISION];

function registry() {
  return loadTraitPacks([peopleTraitPack()], DECISIONS);
}

function life(seed: string) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed,
    startAge: 40,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    placeKey: "kentucky",
    household: "shares-a-home",
  });
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

describe("a trait is read through whatever pack declares it", () => {
  it("agrees with the reader it generalises, person for person", () => {
    const { world, personId } = life("reading-agrees");
    const others = world.personOrder.filter((id) => id !== personId);
    const written = ensurePeopleTraits(ensurePeopleTraitCatalog(world), others);
    const loaded = registry();

    for (const id of others) {
      for (const trait of loaded.traits.values()) {
        const generic = readTrait(written, id, trait);
        const original = personTrait(
          written,
          id,
          trait.key as Parameters<typeof personTrait>[2],
        );
        // Same value, same record, same word — the five behave identically
        // read through their pack as they did through their tuple.
        expect(generic.state).toBe("recorded");
        if (generic.state !== "recorded") continue;
        expect(generic.value).toBe(original.value);
        expect(generic.recordId).toBe(original.recordId);
        expect(generic.label).toBe(original.label);
      }
    }
  });

  it("says unrecorded rather than guessing, before anything is written", () => {
    const { world, personId } = life("reading-unwritten");
    const other = world.personOrder.find((id) => id !== personId)!;
    for (const trait of registry().traits.values()) {
      // The value a person is born with is not a fact about them. The old
      // reader handed it out anyway, which is how the person card named a
      // temperament nobody had observed.
      expect(readTrait(world, other, trait).state).toBe("unrecorded");
    }
  });

  it("refuses a record whose pack no longer declares its strength", () => {
    const { world, personId } = life("reading-strange-strength");
    const other = world.personOrder.find((id) => id !== personId)!;
    const written = ensurePeopleTraits(ensurePeopleTraitCatalog(world), [
      other,
    ]);
    const trait = registry().traits.get("people-mind-v1:risk")!;
    const reading = readTrait(written, other, trait);
    expect(reading.state).toBe("recorded");

    // `defining` was writable, never written, and decoded as though it were
    // `strong`. A pack that does not declare it now reads the record as
    // unrecorded rather than inventing a value for it.
    const tampered = {
      ...written,
      history: {
        ...written.history,
        personalityTendencies: written.history.personalityTendencies.map(
          (record) =>
            reading.state === "recorded" && record.id === reading.recordId
              ? { ...record, strength: "defining" as const }
              : record,
        ),
      },
    };
    expect(readTrait(tampered, other, trait).state).toBe("unrecorded");
  });
});

describe("a decision receives what packs declared, naming no trait itself", () => {
  it("produces a consideration for each lean the person is on the pole of", () => {
    const { world, personId } = life("considerations-agree");
    const other = world.personOrder.find((id) => id !== personId)!;
    const written = ensurePeopleTraits(ensurePeopleTraitCatalog(world), [
      other,
    ]);
    const loaded = registry();

    const produced = registeredTraitConsiderations(
      written,
      loaded,
      other,
      "contact:probe",
      CONTACT_ANSWER_DECISION.id,
    );

    for (const consideration of produced) {
      // The contract the hardcoded path had, unchanged: additive, citing the
      // record it rests on, arguing for an option rather than against one.
      expect(consideration.direction).toBe("supports");
      expect(consideration.sourceType).toBe("mind:personality");
      expect(consideration.sourceRefs).toHaveLength(1);
      expect(consideration.sourceRefs[0]!.kind).toBe("personality-tendency");
      expect(CONTACT_ANSWER_DECISION.options).toContain(
        consideration.optionKey,
      );
      expect(consideration.explanation.trim()).not.toBe("");
    }
    // Every consideration corresponds to a lean whose pole this person is on.
    const expected = loaded.leans
      .get(CONTACT_ANSWER_DECISION.id)!
      .filter((lean) => {
        const reading = readTrait(
          written,
          other,
          loaded.traits.get(lean.trait)!,
        );
        if (reading.state !== "recorded" || reading.value === 0) return false;
        return lean.pole === "low" ? reading.value < 0 : reading.value > 0;
      });
    expect(produced).toHaveLength(expected.length);
  });

  it("says nothing at all for somebody whose traits were never written", () => {
    const { world, personId } = life("considerations-unwritten");
    const other = world.personOrder.find((id) => id !== personId)!;
    expect(
      registeredTraitConsiderations(
        world,
        registry(),
        other,
        "contact:probe",
        CONTACT_ANSWER_DECISION.id,
      ),
    ).toEqual([]);
  });

  it("says nothing for a decision no pack leans on", () => {
    const { world, personId } = life("considerations-unknown");
    expect(
      registeredTraitConsiderations(
        world,
        registry(),
        personId,
        "x",
        "nothing.leans.on.this",
      ),
    ).toEqual([]);
  });
});
