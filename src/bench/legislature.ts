import { coreAPI } from "../core2/state";
import { AMOUNT_SERIES, lawChain, lawHere } from "../core2/modules/laws";
import { composeBill } from "../english/bill-sections";
import { billTitleOf, spokenDesignation } from "../english/bill-names";
import { screenLine } from "../english/screen-words";
import { budgetLineNames, policyNames } from "./words";
import {
  billForm,
  bodyOf,
  bodyRow,
  currentAmount,
  draftBill,
  floorDateOf,
  lawInForceRow,
  memberKey,
  votesOn,
  whipCount,
  type BillRow,
  type Provision,
} from "../core2/modules/legislature";
import { placeOnAgenda, upcomingMeeting } from "../core2/modules/office-day";
import { townSeats, type TermRow } from "../core2/modules/offices";
import { appointmentsIn } from "../core2/modules/executive";
import { billCatalog } from "../core2/bill-catalog";
import type { CoreState } from "../core2/types";
import { backdropFor, faceOf, stagePeople } from "./scene";
import { hasBackdrop } from "./backdrop-places";
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

/**
 * Where a bill stands on the floor: the day the floor takes it up and, from
 * the chambers' own members, how many are for, against or undecided.
 */
function floorOf(core: CoreState, bill: BillRow) {
  const api = coreAPI(core);
  const billId = bill.id;
  // A body with regular meetings posts the bill on its next agenda; a
  // chamber's bill waits for the floor, which names its date.
  const agendaDate =
    bill.status === "drafted" && upcomingMeeting(api, bill.bodyOfficeId)
      ? placeOnAgenda(api, billId)
      : undefined;
  const offices = api.moduleState(OFFICES).table("offices");
  return {
    agendaDate,
    floorDate: agendaDate ?? floorDateOf(api, billId),
    whip: whipCount(api, billId).map((row) => ({
      chamber:
        (offices.get(row.chamber) as { title?: string } | undefined)?.title ??
        "",
      yes: row.yes.length,
      no: row.no.length,
      undecided: row.undecided.length,
    })),
  };
}

