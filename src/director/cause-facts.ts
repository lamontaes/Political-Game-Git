/**
 * What the record behind a moment names, as the narrator says it: the office
 * a race or an oath is for, the bill a vote or a signing is about, the
 * employer or outlet that called, the job's title, the party that asked, the
 * charge and the prison term, the landlord, the law. One reader for every
 * scene's lead and cause line (`composeScene`), so a line about a record says
 * what that record holds (owner, Nov 11: every line through the English
 * engine, with inserts from the world's records). A fact the record does not
 * hold is left out, and the engine picks a wording that does not need it.
 */
import { ELECTIONS_MODULE_ID } from "../core2/modules/elections";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { monthsOfRentDays } from "../english/count-words";
import { jobSaid, seatSaid } from "../english/journal-words";
import { spanSaid } from "../english/span-words";
import type { Fact } from "../english/scene-words";
import { billName, lawName, lawTopic } from "./journal";
import { properName } from "./words";

interface OfficeRow {
  readonly title: string;
  readonly seats?: number;
  readonly bodyName?: string | null;
}

function officeSaid(
  core: Readonly<CoreState>,
  facts: Readonly<Record<string, unknown>>,
): { text: string; ids: string[] } | null {
  const api = coreAPI(core as CoreState);
  const offices = core.modules.has(OFFICES_MODULE_ID)
    ? api.moduleState(OFFICES_MODULE_ID).table("offices")
    : null;
  const contest =
    typeof facts.contestId === "string" && core.modules.has(ELECTIONS_MODULE_ID)
      ? (api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .get(facts.contestId) as unknown as
          | { officeId: string; title: string; district: string | null }
          | undefined)
      : undefined;
  // A record names its office by the contest, else by the office's id (an
  // oath's record), else by the title the record wrote.
  const officeId =
    contest?.officeId ??
    (typeof facts.officeId === "string" ? facts.officeId : undefined) ??
    (typeof facts.office === "string" && facts.office.includes(":")
      ? facts.office
      : undefined);
  const office = officeId
    ? (offices?.get(officeId) as unknown as OfficeRow | undefined)
    : undefined;
  const title =
    contest?.title ??
    office?.title ??
    (typeof facts.office === "string" && !facts.office.includes(":")
      ? facts.office
      : undefined);
  if (!title) return null;
  const seats = office?.seats ?? P.one;
  return {
    text: seatSaid({
      title,
      seats,
      bodyName: seats > P.one ? (office?.bodyName ?? null) : null,
      district: contest?.district ?? null,
    }),
    ids: [contest ? String(facts.contestId) : (officeId ?? "")].filter(Boolean),
  };
}

/** An organization's name, from its record. */
function orgSaid(
  core: Readonly<CoreState>,
  id: unknown,
): { text: string; id: string } | null {
  if (typeof id !== "string") return null;
  const org = core.organizations.get(id as never);
  return org ? { text: properName(org.name), id: org.id } : null;
}

/** A person's first name, from their record: the scene's first line has said it in full. */
function givenSaid(core: Readonly<CoreState>, id: unknown): string | null {
  if (typeof id !== "string") return null;
  return core.people.get(id as PersonId)?.givenName ?? null;
}

/**
 * The facts a moment's cause record holds, keyed by the slots the scene
 * bank's lines name: `office`, `bill`, `org`, `outlet`, `title`, `party`,
 * `offense`, `term`, `landlord`, `rival`, `speaker`, `law` or `topic`.
 */
export function causeRecordFacts(
  core: Readonly<CoreState>,
  causeId: string,
): Record<string, Fact> {
  const out: Record<string, Fact> = {};
  const record = core.durableLog.get(causeId as never);
  const facts = (record?.facts ?? {}) as Readonly<Record<string, unknown>>;
  const put = (key: string, text: string | null | undefined, ids: string[]) => {
    if (text) out[key] = { text, sourceRecordIds: [causeId, ...ids] };
  };
  if (record) {
    const office = officeSaid(core, facts);
    if (office) put("office", office.text, office.ids);
    if (typeof facts.billId === "string")
      put("bill", billName(core, facts.billId), [facts.billId]);
    // A closure names the organization in its status fact's key.
    const closed = Object.keys(facts)
      .map((key) => /^organization:(?<id>.+):status$/.exec(key)?.groups?.id)
      .find(Boolean);
    const org = orgSaid(core, facts.organizationId ?? closed);
    if (org) put("org", org.text, [org.id]);
    const outlet = orgSaid(core, facts.outletId);
    if (outlet) put("outlet", outlet.text, [outlet.id]);
    if (typeof facts.title === "string") put("title", jobSaid(facts.title), []);
    if (typeof facts.party === "string") put("party", facts.party, []);
    if (typeof facts.offense === "string") put("offense", facts.offense, []);
    // A prison term, as people say it: "two years".
    const months = Number(facts.custodyMonths);
    if (Number.isFinite(months) && months > P.zero)
      put("term", spanSaid(monthsOfRentDays(months)), []);
    // An eviction's record names the landlord as its topic.
    if (record.kind === "housing.eviction") {
      const landlord = orgSaid(core, record.topic);
      if (landlord) put("landlord", landlord.text, [landlord.id]);
    }
    // The rival a race's record names (who filed, whose message), in full.
    const rival = facts.rivalId;
    if (typeof rival === "string") {
      const row = core.people.get(rival as PersonId);
      if (row) put("rival", `${row.givenName} ${row.familyName}`, [rival]);
    }
    // Who gave the speech the moment is about, by first name: the scene's
    // first line names the one the player meets in full.
    const speaker = facts["views:speaker"];
    put("speaker", givenSaid(core, speaker), [String(speaker)]);
    // A law's effect learned: the law by its bill's name, else what it is about.
    if (record.kind === "law.effect-learned") {
      const lawId = String(facts.lawId ?? "");
      const named = lawName(core, lawId);
      const about = named ? undefined : lawTopic(core, lawId);
      if (named) put("law", named.text, named.recordIds);
      else if (about) put("topic", about.text, about.recordIds);
    }
  }
  // A job's own record (a job begun, left or offered): its employer.
  const job = core.jobs.get(causeId as never);
  const employer = job ? orgSaid(core, job.organizationId) : null;
  if (employer && !out.org) put("org", employer.text, [employer.id]);
  return out;
}
