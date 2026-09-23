import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 300_000 });

import { projectCampaignOffices } from "../presentation/campaign-office-discovery";
import { fileForOffice } from "../presentation/campaign-projection";
import {
  bindingForDistrict,
  offeredDistricts,
  recordDesiredDistrict,
  recordedDistrictForOffice,
} from "../presentation/district-selection";
import { createNewGameWorld } from "../presentation/new-game";
import {
  createExplicitGeographyLife,
  explicitNewGameSetup,
} from "../presentation/new-game-geography";
import { campaignForCandidate } from "../simulation";
import type { EntityId, World } from "../simulation";
import { CampaignWorkspace } from "./CampaignWorkspace";
import { DistrictResidencePanel } from "./DistrictResidencePanel";
import { NationwideCandidacyWorkspace } from "./NationwideCandidacyWorkspace";

/**
 * Found by playing: a thirty-year-old in Anchorage could not stand for the
 * state House or Senate. Anchorage crosses sixteen House districts, the
 * published join cannot say which one a given home is in, and the campaign
 * screen refused with "the game cannot say which one they live in". The
 * district chooser was on the screen, but choosing a district there only named
 * a seat; it never said where the home was, so the refusal stood.
 *
 * The same screen's "Who governs where you live" section told the player what
 * "the Census Government Units listing" records — a source's name, on a
 * player screen.
 */

const ANCHORAGE = "0203000";
const HOUSE = "us-ak-legislature-v1:house";
const SENATE = "us-ak-legislature-v1:senate";

interface Life {
  readonly world: World;
  readonly personId: EntityId;
}

function anchorageLife(seed: string): Life {
  const created = createExplicitGeographyLife({
    placeKey: ANCHORAGE,
    seed,
    startAge: 30,
    startKind: "normal",
    depth: "summarize-earlier-life",
  });
  return { world: created.game.world, personId: created.game.playerPersonId };
}

/**
 * A save from before a split town's resident was placed in a district: the
 * same life opened without the current opening version, which is exactly the
 * world such a save holds.
 */
function oldSaveAnchorageLife(seed: string): Life {
  const setup = explicitNewGameSetup({
    placeKey: ANCHORAGE,
    seed,
    startAge: 30,
    startKind: "normal",
    depth: "summarize-earlier-life",
  });
  const legacy = { ...setup };
  delete (legacy as { worldOpeningVersion?: unknown }).worldOpeningVersion;
  const game = createNewGameWorld(legacy);
  return { world: game.world, personId: game.playerPersonId };
}

function townDistricts(life: Life, officeKey: string): readonly string[] {
  return recordedDistrictForOffice(life.world, life.personId, officeKey)!
    .townDistrictRecordIds;
}

