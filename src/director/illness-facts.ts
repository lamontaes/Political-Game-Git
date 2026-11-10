/**
 * What a visit to someone seriously ill may say, from the illness record that
 * caused it (`health.serious-illness`) and the records around it: how long
 * they have been ill (the record's date), whether they live alone, with a
 * partner or with a child (the household's members), and another person who
 * heard of the illness and could be called (the record's witnesses, the
 * closest to them). Each fact is cited to the records it came from; a fact
 * with no record behind it is left out, so the lines that need it never play.
 * The illness itself is never named: the record does not say its kind, and
 * what the sick person asks of the visitor is the purpose itself
 * (SG-WORDS-visit-ill-ask-unrecorded).
 */
import { closenessBetween, familyRelation } from "../core2/closeness";
import { ageOnDate, daysBetweenText } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import { spanSaid } from "../english/span-words";
import { properName } from "./words";
import { ILLNESS_EVENT, type NewsFact } from "./life-news";
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };

/** The situation type that reads these facts. */
export const VISIT_TYPE = "visit";

/** Days of illness before it is said as a stretch of time: about two weeks. */
const MIN_DAYS = 15;

/**
 * The facts for `askerId`, the one who is ill, asking `askedId`, who visits;
 * or for `askerId`, who visits `askedId`, the one who is ill. Empty for any
 * other type, or a cause that is not an illness of one of the two.
 */
export function illnessFacts(
  core: Readonly<CoreState>,
  typeKey: string,
  causeId: string,
  askerId: PersonId,
  askedId: PersonId,
): Record<string, NewsFact> {
  if (typeKey !== VISIT_TYPE) return {};
  const record = core.durableLog.get(causeId);
  if (record?.kind !== ILLNESS_EVENT) return {};
  // The sick person asks the visitor, or the visitor comes to the sick person.
  const illId = record.personIds.at(P.zero) as PersonId | undefined;
  const visited = illId === askedId;
  if (!illId || (illId !== askerId && !visited)) return {};
  const ill = core.people.get(illId);
  if (!ill) return {};
  const facts: Record<string, NewsFact> = {};
  if (visited)
    facts["you-ill"] = { text: "yes", sourceRecordIds: [causeId, illId] };
  else facts.ill = { text: ill.givenName, sourceRecordIds: [causeId, illId] };

  // How long they have been ill.
  if (daysBetweenText(record.date, core.date) >= MIN_DAYS)
    facts["sick-for"] = {
      text: spanSaid(daysBetweenText(record.date, core.date)),
      sourceRecordIds: [causeId],
    };

  // Who is in their home: nobody, a partner, a child.
  const household = core.households.get(ill.householdId);
  const others = (household?.memberIds ?? [])
    .filter((id) => id !== askerId && id !== askedId)
    .map((id) => core.people.get(id as PersonId))
    .filter((row) => row?.alive);
  const homeIds = [causeId, ill.householdId];
  if (
    !others.length &&
    (household?.memberIds ?? []).every((id) => id === askerId || id === askedId)
  )
    facts["lives-alone"] = { text: "yes", sourceRecordIds: homeIds };
  const partner = others.find(
    (row) => familyRelation(core, illId, row!.id) === "partner",
  );
  if (partner)
    facts.partner = {
      text: partner.givenName,
      sourceRecordIds: [...homeIds, partner.id],
    };
  const child = others
    .filter(
      (row) =>
        ageOnDate(row!.birthDate, core.date) <
        rulesFile.familyStakes.youngChildAge.value,
    )
    .sort(
      (a, b) =>
        b!.birthDate.localeCompare(a!.birthDate) || a!.id.localeCompare(b!.id),
    )[P.zero];
  if (child)
    facts.child = {
      text: child.givenName,
      sourceRecordIds: [...homeIds, child.id],
    };

  // Someone else who heard of it, the closest to them, who could be called.
  const heard = (record.witnessIds ?? [])
    .filter((id) => id !== askedId && id !== askerId && id !== illId)
    .map((id) => core.people.get(id))
    .filter((row) => row?.alive && row.householdId !== ill.householdId)
    .sort(
      (a, b) =>
        closenessBetween(core, illId, b!.id) -
          closenessBetween(core, illId, a!.id) || a!.id.localeCompare(b!.id),
    )[P.zero];
  if (heard)
    facts.other = {
      text: heard.givenName,
      sourceRecordIds: [causeId, heard.id],
    };
  if (visited) {
    // The visitor is the sick person's partner, or lives with them.
    if (familyRelation(core, illId, askerId) === "partner")
      facts["visitor-partner"] = {
        text: "yes",
        sourceRecordIds: [causeId, askerId],
      };
    // Their work, where the job row names an employer.
    const job = ill.jobId ? core.jobs.get(ill.jobId) : undefined;
    const org = job ? core.organizations.get(job.organizationId) : undefined;
    if (job && org && !job.endsAt)
      facts.employer = {
        text: properName(org.name),
        sourceRecordIds: [causeId, job.id, org.id],
      };
  }
  return facts;
}
