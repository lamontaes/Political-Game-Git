/** Read-only English workshop, apart from normal arrival/turn simulation commands. */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { personName, type EntityId, type World } from "../../src/simulation";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import { submitTimeCommand } from "../../src/presentation/time-command";
import { recordedRoomPresence } from "../../src/presentation/recorded-room-presence";
import {
  projectPlayedSceneExchange,
  type PlayedSceneLine,
} from "../../src/presentation/scene-conversation";
import { speakerTraits } from "../../src/presentation/speaker-traits";
import { drawRandomPlace } from "../../tests/support/random-place";

const out =
  process.argv[2] ??
  "docs/codex/evidence/session4-english-samples-2026-10-05.md";
const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const observedAt = new Date().toISOString();
const rows: string[] = [];
const observed: unknown[] = [];
process.on("uncaughtException", (error) => {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    `# Incomplete English workshop extraction\n\nMeasured: ${rows.length} lines were retained before a terminal error. This receipt does not satisfy the requested sample count.\n\n${rows.join("\n")}\n\n## Terminal error and observations\n\n\`\`\`json\n${JSON.stringify({ sourceHead, observedAt, error: String(error), observed }, null, 2)}\n\`\`\`\n`,
  );
  console.error(error);
  process.exitCode = 1;
});

function records(world: World, ids: readonly EntityId[]) {
  const result: Record<string, unknown[]> = {};
  for (const [collection, values] of Object.entries(world.history)) {
    if (!Array.isArray(values)) continue;
    const matches = values.filter((value: unknown) => {
      if (typeof value !== "object" || value === null || !("id" in value))
        return false;
      return ids.includes((value as { id: EntityId }).id);
    });
    if (matches.length) result[collection] = matches;
  }
  return result;
}

for (let draw = 0; draw < 4 && rows.length < 40; draw += 1) {
  const seed = `session4-english-workshop-2026-10-06:${draw}`;
  const place = drawRandomPlace(seed);
  process.stdout.write(
    `START draw=${draw} place=${place.displayName} key=${place.key} seed=${seed}\n`,
  );
  const result = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 18,
      startingLife: "ordinary-life",
    }),
  );
  if (!result.game) throw new Error(`No generated game for ${seed}`);
  const { world: generated, playerPersonId: player } = result.game;
  const opened = openOrdinaryLife(generated, player);
  const activity = opened.history.scheduledActivities.find(
    (row) => row.location.locationKey === "ordinary-life:meeting-room",
  );
  if (!activity) {
    observed.push({ seed, place, finding: "No meeting offer" });
    continue;
  }
  const arrival = submitTimeCommand(opened, {
    requestId: `english-workshop:${seed}`,
    personId: player,
    sourceMoment: opened.currentMoment,
    command: { kind: "attend-activity", activityId: activity.id },
  });
  if (arrival.receipt.status !== "accepted")
    throw new Error(JSON.stringify(arrival.receipt));
  const world = arrival.world;
  const presence = recordedRoomPresence(world, player);
  if (!presence) throw new Error(`No recorded attendance for ${seed}`);
  const presenceRecord = world.history.events.find(
    (row) => row.id === presence.eventId,
  )!;
  const chair = presenceRecord.participants.find(
    (row) => row.role === "coordination:chair",
  )?.personId;
  if (!chair) throw new Error(`No actual chair for ${seed}`);
  const scene = projectPlayedSceneExchange(world, player, chair);
  if (!scene) throw new Error(`No shared exchange for ${seed}`);
  const candidates: {
    speaker: EntityId;
    line: PlayedSceneLine;
    primitive: string;
    sourceEventId: EntityId;
    knowledgeId: EntityId | null;
  }[] = [
    ...scene.contributions.map((row) => ({
      speaker: row.speakerPersonId,
      line: row.line,
      primitive: "recorded contribution",
      sourceEventId: row.sourceEventId,
      knowledgeId: null,
    })),
    ...scene.replies.map((row) => ({
      speaker: player,
      line: row.line,
      primitive: row.primitive,
      sourceEventId: row.sourceEventId,
      knowledgeId: row.knowledgeId,
    })),
  ];
  const lifeRows = candidates.slice(0, 10);
  observed.push({
    seed,
    worldId: world.id,
    place,
    player,
    presenceRecord,
    arrivalReceipt: arrival.receipt,
    candidateCount: candidates.length,
  });
  for (const candidate of lifeRows) {
    const traits = speakerTraits(world, candidate.speaker);
    const traitIds = Object.values(traits).flatMap(
      (fact) => fact?.sourceRecordIds ?? [],
    );
    const sourceIds = [
      ...new Set([
        ...candidate.line.sourceRecordIds,
        candidate.sourceEventId,
        ...(candidate.knowledgeId ? [candidate.knowledgeId] : []),
        ...traitIds,
      ]),
    ];
    const evidence = {
      seed,
      worldId: world.id,
      moment: world.currentMoment,
      placeKey: place.key,
      placeName: place.displayName,
      presenceEventId: presence.eventId,
      speakerId: candidate.speaker,
      speakerName: personName(world.people[candidate.speaker]!),
      speakerRecord: world.people[candidate.speaker],
      speakerTraits: traits,
      primitive: candidate.primitive,
      sourceEventId: candidate.sourceEventId,
      knowledgeId: candidate.knowledgeId,
      engineResult: candidate.line,
      canonicalSourceRecords: records(world, sourceIds),
    };
    rows.push(
      `### ${rows.length + 1}. ${personName(world.people[candidate.speaker]!)} — ${place.displayName}\n\n> ${candidate.line.text}\n\nMeasured: ${candidate.primitive}; actual scheduled meeting arrival. This is ${candidate.speaker === player ? "an offered player line, not a committed turn" : "an actual composed contribution"}.\n\n<details>\n<summary>Exact records, traits, and English parts</summary>\n\n\`\`\`json\n${JSON.stringify(evidence, null, 2)}\n\`\`\`\n\n</details>\n`,
    );
  }
  process.stdout.write(
    `DONE draw=${draw} lines=${rows.length} world=${world.id}\n`,
  );
}
const markdown = `# What the shared English engine says in four new lives\n\nMeasured: ${rows.length} lines were composed from fresh generated lives and their recorded meeting arrivals. Player replies are offered choices; nobody is claimed to have spoken an unselected reply. Repeated wording and awkward record summaries remain visible for the workshop. This sheet does not prove personality contrast or approve the dialogue layout.\n\n## Engine lines and their actual records\n\n${rows.join("\n")}\n## What happens next\n\nThe owner can mark individual lines for revision. The central English writer retains those changes. No wording or source record was changed to prepare this sheet.\n\n## Method\n\nMeasured on ${new Date(observedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" })}; machine UTC timestamp ${observedAt}; source head ${sourceHead}. Existing normal opening generation, ordinary-life opening, scheduled arrival, and shared scene projection produced these rows. The shared composer calls composeGroundedLine in src/presentation/small-talk-english.ts:235. Selection took the first ten actual outputs from each life, without searching for a desired trait.\n\n\`\`\`json\n${JSON.stringify(observed, null, 2)}\n\`\`\`\n`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, markdown);
process.stdout.write(
  `${rows.length} actual composed lines written to ${out}\n`,
);

if (rows.length < 30) process.exitCode = 1;
