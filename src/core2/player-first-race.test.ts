/**
 * The player's first local race is the place's own lawmaking body, whatever
 * it is called (owner, Oct 29, 22:45 UTC: "City council is, you know,
 * whatever the equivalent is"): its council, else its township board, else
 * the county board and county executive of a place the county governs
 * directly. One rule from `data/offices/player-offices.json`, checked over
 * every one of the 56 places from the local offices the world seats there.
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { gameStartDate } from "./game-start";
import { placeLocalGovernmentUnits } from "./gov-rules/local-governments";
import { playerMayFileForKind } from "./modules/elections";
import { localOfficesForPlace } from "./offices-local";
import { stateOffices } from "./offices-state";
import { corePlaceByKey } from "./place-lookup";
import { placeCountyGeoids } from "./place-map";
import { countyGovernmentUnit } from "./reference/government-units";
import { placeLocalities, placeStateKeys, type PlaceLocality } from "./places";

/** The local races the ruling names: the place's lawmaking body and its chief executive. */
const LOCAL_RACES = [
  "council",
  "township-board",
  "county-board",
  "mayor",
  "county-executive",
] as const;
const SAMPLE = 8;

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** Up to eight of a jurisdiction's localities, drawn by the seed. */
function sample(stateKey: string): readonly PlaceLocality[] {
  const all = placeLocalities(stateKey);
  if (all.length <= SAMPLE) return all;
  const picked = new Map<string, PlaceLocality>();
  for (let i = 0; picked.size < SAMPLE; i += 1) {
    const hash = createHash("sha256")
      .update(`${seed}:${stateKey}:${i}`)
      .digest("hex");
    const place = all[parseInt(hash.slice(0, 8), 16) % all.length]!;
    picked.set(place.key, place);
  }
  return [...picked.values()];
}

describe("the player's first local race is the place's council or its equivalent (owner, Oct 29)", () => {
  it("reads the equivalents from the data rows", () => {
    const city = ["council", "mayor", "county-board", "county-sheriff"];
    expect(playerMayFileForKind("council", city)).toBe(true);
    expect(playerMayFileForKind("mayor", city)).toBe(true);
    expect(playerMayFileForKind("county-board", city)).toBe(false);
    expect(playerMayFileForKind("township-board", city)).toBe(false);
    expect(playerMayFileForKind("county-executive", city)).toBe(false);
    expect(playerMayFileForKind("county-sheriff", city)).toBe(false);

    const township = ["township-board", "county-board", "county-clerk"];
    expect(playerMayFileForKind("township-board", township)).toBe(true);
    expect(playerMayFileForKind("county-board", township)).toBe(false);
    expect(playerMayFileForKind("county-executive", township)).toBe(false);

    const unincorporated = [
      "county-board",
      "county-executive",
      "county-sheriff",
    ];
    expect(playerMayFileForKind("county-board", unincorporated)).toBe(true);
    expect(playerMayFileForKind("county-executive", unincorporated)).toBe(true);
    expect(playerMayFileForKind("county-sheriff", unincorporated)).toBe(false);

    // State and federal races stand wherever the player lives.
    for (const kind of [
      "legislature-lower",
      "governor",
      "us-house",
      "us-senate",
      "president",
    ])
      for (const home of [city, township, unincorporated, []])
        expect(playerMayFileForKind(kind, home), kind).toBe(true);
    expect(playerMayFileForKind("lieutenant-governor", city)).toBe(false);
  });

  it("gives every place a local race where it has local offices, in all 56", () => {
    const date = gameStartDate();
    const noRace: string[] = [];
    const wrongBody: string[] = [];
    const noLocalOffice: string[] = [];
    const unexcused: string[] = [];
    let councilPlaces = 0;
    let drawn = 0;
    const stateKeys = [...placeStateKeys()];
    expect(stateKeys).toHaveLength(56);
    const drawnBy = new Map<string, number>();
    for (const stateKey of stateKeys) {
      let stateKinds: readonly string[] | undefined;
      for (const locality of sample(stateKey)) {
        drawn += 1;
        drawnBy.set(stateKey, (drawnBy.get(stateKey) ?? 0) + 1);
        const where = `${locality.displayName} (${locality.key})`;
        const kinds = localOfficesForPlace(locality.key).map((o) => o.kind);
        if (!kinds.length) {
          stateKinds ??= stateOffices(stateKey, "", date).map(
            (entry) => entry.office.kind,
          );
          // Its first race is its own state's or territory's lawmaking body.
          if (
            !stateKinds.some(
              (kind) =>
                kind.startsWith("legislature") &&
                playerMayFileForKind(kind, kinds),
            )
          )
            noRace.push(`${where}: no local office and no legislature`);
          // A government that is both the place's and its state's (its mayor
          // sits at the state level) is the place's council and mayor.
          if (
            stateKinds.some(
              (kind) =>
                kind.startsWith("mayor") && playerMayFileForKind(kind, kinds),
            )
          )
            continue;
          const place = corePlaceByKey(locality.key);
          const territory =
            place?.context.jurisdiction.kind === "territory-place";
          const units = placeLocalGovernmentUnits(place);
          const reason = units.countyReason ?? "no local office in the data";
          // A home with no government unit in any listing (an Alaska place
          // outside every organized borough) is served by its state; a home
          // with a unit, or with a county on the map that has a government,
          // but no office is a defect.
          const unitless =
            !units.municipal.length &&
            !units.townships.length &&
            !units.counties.length;
          const mappedCounty = place?.sourceGeoid
            ? placeCountyGeoids(place.sourceGeoid).some(
                (geoid) => countyGovernmentUnit(geoid) !== null,
              )
            : false;
          noLocalOffice.push(
            `${where}: ${territory ? "an island-area village" : "served by its state"}, ${reason}`,
          );
          if (!territory && (!unitless || mappedCounty)) unexcused.push(where);
          continue;
        }
        const admitted = LOCAL_RACES.filter(
          (kind) => kinds.includes(kind) && playerMayFileForKind(kind, kinds),
        );
        if (!admitted.length)
          noRace.push(`${where}: ${[...new Set(kinds)].join(", ")}`);
        if (kinds.includes("council")) {
          councilPlaces += 1;
          for (const kind of [
            "county-board",
            "township-board",
            "county-executive",
          ] as const)
            if (playerMayFileForKind(kind, kinds))
              wrongBody.push(`${where}: ${kind}`);
        }
      }
    }
    const listed = (rows: readonly string[]) =>
      rows.length ? `\n  ${rows.join("\n  ")}` : " none";
    const message = `seed ${seed}, ${drawn} places drawn across 56; no local race:${listed(noRace)}\nno local office (first race is the legislature):${listed(noLocalOffice)}`;
    expect(noRace, message).toEqual([]);
    expect(
      wrongBody,
      `${message}\na council town admits another body:`,
    ).toEqual([]);
    expect(councilPlaces, message).toBeGreaterThan(0);
    // Every one of the 56 contributed a draw.
    expect(
      stateKeys.filter((k) => !drawnBy.get(k)),
      message,
    ).toEqual([]);
    expect(
      unexcused,
      `${message}\nnot a territory, yet a government serves it:`,
    ).toEqual([]);
    process.stdout.write(`${message}\n`);
  });
});
