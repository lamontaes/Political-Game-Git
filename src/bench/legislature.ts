import { coreAPI } from "../core2/state";
import { lawHere } from "../core2/modules/laws";
import { composeBill } from "../english/bill-sections";
import {
  billForm,
  currentAmount,
  draftBill,
  memberKey,
  votesOn,
  type BillRow,
  type Provision,
} from "../core2/modules/legislature";
import { placeOnAgenda } from "../core2/modules/office-day";
import type { TermRow } from "../core2/modules/offices";
import billCatalog from "../core2/data/legislature/bill-catalog.json" with { type: "json" };
import type { CoreState } from "../core2/types";
import { backdropFile, hasBackdrop, stagePeople } from "./scene";
import scenePlaces from "./data/scene-places.json" with { type: "json" };

const OFFICES = "core2-offices-v1";
const LEGISLATURE = "core2-legislature-v1";

function terms(core: CoreState) {
  return coreAPI(core).moduleState(OFFICES).table("terms");
}
/** A person's or a named official's name, by their key. */
export function personName(core: CoreState, key: string): string {
  const person = core.people.get(key);
  if (person) return `${person.givenName} ${person.familyName}`;
  const term = terms(core).get(key.replace(/^official:/, "")) as
    TermRow | undefined;
  return term ? `${term.identity.givenName} ${term.identity.familyName}` : key;
}

/** The bodies the person sits on (more than one seat), with their colleagues. */
function bodiesOf(core: CoreState, personId: string) {
  const api = coreAPI(core);
  const offices = api.moduleState(OFFICES);
  const mine = (
    terms(core).query("byPerson", [personId]) as unknown as TermRow[]
  ).filter((row) => row.status === "serving");
  return mine.flatMap((term) => {
    const office = offices.table("offices").get(term.officeId) as
      | {
          id: string;
          title: string;
          seats: number;
          level: string;
          kind: string;
        }
      | undefined;
    if (!office || office.seats < 2) return [];
    const members = (
      offices.table("seats").query("byOffice", [office.id]) as unknown as {
        id: string;
      }[]
    ).flatMap(
      (seat) =>
        terms(core).query("bySeatStatus", [
          seat.id,
          "serving",
        ]) as unknown as TermRow[],
    );
    return [
      {
        officeId: office.id,
        title: office.title,
        level: office.level,
        kind: office.kind,
        members: members.map((row) => ({
          key: memberKey(row),
          name: personName(core, memberKey(row)),
          party: row.party,
          you: row.personId === personId,
        })),
      },
    ];
  });
}

/** The seats this person left on taking another, with the law that required it. */
function incompatibilitiesOf(core: CoreState, personId: string) {
  const offices = coreAPI(core).moduleState(OFFICES);
  const officeTitle = (termId: string) => {
    const term = terms(core).get(termId) as TermRow | undefined;
    const office = term
      ? (offices.table("offices").get(term.officeId) as
          { title: string } | undefined)
      : undefined;
    return office?.title ?? termId;
  };
  return (
    offices.table("incompatibilities").rows() as unknown as {
      id: string;
      personId: string;
      previousTermId: string;
      acceptedTermId: string;
      date: string;
      law: { citation: string };
    }[]
  )
    .filter((row) => row.personId === personId)
    .map((row) => ({
      id: row.id,
      date: row.date,
      left: officeTitle(row.previousTermId),
      took: officeTitle(row.acceptedTermId),
      law: row.law.citation,
    }));
}

/** Your seat: the bodies you sit on, what you could change, and your bills. */
export function seatView(core: CoreState, personId: string) {
  if (!core.modules.has(LEGISLATURE))
    return {
      bodies: [],
      bills: [],
      amounts: [],
      questions: [],
      incompatibilities: [],
    };
  const api = coreAPI(core);
  const bills = (
    api.moduleState(LEGISLATURE).table("bills").rows() as unknown as BillRow[]
  )
    .filter((row) => row.sponsorId === personId)
    .map((bill) => ({
      bill,
      votes: votesOn(api, bill.id).map((row) => ({
        ...row,
        name: personName(core, row.memberId),
      })),
    }));
  return {
    bodies: bodiesOf(core, personId),
    // Seats the law made them leave on taking another (offices engine).
    incompatibilities: incompatibilitiesOf(core, personId),
    amounts: lawHere(api).map((row) => ({
      series: row.series,
      unit: row.unit,
      current: currentAmount(api, row.series),
    })),
    // Every law area on GOV's bill catalog: its policies and budget lines.
    menus: catalogMenus(),
    questions: [
      ...new Set([
        ...catalogMenus().flatMap((menu) =>
          menu.items.flatMap((item) => (item.question ? [item.question] : [])),
        ),
      ]),
    ],
    bills,
  };
}

