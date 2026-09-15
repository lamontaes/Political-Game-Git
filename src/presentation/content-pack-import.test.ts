import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CONTENT_PACK_API,
  parseRuntimeContentPack,
  registerRuntimeContentPacks,
  type RuntimeContentPack,
} from "../simulation/runtime-content-packs";
import { canonicalJson } from "../simulation/canonical-json";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { simulationMinutesBetween } from "../simulation/dates";
import { eligibleEpisodeBeats } from "../simulation/life-episodes";
import { openingLifeFamily } from "../simulation/opening-life-content";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { importContentPack } from "./content-pack-import";
import {
  createBrowserWorldRecord,
  readStoredRecord,
  type BrowserSaveStore,
} from "./browser-world-repository";
import {
  emptyInterfaceState,
  parsePortableSave,
  importPortableSave,
  PORTABLE_SAVE_KIND,
  PORTABLE_SAVE_FORMAT_VERSION,
  serializePortableSave,
  type PortableSaveBundle,
} from "./portable-save";
import {
  availableOpeningLifeScenes,
  chooseOpeningLifeScene,
  currentOpeningLifeScene,
  openNextLifeScene,
} from "./life-scene-flow";

const settingsText = readFileSync(
  new URL(
    "../../examples/content-packs/community-timing.json",
    import.meta.url,
  ),
  "utf8",
);
const encounterText = readFileSync(
  new URL(
    "../../examples/content-packs/community-encounter.json",
    import.meta.url,
  ),
  "utf8",
);
const settings = parseRuntimeContentPack(settingsText);
const encounter = parseRuntimeContentPack(encounterText);
const sceneKey = "mod.example.window-box.afternoon";
function start(seed = "foundation-external-pack") {
  return createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: "kentucky",
    startKind: "custom",
    startAge: 35,
    household: "lives-alone",
  });
}
function install(world: ReturnType<typeof start>["world"]) {
  return importContentPack(
    importContentPack(world, settingsText),
    encounterText,
  );
}

