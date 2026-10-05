import type { EntityId, World } from "../simulation";
import { readRelationshipStanding } from "../simulation/relationship-standing";
import {
  composeGroundedLine,
  type ComposedLineBank,
} from "./english-composition";
import type { GroundedEnglishFact } from "./grounded-english";
import { speakerTraits } from "./speaker-traits";

const CORES = {
  "meeting-plan": "You plan to go to the posted public meeting.",
  "meeting-late-arrival":
    "You traveled {{minutes}} minutes and arrived at the public meeting after it began.",
  "meeting-brief-late":
    "You heard part of the discussion and left after a short visit.",
  "meeting-brief-opening":
    "You heard the opening discussion and left after a short visit.",
  "meeting-left": "You left without staying through the posted public meeting.",
  "meeting-entry": "Would you like to join the meeting?",
  "meeting-no-roll-call": "No roll-call vote is recorded for this agenda.",
  "chapter-attended": "You attended the {{chapter}} open meeting.",
  "chapter-saw-organizer": "Saw the organizer again at a chapter meeting.",
  "chapter-met-organizer": "Met the organizer at a chapter meeting.",
  "social-accept-reply": "Yes, I’ll come.",
  "social-decline-reply": "I can’t make it.",
  "social-trip": "A short local trip. There is no fare.",
  "social-accept-known": "You told {{host}} you would come.",
  "social-accept": "You said you would come.",
  "social-attended": "You spent the afternoon at {{host}}'s.",
  "social-time-together": "Spent an afternoon together at home.",
} as const;
export type EverydayEnglishKey = keyof typeof CORES;

/** The existing action writer supplies only the actor's own activity and invitation facts. */
export function everydayText(
  world: World,
  personId: EntityId,
  key: EverydayEnglishKey,
  sourceRecordIds: readonly EntityId[],
  facts: Readonly<Record<string, GroundedEnglishFact>> = {},
  listenerPersonId: EntityId = personId,
): string {
  const surface = key.endsWith("-reply") ? "dialogue" : "scene";
  const bank: ComposedLineBank = {
    key: `everyday.${key}`,
    version: "1",
    surface,
    act: "tell",
    parts: {
      core: { variants: [{ key: "core", kind: "template", text: CORES[key] }] },
      ...(key === "meeting-brief-late" || key === "meeting-brief-opening"
        ? {
            closer: {
              variants: [
                {
                  key: "left-before-outcome",
                  kind: "template",
                  text: "You did not stay for the outcome.",
                },
              ],
            },
          }
        : {}),
    },
  };
  const line = composeGroundedLine(
    {
      surface,
      worldSeed: world.seed,
      momentKey: `${key}:${world.currentDate}:${world.history.nextSequence}`,
      bankVersion: bank.version,
      stage: key,
      sourceRecordIds: [personId, ...sourceRecordIds],
      facts,
      speaker: { personId, traits: speakerTraits(world, personId) },
      viewer: {
        personId: listenerPersonId,
        traits: speakerTraits(world, listenerPersonId),
      },
      knowledge: Object.entries(facts).map(([factKey, fact]) => ({
        personId,
        factKey,
        sourceRecordIds: fact.sourceRecordIds,
      })),
    },
    bank,
    {
      relationship: readRelationshipStanding(world, personId, listenerPersonId),
    },
  );
  if (line.kind !== "rendered")
    throw new Error(
      `Cannot word everyday action ${key}: ${line.reasons.join("; ")}`,
    );
  return line.text;
}