/** Your seat: the bodies you sit on, what you could change, and your bills. */
/** How a bill's recorded votes came out: the yes and no counts the screens show. */
function tallyOf(votes: readonly { vote: string }[]) {
  return {
    yes: votes.filter((row) => row.vote === "yes").length,
    no: votes.filter((row) => row.vote === "no").length,
  };
}

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
    .map((bill) => {
      const votes = votesOn(api, bill.id);
      return {
        bill,
        ...floorOf(core, bill),
        votes: votes.map((row) => ({
          ...row,
          name: personName(core, row.memberId),
        })),
        tally: tallyOf(votes),
      };
    });
  // Each body's own catalog: what its level can pass, with the amount in force.
  const bodies = bodiesOf(core, personId).map((body) => ({
    ...body,
    menus: menusFor(api, body.level),
  }));
  return {
    bodies,
    // Seats the law made them leave on taking another (offices engine).
    incompatibilities: incompatibilitiesOf(core, personId),
    amounts: lawHere(api, undefined, AMOUNT_SERIES).map((row) => ({
      series: row.series,
      unit: row.unit,
      current: currentAmount(api, row.series),
    })),
    questions: [
      ...new Set(
        bodies.flatMap((body) =>
          body.menus.flatMap((menu) =>
            menu.items.flatMap((item) =>
              item.question ? [item.question] : [],
            ),
          ),
        ),
      ),
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
            lawHere(api, undefined, [input.series]).find(
              (row) => row.series === input.series,
            )?.unit ?? undefined,
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
  const floor = floorOf(core, bill);
  return {
    ...bill,
    text,
    ...(floor.agendaDate ? { agendaDate: floor.agendaDate } : {}),
    floorDate: floor.floorDate,
    whip: floor.whip,
  };
}

/**
 * The body's lawyer's warning on a bill whose authority row the drafting
 * engine marked disputed (DECISION-REGISTER, "A law changes the record
 * first", Sept 22: the city attorney warns the player), in the English
 * engine's words. A bill before the town's own body (its office is one of the
 * town's seats and its body row makes the place's law, the council the
 * executive engine staffs departments for) names the lawyer by the title of
 * the town's appointment whose post is its attorney or counsel (the City
 * Attorney the executive engine seats at the opening); any other bill, or a
 * town whose attorney post nobody was appointed to, names the body's lawyer
 * by the body as the bill's enacting clause names it.
 */
function disputedWarning(
  api: ReturnType<typeof coreAPI>,
  bill: BillRow,
): string | null {
  const body = bodyOf(api, bill.bodyOfficeId);
  if (!body) return null;
  const name = body.bodyName ?? body.governmentName;
  const townBody = townSeats(api).some(
    (s) => s.office.id === body.id && bodyRow(s.office.kind)?.law === "place",
  );
  const lawyer = townBody
    ? appointmentsIn(api, lawChain(api).townPlaceId).find((row) =>
        /-(attorney|counsel)$/.test(row.post),
      )?.title
    : undefined;
  if (lawyer)
    return screenLine("bill-paper", "bill-paper.authority.disputed", {
      lawyer: lawyer.toLowerCase(),
      body: name,
    });
  // stopgapId: SG-GOV-body-lawyer-unrecorded (a county board, a township board, a state chamber or a town with no attorney appointed has no lawyer on record)
  api.stopgap("SG-GOV-body-lawyer-unrecorded");
  return screenLine("bill-paper", "bill-paper.authority.disputed-body", {
    body: name,
  });
}

/**
 * The bill as one paper document, read from its records: the designation and
 * title in the English engine's words, the sponsor by name, each section with
 * the estimate the records give for it (the statute it amends with the values
 * before and after, the budget line and its amount, the simulation's own cost
 * estimate) and its own authority row, the lawyer's warning where a row is
 * disputed, the floor date and whip, and the vote and signature records when
 * the body has made them. Every figure is a record read; the screen formats
 * but never computes.
 */
export function billPaper(core: CoreState, billId: string) {
  if (!core.modules.has(LEGISLATURE)) throw new Error("No bills on record.");
  const api = coreAPI(core);
  const bill = api
    .moduleState(LEGISLATURE)
    .table("bills")
    .get(billId) as unknown as BillRow | undefined;
  if (!bill) throw new Error("That bill is not before any body.");
  const form = billForm(api, bill);
  const composed = composeBill({
    ...bill,
    effective: form.effectiveSection,
    before: form.sections.map((section) => section.before),
  });
  const titled = billTitleOf({ form: bill.form, provisions: bill.provisions });
  const names = { ...policyNames(), ...budgetLineNames() };
  const sections = bill.provisions.map((provision, index) => {
    const subject = bill.title?.subjects[index] ?? null;
    const purpose =
      titled?.sections.find((row) => row.index === index)?.purpose ?? null;
    const named =
      (subject ? names[subject.key] : undefined) ??
      (provision.question ? names[provision.question] : undefined) ??
      (provision.series ? names[provision.series] : undefined) ??
      null;
    const section = form.sections[index] ?? null;
    // A citation that is a web address never reaches the screen: the
    // estimate names the law record instead, and the PR body cites it.
    const clause = (
      composed?.sections[index] ??
      (purpose && named ? `${named}: ${purpose}` : (purpose ?? named))
    )?.replace(/, amending https?:\/\/\S+\.?$/, "");
    // The section's authority row as the drafting engine recorded it.
    const authority = bill.authority[index];
    return {
      index,
      key: subject?.key ?? null,
      text: clause,
      authority: authority
        ? {
            allowed: authority.allowed,
            warning: authority.warning,
            reason: authority.reason,
          }
        : null,
      estimate: {
        statute: section?.before.statute ?? null,
        lawId: section?.before.lawId ?? null,
        beforeValue: section?.before.value ?? null,
        beforeUnit: section?.before.unit ?? null,
        afterValue: section?.after.value ?? null,
        afterUnit: section?.after.unit ?? null,
        line: provision.line ?? null,
        lineAmountMinor:
          provision.kind === "budget-line" ? provision.value : null,
        ofMinor: provision.of ?? null,
      },
    };
  });
  const floor = floorOf(core, bill);
  return {
    id: bill.id,
    number: bill.number,
    spoken: spokenDesignation(bill.number, bill.form.kind),
    title: composed?.title ?? titled?.title ?? bill.number,
    purpose: titled?.purpose ?? null,
    sponsor: personName(core, bill.sponsorId),
    sections,
    authorityWarning: bill.authority.some((row) => row.warning === "disputed")
      ? disputedWarning(api, bill)
      : null,
    effective: composed?.effective ?? null,
    estimate: {
      workers: bill.costEstimate.workersRaised,
      payMinor: bill.costEstimate.annualPayMinor,
      note: bill.costEstimate.note,
    },
    agendaDate: floor.agendaDate ?? null,
    floorDate: floor.floorDate,
    whip: floor.whip,
    votes: votesOn(api, bill.id).map((row) => ({
      ...row,
      name: personName(core, row.memberId),
    })),
    tally: tallyOf(votesOn(api, bill.id)),
    decision:
      bill.status === "drafted"
        ? null
        : { status: bill.status, passedOn: bill.passedOn ?? null },
  };
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
  ].map((m) => ({
    id: m.key.replace(/^official:/, ""),
    name: m.name,
    reason: m.you ? ("you" as const) : ("official" as const),
  }));
  const backdrop = backdropFor(core, place, minute);
  return {
    title: body.title,
    place,
    backdrop,
    ...stagePeople(core, backdrop.file, cast),
  };
}

