import { makeIsoDate } from "../dates";
import { SeededRng } from "../rng";
import { inventedPersonBirthDate } from "../invented-person-age";
import { drawGeneratedPersonName, personName } from "../people";
import {
  createCharacterHistoryContextPeople,
  characterHistoryContextPersonId,
} from "../character-history";
import { createOrganization, createOrganizationParticipation } from "../life";
import { recordWorldEvent } from "../world";
import type { World } from "../types";
import type { GoverningOffice } from "./state-governing";
import { executiveAppointmentPostsForOffice } from "./executive-appointment-posts";
import {
  latestExecutiveAppointmentSeat,
  scheduleExecutiveAppointmentTermExpiry,
} from "./executive-appointments";

export const EXECUTIVE_APPOINTMENT_OPENING_VERSION =
  "executive-appointment-opening-v1";

/** Materializes fictional starting incumbents once. The legal term duration
 * and expiration day are sourced; expiration years are disclosed opening
 * conditions evenly spread over the duration, not claimed historical facts.
 * No historical appointment decision, past confirmation vote, vacancy, pay,
 * or treasury is invented. */
export function ensureExecutiveAppointmentOpening(
  world: World,
  office: GoverningOffice,
): World {
  let next = world;
  for (const post of executiveAppointmentPostsForOffice(office.officeKey)) {
    if (
      post.termYears !== null &&
      (!post.termEndMonthDay ||
        post.openingTermOffsetsYears.length !== post.seats)
    )
      continue;
    // A materialized seat prevents reconstruction of the whole opening cohort,
    // including after later vacancies and replacements. Old absent seats stay
    // unmaterialized until this explicit opening producer is called.
    if (
      Array.from({ length: post.seats }, (_, index) => index + 1).some(
        (seat) =>
          latestExecutiveAppointmentSeat(next, post.officeKey, seat) !== null,
      )
    )
      continue;
    const prefix = `${EXECUTIVE_APPOINTMENT_OPENING_VERSION}:${post.officeKey}`;
    let firstEndYear = Number(next.currentDate.slice(0, 4));
    if (
      post.termEndMonthDay &&
      `${firstEndYear}-${post.termEndMonthDay}` <= next.currentDate
    )
      firstEndYear += 1;
    const terms = Array.from({ length: post.seats }, (_, index) => {
      const endYear = firstEndYear + (post.openingTermOffsetsYears[index] ?? 0);
      return {
        seat: index + 1,
        key: `${prefix}:seat:${index + 1}`,
        start:
          post.termYears !== null
            ? makeIsoDate(`${endYear - post.termYears}-${post.termEndMonthDay}`)
            : next.currentDate,
        end:
          post.termYears !== null
            ? makeIsoDate(`${endYear}-${post.termEndMonthDay}`)
            : null,
      };
    });
    next = createCharacterHistoryContextPeople(
      next,
      terms.map((term) => {
        const rng = new SeededRng(next.seed).fork(`${term.key}:holder`);
        return {
          stableKey: `${term.key}:holder`,
          ...drawGeneratedPersonName(rng),
          birthDate: inventedPersonBirthDate(rng, {
            role: "executive-officeholder-at-opening",
            referenceDate: term.start,
          }),
          homeJurisdictionId: office.jurisdictionId,
        };
      }),
    );
    const provenance = {
      kind: "generated" as const,
      generatorKey: EXECUTIVE_APPOINTMENT_OPENING_VERSION,
    };
    const organizationKey = `${prefix}:organization`;
    let organization = next.history.organizations.find(
      (row) => row.stableKey === organizationKey,
    );
    if (!organization) {
      next = createOrganization(next, {
        stableKey: organizationKey,
        formedAt: terms[0]!.start,
        provenance,
        initialProfile: {
          name: post.organizationName,
          classification: `service:${post.officeKey}`,
          locationJurisdictionId: office.jurisdictionId,
        },
      });
      organization = next.history.organizations.find(
        (row) => row.stableKey === organizationKey,
      )!;
    }
    for (const term of terms) {
      const personId = characterHistoryContextPersonId(
        next,
        `${term.key}:holder`,
      );
      next = recordWorldEvent(next, {
        stableKey: term.key,
        type: "world.office-tenure",
        occurredAt: term.start,
        recordedAt: next.currentDate,
        jurisdictionId: office.jurisdictionId,
        involvedEntityIds: [personId, organization.id],
        participants: [{ personId, role: "focus:subject", detail: post.title }],
        personFactConstraints: [],
        visibility: "public",
        tags: [
          EXECUTIVE_APPOINTMENT_OPENING_VERSION,
          `office:${post.officeKey}:seat:${term.seat}`,
          `appointment-post:${post.officeKey}`,
          `appointment-seat:${term.seat}`,
          "provenance:fictional-initial-tenure",
          ...(term.end
            ? [
                `term-end:${term.end}`,
                "opening-term-years:game-profile",
                "opening-stagger:estimated",
                `opening-term-duration-years:${post.termYears}`,
              ]
            : ["opening-term-start:game-profile"]),
          `opening-organization:${organization.id}`,
        ],
        summary: `${personName(next.people[personId]!)} holds a ${post.title} seat in this fictional world's opening conditions.`,
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const tenureEventId = next.history.events.at(-1)!.id;
      next = createOrganizationParticipation(next, {
        stableKey: `${term.key}:participation`,
        personId,
        organizationId: organization.id,
        startedAt: term.start,
        kind:
          post.kind === "board"
            ? "leadership:appointed-board"
            : "leadership:department-head",
        roleKind:
          post.kind === "board"
            ? "member:board-member"
            : "leader:department-head",
        context: post.title,
        provenance,
      });
      next = scheduleExecutiveAppointmentTermExpiry(next, tenureEventId);
    }
  }
  return next;
}
