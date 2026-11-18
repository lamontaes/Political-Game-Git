/**
 * The speech reader's sheets (words machine part 3, speech-has-a-core): the
 * speeches a played world composes, whole, for a fresh reviewer to read with
 * `npm run words:review`. Development tooling; shipped play never imports it.
 *
 *   npm run words:speech-sheets -- --out <dir> [placeKey:seed ...]
 *
 * In each place it builds the played world (`buildBenchWorld`, two levels)
 * and keeps, through the game's own composers:
 * - the President's opening address as its parts (`ledger.opening`);
 * - the governor's and the local head's address (`composeLocalAddress`);
 * - a town member's campaign speech (`composeCampaignSpeech`);
 * - the speech the player builds in steps (`beginSpeech`, `chooseSpeechPart`),
 *   twice, with every stage's four choices and the one taken.
 * A speech's id is a hash of its words, so the same speech keeps its id.
 * With no place given it reads three pinned places.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { townSeats } from "../../src/core2/modules/offices";
import { coreAPI } from "../../src/core2/state";
import type { CoreState, PersonId } from "../../src/core2/types";
import { composeLocalAddress } from "../../src/director/local-address";
import { composeCampaignSpeech } from "../../src/director/local-speeches";
import {
  beginSpeech,
  chooseSpeechPart,
  type SpeechBuild,
} from "../../src/director/speech-builder";
import { hash53 } from "../../src/english/judged";

/** One speech on a sheet: its parts as given, or the stages the player stepped through. */
export interface SpeechEntry {
  readonly id: string;
  readonly kind: string;
  readonly place: string;
  readonly parts?: readonly string[];
  readonly stages?: readonly {
    readonly stage: string;
    readonly offered: readonly string[];
    readonly chosen: string;
  }[];
}

/** Three pinned places (seed and place key), the ones the party-ask proof used. */
const PINNED = [
  "5466652:2f25fb7e430b668e070d0566797f919b69f4d98980ad291944d6a73c00966ea8",
  "4949820:af87350045106dfa4c17d4831545f2b6dfc6b100c0779fcfdd2ed970c3a2be95",
  "2409400:eb7bf5962b7c91580493e25b412315491d7919f3bfaa5fc6b44a1b5435f719d5",
];

const entry = (
  kind: string,
  place: string,
  body: Omit<SpeechEntry, "id" | "kind" | "place">,
): SpeechEntry => ({
  id: hash53(`speech:${kind}:${JSON.stringify(body)}`),
  kind,
  place,
  ...body,
});

/** The player's speech, stepped through taking the n-th choice (wrapping) at each stage. */
function steppedSpeech(
  core: CoreState,
  speakerId: PersonId,
  walk: number,
): SpeechEntry["stages"] | null {
  let build: SpeechBuild | null = beginSpeech(core, speakerId);
  if (!build?.choices.length) return null;
  const stages: NonNullable<SpeechEntry["stages"]>[number][] = [];
  while (build && !build.done && build.choices.length) {
    const offered = build.choices;
    const pick = offered[(walk + stages.length) % offered.length]!;
    stages.push({
      stage: pick.stage,
      offered: offered.map((choice) => choice.text),
      chosen: pick.text,
    });
    build = chooseSpeechPart(core, build, pick.key);
  }
  return stages;
}

export function speechesOf(placeKey: string, seed: string): SpeechEntry[] {
  const world = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const core = world.core;
  const place = `${placeKey}, seed ${seed.slice(0, 8)}`;
  const out: SpeechEntry[] = [];
  const opening = world.director.ledger.opening;
  if (opening?.address.parts.length)
    out.push(
      entry(`the President's ${opening.speechKind ?? "address"}`, place, {
        parts: opening.address.parts,
      }),
    );
  for (const level of ["state", "town"] as const) {
    const local = composeLocalAddress(core, level);
    if (local?.parts.length)
      out.push(
        entry(
          level === "state"
            ? "the governor's address"
            : "the local head's address",
          place,
          { parts: local.parts },
        ),
      );
  }
  const bodies = new Set(["council", "township-board", "county-board"]);
  const member = townSeats(coreAPI(core)).find(
    (row) => bodies.has(row.office.kind) && row.holder?.personId,
  );
  if (member?.holder?.personId) {
    const stump = composeCampaignSpeech(
      core,
      member.holder.personId as PersonId,
      member.office.id,
      member.holder.party ?? null,
    );
    if (stump?.parts.length)
      out.push(
        entry("a town member's campaign speech", place, {
          parts: stump.parts,
        }),
      );
  }
  if (world.playerId)
    for (const walk of [0, 1]) {
      const stages = steppedSpeech(core, world.playerId as PersonId, walk);
      if (stages?.length)
        out.push(
          entry("the speech the player builds in steps", place, { stages }),
        );
    }
  return out;
}

function main() {
  setBookkeeping(false);
  const args = process.argv.slice(2);
  const at = args.indexOf("--out");
  const out = at >= 0 ? args[at + 1] : undefined;
  if (!out)
    throw new Error("usage: speech-sheets.ts --out <dir> [placeKey:seed ...]");
  const places = args.filter((arg, i) => i !== at && i !== at + 1);
  const speeches = (places.length ? places : PINNED).flatMap((pair) => {
    const [key, seed] = pair.split(":");
    return speechesOf(key!, seed!);
  });
  const unique = [...new Map(speeches.map((s) => [s.id, s])).values()];
  mkdirSync(out, { recursive: true });
  const file = path.join(out, "speech-has-a-core.1.json");
  writeFileSync(
    file,
    `${JSON.stringify({ rule: "speech-has-a-core", speeches: unique }, null, 1)}\n`,
  );
  console.log(`${unique.length} speeches in ${file}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
