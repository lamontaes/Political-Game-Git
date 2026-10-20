/**
 * The paper's headline for a story the player has heard, composed from its
 * record through the headlines bank (words-scene-narration, the News screen):
 * a law taking effect (`law-story-words.ts`), a state's monthly jobs report,
 * a town hall and a held public meeting. A story whose kind has no pieces, or
 * whose record is gone, gets none.
 */
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import type { OfficeInput } from "../core2/offices-local";
import {
  corePlaceByJurisdictionId,
  corePlaceStateIdentities,
} from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { composeHeadline } from "../english/english-newscast";
import type { GroundedEnglishFact } from "../english/grounded-english";
import { lawStoryHeadline, storyPacket } from "./law-story-words";
import { properName, spoken } from "./words";

interface HeardStory {
  id: string;
  placeId: string;
  topic?: string;
  facts: Readonly<Record<string, string>>;
}

export interface StoryWords {
  headline: string;
  sourceRecordIds: string[];
}

const fact = (text: string, ...ids: string[]): GroundedEnglishFact => ({
  text,
  sourceRecordIds: ids as never,
});

export function storyHeadline(
  core: CoreState,
  story: HeardStory,
  /** Grading and tests only: also use parts held back until graded. */
  includeHeld = false,
): StoryWords | null {
  if (story.facts.lawId && story.facts.change)
    return lawStoryHeadline(core, story, includeHeld);
  const town = corePlaceByJurisdictionId(story.placeId as never);
  const townName = town ? spoken(town) : null;
  let roles: string[];
  const facts: Record<string, GroundedEnglishFact> = {};
  const also: string[] = [];
  if (story.topic === "economy.state-jobs-report") {
    const state = corePlaceStateIdentities().find(
      (row) => row.usps === story.facts.state,
    );
    const pct = Number(story.facts.unemploymentPct);
    if (!state || !Number.isFinite(pct)) return null;
    facts.place = fact(state.name, story.id);
    facts.percent = fact(pct.toFixed(1), story.id);
    roles = ["jobs-report"];
  } else if (story.topic === "town-hall") {
    const host = core.people.get(story.facts.hostId ?? "");
    if (!host || !townName) return null;
    facts.name = fact(
      `${host.givenName} ${host.familyName}`,
      host.id,
      story.id,
    );
    facts.place = fact(townName, story.placeId);
    also.push(host.id);
    roles = ["town-hall"];
  } else if (story.topic === "public-meeting") {
    const office = core.modules.has(OFFICES_MODULE_ID)
      ? (coreAPI(core)
          .moduleState(OFFICES_MODULE_ID)
          .table("offices")
          .get(story.facts.officeId ?? "") as unknown as
          OfficeInput | undefined)
      : undefined;
    const body = office?.bodyName ?? office?.governmentName;
    if (!body || !townName) return null;
    facts.body = fact(properName(body), office!.id, story.id);
    facts.place = fact(townName, story.placeId);
    also.push(office!.id);
    roles = ["meeting-held"];
  } else return null;
  const composed = composeHeadline(
    storyPacket(core, story.id, also, facts),
    roles,
    includeHeld,
  );
  return composed
    ? { headline: composed.text, sourceRecordIds: composed.sourceRecordIds }
    : null;
}
