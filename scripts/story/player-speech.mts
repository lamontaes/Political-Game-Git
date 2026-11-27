// The speech a player gives, before and after the planner composes it: draws places, files the best-connected
// adult in a race, picks the four stages the way a player would (a stand at the core) and prints the words.
// Usage: node --import tsx scripts/story/player-speech.mts <run-seed> [places=3]
import { createHash } from "node:crypto";
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld, NoPlayerHereError } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { fileCandidacy, openContests } from "../../src/core2/modules/elections";
import { lawChain } from "../../src/core2/modules/laws";
import { SPEECH_STAGES } from "../../src/director/speech-builder";
import { speechBegin, speechPick } from "../../src/bench/campaign";
import { composeBlocks } from "../../src/director/opening-story";
import * as local from "../../src/director/local-speeches";
import { speechAsGiven } from "../../src/director/speech-builder";

const [run, placesArg] = process.argv.slice(2) as [string, string?];
const places = Number(placesArg ?? 3);
for (let draw = 0, done = 0; done < places && draw < places * 6; draw += 1) {
  const drawn = drawPlace(`${run}:${draw}`, "player-speech");
  // PLACE_KEY and PLACE_SEED rebuild one named place (a place a survey flagged) instead of the drawn one.
  const place = process.env.PLACE_KEY
    ? {
        ...drawn,
        key: process.env.PLACE_KEY,
        seed: process.env.PLACE_SEED ?? drawn.seed,
      }
    : drawn;
  let world;
  try {
    world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
  } catch (error) {
    if (!(error instanceof NoPlayerHereError))
      process.stdout.write(
        `\n## ${place.name} (${place.key}) did not build: ${String(error).slice(0, 90)}\n`,
      );
    continue;
  }
  const core = world.core;
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort(
      (a, b) =>
        b.familyIds.size +
          b.knownIds.size -
          a.familyIds.size -
          a.knownIds.size || a.id.localeCompare(b.id),
    );
  let shown = false;
  try {
    for (let week = 0; week < 60 && !shown; week += 1) {
      for (const candidate of adults.slice(0, 8)) {
        core.playerId = candidate.id;
        for (const contest of openContests(api)) {
          const result = fileCandidacy(api, {
            personId: candidate.id,
            contestId: contest.id,
            platform: [],
          });
          if (
            result.status === "refused" ||
            !["petitioning", "on-ballot"].includes(result.filing.status ?? "")
          )
            continue;
          if (!core.people.get(candidate.id)?.alive) continue;
          let speech = speechBegin(core, candidate.id);
          for (const stage of SPEECH_STAGES) {
            const pick =
              speech.choices.find((row) => row.stand && stage === "core") ??
              speech.choices[0]!;
            speech = speechPick(core, speech, pick.key);
          }
          process.stdout.write(
            `\n## ${place.name} (${place.key}), run seed ${run} draw ${draw}, ${contest.officeId}\n`,
          );
          process.stdout.write(
            `OLD: ${speech.picked.map((row) => row.text).join(" ")}\n`,
          );
          const stands = speech.picked
            .filter((row) => row.stand)
            .map((row) => row.stand!.question);
          const filing = result.filing;
          const said = local.composeCampaignSpeech(
            core,
            candidate.id as never,
            contest.officeId,
            filing.party ?? null,
            stands,
          );
          process.stdout.write(`NEW: ${speechAsGiven(speech, said)}\n`);
          for (const row of said?.sentences ?? [])
            process.stdout.write(`  [${row.section ?? "-"}] ${row.text}\n`);
          if (!said) {
            process.stdout.write("  (the planner had nothing to say)\n");
            // Why: the telling's plan (theme, asks, points) for the same stands.
            const telling = local.campaignSpeechTelling(
              core,
              candidate.id as never,
              contest.officeId,
              filing.party ?? null,
              stands,
            );
            for (const [index, block] of (
              telling?.plan.blocks ?? []
            ).entries()) {
              const alone = composeBlocks(
                core,
                core.people.get(candidate.id)!,
                [block],
              );
              process.stdout.write(
                `  block ${index} ${JSON.stringify(Object.fromEntries(Object.entries(block).filter(([k]) => k !== "facts")))}: ${alone ? `${alone.length} sentences` : "NULL"}\n`,
              );
            }
            process.stdout.write(
              `  facts: ${Object.keys(telling?.input.facts ?? {}).join(", ")}\n`,
            );
            process.stdout.write(
              `  why: stands=${JSON.stringify(stands)} telling=${telling ? "yes" : "null"} theme=${telling?.plan.theme ?? "-"} asks=${JSON.stringify(telling?.plan.asks ?? [])} blocks=${telling?.plan.blocks.length ?? 0}\n`,
            );
          }
          shown = true;
          done += 1;
          break;
        }
        if (shown) break;
      }
      if (!shown) advanceCore(core, addDays(makeIsoDate(core.date), 7));
    }
  } catch (error) {
    process.stdout.write(
      `\n## ${place.name} (${place.key}) crashed: ${String(error).slice(0, 90)}\n`,
    );
    done += 1;
  }
  void createHash;
}