/**
 * A body's members as the meeting panel draws them: each with their headshot (the
 * face they wear in the chamber), party and the key their votes are recorded under.
 */
export function bodyMembers(
  core: CoreState,
  personId: string,
  officeId: string,
  place: string,
) {
  const body = bodiesOf(core, personId).find((b) => b.officeId === officeId);
  return (body?.members ?? []).map((m) => ({
    key: m.key,
    name: m.name,
    party: m.party ?? null,
    you: m.you,
    face: faceOf(core, m.key.replace(/^official:/, ""), place),
  }));
}

/**
 * The bill catalog for a body: each law area's policies and budget lines that
 * its level can pass, with the amount in force today and whether the state
 * lets a town act (`billCatalog`, never the raw catalog file).
 */
function menusFor(api: ReturnType<typeof coreAPI>, bodyLevel: string) {
  const lineNames = budgetLineNames();
  const level =
    bodyLevel === "federal" || bodyLevel === "state" ? bodyLevel : "city";
  return billCatalog(api, level).map((menu) => ({
    id: menu.id,
    name: menu.name,
    items: menu.topics
      .flatMap((topic) => topic.policies)
      .filter(
        (row) =>
          (row.kind === "policy-question" && row.question) ||
          (row.kind === "budget-line" && row.line) ||
          (row.kind === "law-amount" && row.series),
      )
      .map((row) => ({
        kind: row.kind,
        // A budget line by its name on the budgets screen, never its key.
        name:
          (row.kind === "budget-line" &&
            lineNames[`budget-line:${row.line}`]) ||
          row.name,
        ...(row.question ? { question: row.question } : {}),
        ...(row.line ? { line: row.line } : {}),
        ...(row.series ? { series: row.series } : {}),
        ...(row.unit ? { unit: row.unit } : {}),
        inForce: row.inForce,
        // The amount the law in force holds, as the bill's paper cites it ("before"): the
        // draft card shows this beside the new amount so both screens say one thing.
        today: row.series
          ? (() => {
              const law = lawInForceRow(api, row.series);
              return law ? { value: law.value, unit: law.unit ?? null } : null;
            })()
          : null,
        allowed: row.authority.allowed,
        warning: row.authority.warning,
        reason: row.authority.reason,
      })),
  }));
}
