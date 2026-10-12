import { coreAPI } from "../core2/state";
import { townSeats } from "../core2/modules/offices";
import { lifePlaceByKey } from "../simulation/life-places";
import { capitolPlaceFor } from "../presentation/place-backdrops";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import { backdropFile, stagePeople, homeOf } from "./scene";
import shots from "./data/opening-shots.json" with { type: "json" };
import type { CoreState } from "../core2/types";

// Stopgap SG-PLAY-opening-without-speech: the opening's shots show who holds
// each office from the records; the President's speech that carries them
// waits for OPUS-PEOPLE's English engine.

const PICTURED = new Set(
  manifest.backdrops
    .filter((row) => row.variant === "midday")
    .map((row) => row.place),
);

interface Shot {
  officeKinds?: string[][];
  family?: boolean;
  player?: boolean;
  places: string[];
}

/** The opening: who governs the player's town, level by level, then home. */
export function openingShots(core: CoreState, playerId: string) {
  const player = core.people.get(playerId);
  if (!player) throw new Error("No such person.");
  const api = coreAPI(core);
  const seats = townSeats(api);
  const usps = lifePlaceByKey(
    api.state.placeMetadata.placeKey ?? "",
  )?.stateJurisdictionKey?.slice(3);
  const resolve = (place: string) =>
    place === "capitol"
      ? capitolPlaceFor(usps ?? null)
      : place === "@home"
        ? homeOf(core, playerId)
        : place;
  const out = [];
  for (const shot of shots.shots as Shot[]) {
    const place = shot.places.map(resolve).find((row) => PICTURED.has(row));
    if (!place) continue;
    let cast: { id: string; name: string; title?: string }[] = [];
    if (shot.officeKinds) {
      for (const kinds of shot.officeKinds) {
        cast = seats
          .filter((row) => kinds.includes(row.office.kind) && row.holder)
          .map(({ office, holder }) => ({
            id: holder!.personId ?? holder!.id,
            name: `${holder!.identity.givenName} ${holder!.identity.familyName}`,
            title: office.title,
          }));
        if (cast.length) break;
      }
      if (!cast.length) continue;
    } else if (shot.family) {
      cast = (core.households.get(player.householdId)?.memberIds ?? [])
        .filter((id) => id !== playerId && core.people.get(id)?.alive)
        .map((id) => {
          const row = core.people.get(id)!;
          return { id, name: `${row.givenName} ${row.familyName}` };
        });
      if (!cast.length) continue;
    } else
      cast = [
        { id: playerId, name: `${player.givenName} ${player.familyName}` },
      ];
    const { people } = stagePeople(core, place, cast);
    out.push({
      place,
      backdrop: backdropFile(place, 20 * 60 + 30),
      cast: cast.map(({ id, name, title }) => ({ id, name, title })),
      people,
    });
  }
  return out;
}
