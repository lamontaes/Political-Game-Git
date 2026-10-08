import { describe, expect, it } from "vitest";

import localInstitutionsJson from "../../data/research/places/local-institutions.json" with { type: "json" };
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import { LOCAL_BUSINESS_KINDS } from "./local-economy";
import { getNameCorpus } from "./names-data";
import { ensureStateJurisdictionForKey } from "./nationwide-world/state-executives";
import {
  ensurePressMediaOpening,
  ensurePressStateCoverage,
  mediaOutlets,
} from "./press/outlets";
import { TOWN_WORKPLACES } from "./living-world/town-employment";

type NamedRow = { readonly name: string };
type LocalInstitutionCorpus = {
  readonly places: Readonly<
    Record<string, Readonly<Record<string, readonly NamedRow[]>>>
  >;
  readonly counties: Readonly<
    Record<string, Readonly<Record<string, readonly NamedRow[]>>>
  >;
};

function nameKey(name: string): string {
  return name
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ");
}

const corpus = localInstitutionsJson as unknown as LocalInstitutionCorpus;
const recordedNames = new Set(
  [corpus.places, corpus.counties]
    .flatMap((records) => Object.values(records))
    .flatMap((record) => Object.values(record))
    .flat()
    .map((row) => nameKey(row.name)),
);

function opening() {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "real-names-only-public",
      startAge: 40,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
      placeKey: "3918000",
    }),
  ).game!;
}

describe("real names stay on public institutions", () => {
  it("keeps generated private business names separate from recorded institution names", () => {
    const families = getNameCorpus().familyNames;
    const states = lifePlaceStateIdentities();
    const generated = new Set<string>();

    for (const state of states) {
      for (const family of families) {
        const context = {
          town: state.name,
          county: `${state.name} County`,
          state: state.name,
          family,
        };
        for (const workplace of TOWN_WORKPLACES) {
          if (workplace.classification.startsWith("enterprise:")) {
            generated.add(nameKey(workplace.name(context)));
          }
        }
        for (const kind of LOCAL_BUSINESS_KINDS) {
          generated.add(nameKey(kind.name(family)));
        }
      }
    }

    expect([...generated].filter((name) => recordedNames.has(name))).toEqual(
      [],
    );
  });

  it("uses a fictional outlet plan for all 56 state and territory newsrooms", () => {
    const identities = lifePlaceStateIdentities();
    expect(identities).toHaveLength(56);
    let world = opening().world;
    const personId =
      world.control.kind === "person" ? world.control.personId : null;
    expect(personId).not.toBeNull();
    world = ensurePressMediaOpening(world, personId!);

    for (const identity of identities) {
      world = ensureStateJurisdictionForKey(world, identity.jurisdictionKey);
      const jurisdiction = stateJurisdictionForKey(identity.jurisdictionKey);
      expect(jurisdiction, identity.jurisdictionKey).toBeDefined();
      world = ensurePressStateCoverage(world, jurisdiction!.id);
    }

    const stateOutlets = mediaOutlets(world).filter(
      (outlet) => outlet.scope === "state",
    );
    expect(stateOutlets).toHaveLength(56);
    expect(
      stateOutlets.every((outlet) => /fictional/i.test(outlet.provenanceNote)),
    ).toBe(true);
    expect(
      stateOutlets.some((outlet) => recordedNames.has(nameKey(outlet.name))),
    ).toBe(false);
  }, 120_000);
});
