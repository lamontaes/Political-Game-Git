/**
 * The one speech outline's proof (words composer, unit 3): in drawn places it
 * composes the President's opening address and the governor's and mayor's
 * addresses through the one planner, prints them as played, and reports what
 * each outline chose (theme, asks) so a reader sees why.
 *
 *   OCD_STORAGE_OVERRIDE=... node --import tsx scripts/words/speech-outline-proof.ts [seed ...]
 *
 * With no seed it runs the labeled grading seed (Wofford Heights, California)
 * and two fresh draws.
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "../core2-year/place";
import { placeLocalities } from "../../src/core2/places";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { composeLocalAddress } from "../../src/director/local-address";
import {
  composeCampaignSpeech,
  composeFloorSpeech,
} from "../../src/director/local-speeches";
import { coreAPI } from "../../src/core2/state";
import { townSeats } from "../../src/core2/modules/offices";
import { advanceCore } from "../../src/core2/life";
import { addDays } from "../../src/core2/kernel/dates";
import type { PersonId } from "../../src/core2/types";

setBookkeeping(false);
const FLOOR_DAYS = Number(process.env.FLOOR_DAYS ?? "0");
const LABELED = "a9c85de3-e7fa-4418-8499-569a5c5e6e10";

function labeledPlace(): { seed: string; key: string; name: string } {
  const row = [...placeLocalities("US-CA")].find(
    (entry) => entry.formalName === "Wofford Heights",
  );
  if (!row) throw new Error("Wofford Heights is not in the corpus");
  return { seed: LABELED, key: row.key, name: "Wofford Heights, California" };
}

const seeds = process.argv.slice(2);
const places = seeds.length
  ? seeds.map((seed) => {
      const drawn = drawPlace(seed, "speech-outline");
      return {
        seed: drawn.seed,
        key: drawn.key,
        name: drawn.name,
        label: seed,
      };
    })
  : [
      { ...labeledPlace(), label: LABELED },
      ...[0, 1].map(() => {
        const label = randomBytes(8).toString("hex");
        const drawn = drawPlace(label, "speech-outline");
        return { seed: drawn.seed, key: drawn.key, name: drawn.name, label };
      }),
    ];

for (const place of places) {
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const head = `${place.name} (${place.key}), seed ${place.label}`;
  const opening = world.director.ledger.opening;
  console.log(`\n### ${head}\n`);
  console.log(
    `**The President's ${opening?.speechKind ?? "address"}** (theme: ${opening?.theme ?? "none"}; asks: ${(opening?.asks ?? []).join(", ") || "none"})\n`,
  );
  for (const part of opening?.address.parts ?? []) console.log(`> ${part}\n>`);
  for (const level of ["state", "town"] as const) {
    const local = composeLocalAddress(world.core, level);
    console.log(
      `\n**The ${level === "state" ? "governor's" : "local head's"} address**${local ? ` by ${world.core.people.get(local.speakerId)?.givenName ?? ""} ${world.core.people.get(local.speakerId)?.familyName ?? ""}` : ""} (theme: ${local?.theme ?? "none"}; asks: ${(local?.asks ?? []).join(", ") || "none"}; sides: ${(local?.points ?? []).map((p) => `${p.side}/${p.pole}`).join(", ")})\n`,
    );
    if (!local) console.log("> (no one seated to give it)");
    for (const part of local?.parts ?? []) console.log(`> ${part}\n>`);
  }
  // A member of the town's body: their campaign speech for their own seat,
  // and their floor speech on the first measure before the body (the world
  // is played forward a day at a time until one is, at most FLOOR_DAYS).
  const api = coreAPI(world.core);
  const bodies = new Set(["council", "township-board", "county-board"]);
  const members = townSeats(api).filter(
    (row) => bodies.has(row.office.kind) && row.holder?.personId,
  );
  const member = members[0];
  if (member?.holder?.personId) {
    const name = (id: string) =>
      `${world.core.people.get(id as PersonId)?.givenName ?? ""} ${world.core.people.get(id as PersonId)?.familyName ?? ""}`;
    const stump = composeCampaignSpeech(
      world.core,
      member.holder.personId as PersonId,
      member.office.id,
      member.holder.party ?? null,
    );
    console.log(
      `\n**A campaign speech** by ${name(member.holder.personId)}, ${member.office.title} (${member.office.governmentName}) (theme: ${stump?.theme ?? "none"}; asks: ${(stump?.asks ?? []).join(", ") || "none"})\n`,
    );
    for (const part of stump?.parts ?? []) console.log(`> ${part}\n>`);
    const offices = new Set(members.map((row) => row.office.id));
    // The floor before the roll on a measure of the town's body
    // (legislature.ts recordFloorDebate): the member who rose for it and the
    // one who rose against it. A bill is drafted and voted the same day, so
    // the record is read after the day, not the bill's status.
    const debate = () =>
      [...world.core.durableLog.values()].find(
        (event) =>
          event.kind === "floor-debate" &&
          offices.has(String(event.facts?.chamber ?? "")),
      );
    let found = debate();
    for (let day = 0; !found && day < FLOOR_DAYS; day += 1) {
      advanceCore(world.core, addDays(world.core.date as never, 1) as never);
      found = debate();
    }
    if (!found)
      console.log(
        `\n**A floor speech**: no measure reached the floor of the body in ${FLOOR_DAYS} days`,
      );
    else
      for (const id of [found.facts!.forId, found.facts!.againstId]) {
        const floor = composeFloorSpeech(
          world.core,
          String(found.facts!.billId),
          String(id) as PersonId,
        );
        console.log(
          `\n**A floor speech** on ${String(found.facts!.number)} (${found.date}) by ${name(String(id))} (asks: ${(floor?.asks ?? []).join(", ") || "none"}; side: ${floor?.points[0]?.side ?? "none"})\n`,
        );
        for (const part of floor?.parts ?? []) console.log(`> ${part}\n>`);
      }
  }
}
