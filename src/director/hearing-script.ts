/**
 * What is said at a public hearing the director staged: the chair calls each
 * resident who spoke on the bill by name, each says who they are and, for or
 * against, what they ask, and a member questions the first. It reads the
 * staged `public-hearing` scene (its cause is the town's public-comment
 * record) and the meeting engine's remark records, and words them from the
 * hearing banks through the English engine (`mined/body-bank.ts`). Every line
 * cites the bill's record and its speaker's remark. A hearing is held before
 * the vote, so the result is not part of it.
 */
import { billOf, LEGISLATURE_MODULE_ID } from "../core2/modules/legislature";
import { remarksOn } from "../core2/modules/meetings";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { billTitleOf } from "../english/bill-names";
import type { GroundedEnglishPacket } from "../english/grounded-english";
import {
  composeBudgetHearing,
  type BodyLine,
  type HearingSpeaker,
} from "./mined/body-bank";
import type { Director } from "./ledger";

export function hearingScript(
  core: Readonly<CoreState>,
  director: Director,
  personId: PersonId,
  momentId: string,
): BodyLine[] | null {
  const book = director.ledger.people.get(personId);
  const entry = book?.schedule.find(
    (row) =>
      row.momentId === momentId &&
      row.bindings.some((bound) => bound.typeKey === "public-hearing"),
  );
  const moment = book?.momentsById.get(momentId);
  if (!entry || !moment) return null;
  const comment = core.durableLog.get(moment.causeId);
  const billId = comment?.facts?.billId;
  if (!billId || !core.modules.has(LEGISLATURE_MODULE_ID)) return null;
  const api = coreAPI(core as CoreState);
  const title = billTitleOf(billOf(api, billId))?.title;
  if (!title) return null;
  const binding = entry.bindings.find(
    (bound) => bound.typeKey === "public-hearing",
  )!;
  const spoke = new Set(
    binding.roles.find((row) => row.role === "speaker")?.personIds ?? [],
  );
  const speakers: HearingSpeaker[] = remarksOn(api, billId)
    .filter((remark) => spoke.has(remark.personId))
    .flatMap((remark) => {
      const person = core.people.get(remark.personId);
      return person
        ? [
            {
              remarkId: remark.id,
              name: `${person.givenName} ${person.familyName}`,
              place:
                corePlaceByJurisdictionId(person.placeId as never)
                  ?.displayName ?? "town",
              position: remark.position,
            },
          ]
        : [];
    });
  if (!speakers.length) return null;
  const motion = { text: title, sourceRecordIds: [billId] };
  const packet = {
    surface: "dialogue",
    momentKey: moment.id,
    worldSeed: core.seed,
    bankVersion: "words-body-v1",
    stage: "adult",
    sourceRecordIds: [billId],
    facts: { motion },
    speaker: { personId: "chair", traits: {} },
    knowledge: [
      { personId: "chair", factKey: "motion", sourceRecordIds: [billId] },
    ],
  } as unknown as GroundedEnglishPacket;
  return composeBudgetHearing(packet, speakers, billId, { result: false });
}