describe("an Anchorage life standing for the legislature", () => {
  it("can file for a state House seat in a district that crosses Anchorage", () => {
    const life = anchorageLife("anchorage-house");
    const row = projectCampaignOffices(life.world, life.personId).find(
      (office) => office.officeKey === HOUSE,
    );
    expect(row?.eligibility).not.toContain("more than one district");
    expect(row?.eligible).toBe(true);

    const recorded = recordedDistrictForOffice(
      life.world,
      life.personId,
      HOUSE,
    );
    expect(recorded).not.toBeNull();
    // Only a district that actually crosses the town; never elsewhere in Alaska.
    expect(recorded!.townDistrictRecordIds).toHaveLength(16);
    expect(recorded!.townDistrictRecordIds).toContain(
      recorded!.binding.recordId,
    );
    // Lived in Anchorage since birth, so in the district since then too.
    expect(recorded!.startedOn < "2000-01-01").toBe(true);

    const filed = fileForOffice(
      life.world,
      life.personId,
      recorded!.binding,
      HOUSE,
    );
    expect(campaignForCandidate(filed, life.personId)).not.toBeNull();
  });

  it("places the same seed's resident in the same district every time", () => {
    const first = anchorageLife("anchorage-same-seed");
    const again = anchorageLife("anchorage-same-seed");
    for (const office of [HOUSE, SENATE]) {
      expect(
        recordedDistrictForOffice(again.world, again.personId, office)!.binding
          .recordId,
      ).toBe(
        recordedDistrictForOffice(first.world, first.personId, office)!.binding
          .recordId,
      );
    }
    // And the seed is what decides it: across a handful of seeds the pick is
    // not one fixed district.
    const picks = new Set(
      ["a", "b", "c", "d", "e", "f"].map((suffix) => {
        const life = anchorageLife(`anchorage-spread-${suffix}`);
        return recordedDistrictForOffice(life.world, life.personId, HOUSE)!
          .binding.recordId;
      }),
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it("lets the player say their home is in another of the town's districts", () => {
    const life = anchorageLife("anchorage-change");
    const recorded = recordedDistrictForOffice(
      life.world,
      life.personId,
      HOUSE,
    )!;
    const otherId = townDistricts(life, HOUSE).find(
      (id) => id !== recorded.binding.recordId,
    )!;
    const other = offeredDistricts(
      life.world,
      life.world.people[life.personId]!.homeJurisdictionId,
      HOUSE,
    ).find((row) => row.recordId === otherId)!;
    const moved = recordDesiredDistrict(
      life.world,
      life.personId,
      bindingForDistrict(other),
    );
    const now = recordedDistrictForOffice(moved, life.personId, HOUSE)!;
    expect(now.binding.recordId).toBe(otherId);
    // Saying where in town you have always lived is not a move.
    expect(now.startedOn).toBe(recorded.startedOn);
    expect(() =>
      fileForOffice(moved, life.personId, now.binding, HOUSE),
    ).not.toThrow();
    // The district left behind is no longer this home's.
    expect(() =>
      fileForOffice(moved, life.personId, recorded.binding, HOUSE),
    ).toThrow();
  });

  it("an older save with no district can choose one on the chooser and file", () => {
    const life = oldSaveAnchorageLife("anchorage-old-save");
    const old = life.world;
    expect(recordedDistrictForOffice(old, life.personId, HOUSE)).toBeNull();
    const refused = projectCampaignOffices(old, life.personId).find(
      (office) => office.officeKey === HOUSE,
    );
    expect(refused?.eligible).toBe(false);

    const panel = renderToStaticMarkup(
      <DistrictResidencePanel
        world={old}
        personId={life.personId}
        officeKey={HOUSE}
        onWorldChange={() => undefined}
        onBindingChange={() => undefined}
      />,
    );
    expect(panel).toContain("district-residence-split-town");
    expect(panel).toContain("district-residence-unrecorded");

    const first = offeredDistricts(
      old,
      old.people[life.personId]!.homeJurisdictionId,
      HOUSE,
    ).find((row) => row.recordId === "state-lower:02009")!;
    const chosen = recordDesiredDistrict(
      old,
      life.personId,
      bindingForDistrict(first),
    );
    expect(
      projectCampaignOffices(chosen, life.personId).find(
        (office) => office.officeKey === HOUSE,
      )?.eligible,
    ).toBe(true);
    expect(() =>
      fileForOffice(chosen, life.personId, bindingForDistrict(first), HOUSE),
    ).not.toThrow();
  });
});

describe("the Anchorage campaign screen names no source", () => {
  const SOURCE_WORDS = /Census|listing|Government Units/;

  function visibleText(markup: string): string {
    return markup.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  }

  it("shows no Census, listing or Government Units wording", () => {
    const life = anchorageLife("anchorage-no-source");
    const recorded = recordedDistrictForOffice(
      life.world,
      life.personId,
      HOUSE,
    )!;
    const screens = [
      <CampaignWorkspace
        key="campaign"
        world={life.world}
        personId={life.personId}
        onWorldChange={() => undefined}
      />,
      <NationwideCandidacyWorkspace
        key="statewide"
        world={life.world}
        personId={life.personId}
        onWorldChange={() => undefined}
        onOpenCampaign={() => undefined}
      />,
      <DistrictResidencePanel
        key="district"
        world={life.world}
        personId={life.personId}
        officeKey={HOUSE}
        onWorldChange={() => undefined}
        onBindingChange={() => undefined}
      />,
    ];
    const text = screens
      .map((screen) => visibleText(renderToStaticMarkup(screen)))
      .join(" ");
    expect(text).toContain("Who governs where you live");
    expect(text).not.toMatch(SOURCE_WORDS);

    // Every office row's verdict, and a filed seat's own screen.
    for (const row of projectCampaignOffices(life.world, life.personId)) {
      expect(row.eligibility).not.toMatch(SOURCE_WORDS);
    }
    const filed = fileForOffice(
      life.world,
      life.personId,
      recorded.binding,
      HOUSE,
    );
    expect(
      visibleText(
        renderToStaticMarkup(
          <CampaignWorkspace
            world={filed}
            personId={life.personId}
            onWorldChange={() => undefined}
          />,
        ),
      ),
    ).not.toMatch(SOURCE_WORDS);
  });
});