/**
 * Draft a bill from your seat: it goes on the body's next agenda that is not
 * yet posted. Asking a colleague, offering a deal and taking the vote are
 * acts in the day and the meeting scene (office-day), not buttons here.
 */
export function seatAct(
  core: CoreState,
  personId: string,
  input: {
    kind: string;
    officeId?: string;
    series?: string;
    question?: string;
    /** A budget line the bill changes, by the amount in cents. */
    line?: string;
    value?: number;
  },
) {
  const api = coreAPI(core);
  if (input.kind !== "draft") throw new Error("Unknown act from your seat.");
  if (!bodiesOf(core, personId).some((b) => b.officeId === input.officeId))
    throw new Error("You don't sit on that body.");
  const provision: Provision = input.line
    ? { kind: "budget-line", line: input.line, value: input.value ?? 0 }
    : input.series
      ? {
          kind: "law-amount",
          series: input.series,
          value: input.value ?? 0,
          unit:
            lawHere(api).find((row) => row.series === input.series)?.unit ??
            undefined,
        }
      : {
          kind: "policy-question",
          question: input.question ?? "",
          value: input.value ?? 1,
        };
  const bill = draftBill(api, {
    bodyOfficeId: input.officeId!,
    sponsorId: personId,
    provisions: [provision],
  });
  // The bill on paper, worded from its record: title, sections with the old
  // and new values and the statute amended, and the effective date.
  const form = billForm(api, bill);
  const text =
    composeBill({
      ...bill,
      effective: form.effectiveSection,
      before: form.sections.map((section) => section.before),
    })?.text ?? [];
  return bill.status === "drafted"
    ? { ...bill, text, agendaDate: placeOnAgenda(api, bill.id) }
    : { ...bill, text };
}

/** The body in its meeting room: the player at the front, colleagues behind. */
export function bodyScene(
  core: CoreState,
  personId: string,
  officeId: string,
  minute: number,
) {
  const body = bodiesOf(core, personId).find((b) => b.officeId === officeId);
  if (!body) throw new Error("You don't sit on that body.");
  const places = scenePlaces.bodyPlaces as unknown as Record<string, string[]>;
  const offices = coreAPI(core).moduleState(OFFICES).table("offices");
  // A legislature with no upper chamber on record meets in a one-house chamber.
  const kind =
    body.kind === "legislature-lower" &&
    !(offices.rows() as unknown as { kind: string }[]).some(
      (row) => row.kind === "legislature-upper",
    )
      ? "legislature-unicameral"
      : body.kind;
  // A council's room by its seats, a county board's by the town's size.
  const sized = (
    scenePlaces.bodyPlacesBySize as unknown as Record<
      string,
      { underSeats?: number; underPopulation?: number; places: string[] }[]
    >
  )[kind]?.find((row) =>
    row.underSeats !== undefined
      ? ((offices.get(officeId) as { seats?: number } | undefined)?.seats ??
          body.members.length) < row.underSeats
      : Number(core.placeMetadata?.referencePopulation ?? 0) <
        (row.underPopulation ?? 0),
  )?.places;
  const place =
    [...(sized ?? []), ...(places[kind] ?? []), ...places.default!].find(
      hasBackdrop,
    ) ?? places.default![0]!;
  const cast = [
    ...body.members.filter((m) => m.you),
    ...body.members.filter((m) => !m.you),
  ].map((m) => ({ id: m.key.replace(/^official:/, ""), name: m.name }));
  return {
    title: body.title,
    place,
    backdrop: backdropFile(place, minute),
    ...stagePeople(core, place, cast),
  };
}

interface CatalogPolicy {
  kind: string;
  name: string;
  question?: string;
  line?: string;
}
/** The bill catalog's subjects, each with its policy questions and budget lines. */
function catalogMenus() {
  const subjects = (
    billCatalog as unknown as {
      subjects: {
        id: string;
        name: string;
        topics: { policies?: CatalogPolicy[] }[];
      }[];
    }
  ).subjects;
  return subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    items: subject.topics
      .flatMap((topic) => topic.policies ?? [])
      .filter(
        (row) =>
          (row.kind === "policy-question" && row.question) ||
          (row.kind === "budget-line" && row.line),
      )
      .map((row) => ({
        kind: row.kind,
        name: row.name,
        ...(row.question ? { question: row.question } : {}),
        ...(row.line ? { line: row.line } : {}),
      })),
  }));
}
