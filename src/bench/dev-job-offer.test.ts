import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { purposeScene } from "../director/purpose-scene";
import { DevMode } from "./dev-mode";
import { BenchPlayer } from "./player";
import { buildBenchWorld, NoPlayerHereError } from "./world";

// Dev mode's Force on job-offer: an offer comes only to a player who applied
// (owner, Nov 16), so the recipe applies for the town's openings each day
// through the Openings screen's own call (applyForOpening) and runs the world
// until an employer phones the player (the jobs engine's `job-offered`). The
// director stages the call with the scene bank's lines, and the run names
// the offer record it stopped on (CTO order 7139529302, item 5).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;

/** The player, or the first jobless working-age adult at home in town when the player works. */
function joblessAdult(core: CoreState) {
  const player = core.people.get(core.playerId!)!;
  const adult = (birthDate: string) => {
    const age = ageOnDate(makeIsoDate(birthDate), makeIsoDate(core.date));
    return age >= 18 && age < 60;
  };
  if (!player.jobId && adult(player.birthDate)) return player;
  return [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === player.placeId &&
        !p.jobId &&
        adult(p.birthDate) &&
        core.households.has(p.householdId),
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0];
}

it(`dev mode's Force on job-offer applies and waits for an employer's call (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const place = drawPlace(
      attempt === 0 ? seed : `${seed}:${attempt}`,
      "job-offer",
    );
    let world;
    try {
      world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
    } catch (error) {
      if (error instanceof NoPlayerHereError) {
        passed.push(`${place.name}: no player here`);
        continue;
      }
      throw error;
    }
    const { core, director } = world;
    const person = joblessAdult(core);
    if (!person) {
      passed.push(`${place.name}: no jobless adult`);
      continue;
    }
    const personId = person.id as PersonId;
    core.playerId = personId;
    core.focusPersonIds.add(personId);
    const player = new BenchPlayer(core, director);
    player.select(personId);
    const dev = new DevMode(core, director, player, world.placeId);
    expect(dev.scenes().find((row) => row.key === "job-offer")?.recipe).toBe(
      "apply",
    );
    const out = dev.forceScene({ typeKey: "job-offer", cap: 120 }) as {
      applied?: number;
      ran?: { reason: string; days: number; records: string[] };
    };
    if (out.ran?.reason !== "event") {
      passed.push(
        `${place.name}: applied for ${out.applied ?? 0}, no call in ${out.ran?.days ?? 0} days`,
      );
      continue;
    }
    const where = `${place.name} (${place.key}) seed ${place.seed}`;
    // The run names the offer the employer phoned in, and it names the player.
    const offerId = out.ran.records[0]!;
    const offer = core.durableLog.get(offerId as never);
    expect(offer?.kind, where).toBe("job-offered");
    expect(offer?.facts?.invitedId, where).toBe(personId);
    // The jobs engine kept the player's application the offer answers.
    const position = coreAPI(core)
      .moduleState("jobs")
      .table("offers")
      .get(String(offer?.facts?.offerId)) as { positionId?: string } | undefined;
    expect(
      coreAPI(core)
        .moduleState("jobs")
        .table("playerApplications")
        .get(position?.positionId ?? ""),
      where,
    ).toBeTruthy();
    // The director stages the call, worded from the scene bank.
    const book = director.ledger.people.get(personId)!;
    const entry = book.schedule.find(
      (row) =>
        book.momentsById.get(row.momentId)?.causeId === offerId &&
        row.bindings.some((b) => b.typeKey === "job-offer"),
    );
    expect(entry?.outcome, where).toBe("scene-now");
    const result = purposeScene(core, director, personId, entry!);
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") return;
    const bank = new Set(
      (sceneBank as unknown as { parts: { key: string }[] }).parts.map(
        (part) => part.key,
      ),
    );
    for (const line of result.scene.talk.lines)
      for (const key of line.parts)
        if (key.startsWith("scene-talk."))
          expect(bank.has(key), `${where}: ${key}`).toBe(true);
    process.stdout.write(
      `job-offer: ${where}; passed over ${passed.join("; ") || "none"}; ` +
        `player ${personId} applied for ${out.applied}; call ${offerId} after ${out.ran.days} days; ` +
        `"${result.scene.talk.state.text}"\n`,
    );
    return;
  }
  throw new Error(
    `No drawn place called the player with an offer: ${passed.join("; ")}`,
  );
}, 1_800_000);