describe("runtime external content through the existing ordinary scene writers", () => {
  it("uses existing browser/portable admission and refuses damaged imports before any store call", async () => {
    const world = install(start().world);
    const record = createBrowserWorldRecord(world, "2026-09-13T12:00:00.000Z");
    expect(record.metadata.snapshotFormatVersion).toBe(16);
    expect(readStoredRecord(record).kind).toBe("healthy");
    const bundle: PortableSaveBundle = {
      kind: PORTABLE_SAVE_KIND,
      formatVersion: PORTABLE_SAVE_FORMAT_VERSION,
      exportedAt: "2026-09-13T12:00:00.000Z",
      artProvenance: "production",
      sourceSlotId: record.saveId,
      world: record,
      interface: { status: "included", state: emptyInterfaceState() },
    };
    const original = serializePortableSave(bundle);
    expect(parsePortableSave(original).status).toBe("ok");
    const damaged = JSON.parse(record.payload);
    damaged.world.contentPacks.api = "future-api";
    const badRecord = { ...record, payload: JSON.stringify(damaged) };
    expect(readStoredRecord(badRecord).kind).toBe("damaged");
    const calls: string[] = [];
    const store = new Proxy(
      {},
      {
        get(_target, property) {
          calls.push(String(property));
          throw new Error("Must refuse before touching the store.");
        },
      },
    ) as BrowserSaveStore;
    const result = await importPortableSave(store, {
      ...bundle,
      world: badRecord,
    });
    expect(result.status).toBe("error");
    expect(calls).toEqual([]);
    expect(serializePortableSave(bundle)).toBe(original);
  });

  it.each([12, 17])(
    "imports external authored values, performs a %i-minute ordinary choice and reopens exact history",
    (duration) => {
      const game = start();
      const original = serializeWorld(game.world);
      const authoredSettings = {
        ...settings,
        version: "1.1.0",
        durations: settings.durations.map((entry) => ({
          ...entry,
          minutes: duration,
        })),
      };
      const authoredEncounter = {
        ...encounter,
        version: "1.1.0",
        dependencies: [{ id: settings.id, version: "1.1.0" }],
        scenes: encounter.scenes.map((entry) => ({
          ...entry,
          minutes: duration,
        })),
      };
      const imported =
        duration === 12
          ? install(game.world)
          : importContentPack(
              importContentPack(game.world, JSON.stringify(authoredSettings)),
              JSON.stringify(authoredEncounter),
            );
      expect(serializeWorld(game.world)).toBe(original);
      expect(imported.currentMoment).toEqual(game.world.currentMoment);
      expect(imported.history).toEqual(game.world.history);
      expect(
        availableOpeningLifeScenes(imported, game.playerPersonId).some(
          (entry) => entry.definition.key === sceneKey,
        ),
      ).toBe(true);
      let world = imported;
      for (let count = 0; count < 24; count++) {
        world = openNextLifeScene(world, game.playerPersonId);
        const scene = currentOpeningLifeScene(world, game.playerPersonId);
        expect(scene).not.toBeNull();
        if (scene!.definition.key === sceneKey) break;
        world = chooseOpeningLifeScene(
          world,
          game.playerPersonId,
          scene!.eventId,
          scene!.choices[0]!.key,
        );
      }
      const before = currentOpeningLifeScene(world, game.playerPersonId)!;
      expect(before.definition.key).toBe(sceneKey);
      const reopenedOpen = deserializeWorld(serializeWorld(world));
      expect(
        currentOpeningLifeScene(reopenedOpen, game.playerPersonId),
      ).toEqual(before);
      const completed = chooseOpeningLifeScene(
        reopenedOpen,
        game.playerPersonId,
        before.eventId,
        "rest",
      );
      expect(
        simulationMinutesBetween(world.currentMoment, completed.currentMoment),
      ).toBe(duration);
      expect(
        completed.history.events.filter(
          (event) =>
            event.type === "life.scene.resolved" &&
            event.tags.includes(`resolves:${before.eventId}`),
        ),
      ).toHaveLength(1);
      expect(completed.history.events.at(-1)!.summary).toBe(
        "You spend a few quiet minutes resting by the window.",
      );
      expect(deserializeWorld(serializeWorld(completed))).toEqual(completed);
      expect(() =>
        chooseOpeningLifeScene(
          completed,
          game.playerPersonId,
          before.eventId,
          "rest",
        ),
      ).toThrow();
    },
  );

  it("preserves format15 no-pack lives and requires format16 before old readers can ignore packs", () => {
    const game = start();
    const original = serializeWorld(game.world);
    expect(JSON.parse(original).formatVersion).toBe(15);
    expect(serializeWorld(deserializeWorld(original))).toBe(original);
    const packed = JSON.parse(serializeWorld(install(game.world)));
    expect(packed.formatVersion).toBe(16);
    expect(() =>
      deserializeWorld(JSON.stringify({ ...packed, formatVersion: 15 })),
    ).toThrow(/content packs/);
    const stripped = { ...packed.world };
    delete stripped.contentPacks;
    expect(() =>
      deserializeWorld(JSON.stringify({ ...packed, world: stripped })),
    ).toThrow(/content packs/);
  });

  it("keeps two lives and future authored versions independent", () => {
    const first = start("foundation-life-one");
    const second = start("foundation-life-two");
    const packed = install(first.world);
    const frozen = serializeWorld(packed);
    const changed = {
      ...encounter,
      version: "1.1.0",
      scenes: encounter.scenes.map((scene) => ({
        ...scene,
        premise: "At home, you consider a different arrangement by the window.",
      })),
    };
    const other = importContentPack(
      importContentPack(second.world, settingsText),
      JSON.stringify(changed),
    );
    expect(other.id).not.toBe(packed.id);
    expect(other.contentPacks!.installed.at(-1)!.pack.version).toBe("1.1.0");
    expect(serializeWorld(packed)).toBe(frozen);
    expect(
      deserializeWorld(frozen).contentPacks!.installed.at(-1)!.pack.version,
    ).toBe("1.0.0");
    expect(() => importContentPack(packed, JSON.stringify(changed))).toThrow(
      /duplicate/,
    );
    expect(serializeWorld(packed)).toBe(frozen);
  });

  it("registers in deterministic dependency order and does not depend on file key order", () => {
    const a = registerRuntimeContentPacks([encounter, settings]);
    const b = registerRuntimeContentPacks([settings, encounter]);
    expect(a).toEqual(b);
    expect(a.installed.map((entry) => entry.pack.id)).toEqual([
      settings.id,
      encounter.id,
    ]);
    const reordered = JSON.parse(
      canonicalJson(encounter),
    ) as RuntimeContentPack;
    expect(registerRuntimeContentPacks([settings, reordered])).toEqual(a);
    expect(install(start().world)).toEqual(install(start().world));
  });

  it("refuses missing, mismatched, duplicate, cyclic and undeclared dependencies before writing", () => {
    const game = start();
    const before = serializeWorld(game.world);
    expect(() => importContentPack(game.world, encounterText)).toThrow(
      /dependencies/,
    );
    expect(() => registerRuntimeContentPacks([settings, settings])).toThrow(
      /duplicate/,
    );
    expect(() =>
      registerRuntimeContentPacks([
        { ...settings, version: "2.0.0" },
        encounter,
      ]),
    ).toThrow(/dependencies/);
    expect(() =>
      registerRuntimeContentPacks([
        {
          ...settings,
          dependencies: [{ id: encounter.id, version: encounter.version }],
        },
        encounter,
      ]),
    ).toThrow(/cyclic/);
    expect(() =>
      registerRuntimeContentPacks([
        settings,
        { ...encounter, dependencies: [] },
      ]),
    ).toThrow(/declared dependency/);
    expect(serializeWorld(game.world)).toBe(before);
  });

  it("refuses unsupported APIs, privileged fields, malformed references and inconsistent settings", () => {
    for (const change of [
      { api: "ordinary-scenes-v999" },
      { id: "adult.home" },
      { script: "alert(1)" },
      { assets: ["../../secret"] },
      { authority: "real-law" },
    ]) {
      expect(() =>
        parseRuntimeContentPack(JSON.stringify({ ...encounter, ...change })),
      ).toThrow();
    }
    expect(() =>
      parseRuntimeContentPack(
        JSON.stringify({
          ...encounter,
          scenes: encounter.scenes.map((scene) => ({
            ...scene,
            premise: "Hello {unknown}",
          })),
        }),
      ),
    ).toThrow(/reference/);
    expect(() =>
      registerRuntimeContentPacks([
        settings,
        {
          ...encounter,
          scenes: encounter.scenes.map((scene) => ({ ...scene, minutes: 11 })),
        },
      ]),
    ).toThrow(/duration/);
    expect(() => parseRuntimeContentPack(" ".repeat(128 * 1024 + 1))).toThrow(
      /large/,
    );
  });

  it("refuses damaged packed saves and preserves the original payload", () => {
    const payload = serializeWorld(install(start().world));
    const damaged = JSON.parse(payload);
    damaged.world.contentPacks.installed.shift();
    expect(() => deserializeWorld(JSON.stringify(damaged))).toThrow(
      /dependencies/,
    );
    const unsupported = JSON.parse(payload);
    unsupported.world.contentPacks.api = "future-api";
    expect(() => deserializeWorld(JSON.stringify(unsupported))).toThrow(
      /Unsupported/,
    );
    const wrongDigest = JSON.parse(payload);
    wrongDigest.world.contentPacks.installed[0].digest = "changed";
    expect(() => deserializeWorld(JSON.stringify(wrongDigest))).toThrow(
      /identity/,
    );
    expect(serializeWorld(deserializeWorld(payload))).toBe(payload);
  });

  it("shares the episode eligibility contract for NPCs without granting player control", () => {
    const game = start();
    const world = install(game.world);
    const family = openingLifeFamily(encounter.scenes[0]!);
    const player = eligibleEpisodeBeats({
      world,
      personId: game.playerPersonId,
      families: [family],
    });
    const observing = { ...world, control: { kind: "observer" as const } };
    const npc = eligibleEpisodeBeats({
      world: observing,
      personId: game.playerPersonId,
      families: [family],
    });
    expect(npc.beats).toEqual(player.beats);
    expect(npc.beats).toHaveLength(1);
    expect(() => openNextLifeScene(observing, game.playerPersonId)).toThrow(
      /Only the player/,
    );
    expect(world.contentPacks!.api).toBe(CONTENT_PACK_API);
  });
});
