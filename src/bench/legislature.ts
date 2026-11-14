import { coreAPI } from "../core2/state";
import { makeIsoDate } from "../core2/kernel/dates";
import { AMOUNT_SERIES, lawChain, lawHere } from "../core2/modules/laws";
import { composeBill } from "../english/bill-sections";
import {
  billTitleOf,
  budgetSectionSaid,
  spokenDesignation,
} from "../english/bill-names";
import { moneySaid } from "../english/count-words";
import { screenLine } from "../english/screen-words";
import { questionReasons } from "../english/question-names";
import { pronounSetOfGender, pronounWords } from "../english/pronoun-words";
import { budgetLineNames, policyNames } from "./words";
import {
  billForm,
  bodyOf,
  bodyRow,
  currentAmount,
  draftBill,
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  floorDateOf,
  memberKey,
  members as bodyMembersOf,
  proposalRight,
  publicDeclineReason,
  declinedAsks,
  likelyCarriers,
  proposeAsExecutive,
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
import { backdropFor, faceOf, peopleHere } from "./scene";
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
export function bodiesOf(core: CoreState, personId: string) {
  const api = coreAPI(core);
  const offices = api.moduleState(OFFICES);
  const mine = (
    terms(core).query("byPerson", [personId]) as unknown as TermRow[]
  ).filter((row) => row.status === "serving");
  // A member of Congress sits on the national chamber (each holds a one-seat office of their
  // own district or state), which is the body their bills go before.
  const federal = [FEDERAL_HOUSE, FEDERAL_SENATE].flatMap((chamberId) => {
    const roster = bodyMembersOf(api, chamberId);
    const body = bodyOf(api, chamberId);
    if (!body || !roster.some((row) => row.personId === personId)) return [];
    return [
      {
        officeId: chamberId,
        title: body.bodyName ?? body.governmentName,
        level: "federal",
        kind: body.kind,
        members: roster.map((row) => ({
          key: memberKey(row),
          name: personName(core, memberKey(row)),
          party: row.party,
          you: row.personId === personId,
        })),
      },
    ];
  });
  // A single-seat executive with a proposal right has no seat on the body that votes on
  // their government's bills; they send a bill to it through a member (the one engine,
  // `proposeAsExecutive`), so the body is theirs to draft for.
  const sitting = new Set(
    mine.flatMap((term) => {
      const office = offices.table("offices").get(term.officeId) as
        { id: string; seats: number } | undefined;
      return office && office.seats >= 2 ? [office.id] : [];
    }),
  );
  const byRequest = mine.flatMap((term) => {
    const office = offices.table("offices").get(term.officeId) as
      | {
          id: string;
          kind: string;
          seats: number;
          jurisdiction: string;
          level: string;
          presidesOverBody?: boolean;
        }
      | undefined;
    if (!office || office.seats >= 2) return [];
    if (proposalRight(api, office.kind).mode !== "by-request") return [];
    // An executive who presides over the board (the place's own county data) is the body's chair,
    // not an outsider: the bill goes before it in their own name (`seatAct`), never through a member.
    const presides = office.presidesOverBody === true;
    return (
      offices
        .table("offices")
        .query("byJurisdiction", [office.jurisdiction]) as unknown as {
        id: string;
        seats: number;
        level: string;
        kind: string;
      }[]
    ).flatMap((chamber) => {
      // Only the government's own body: a state's U.S. senators share its jurisdiction.
      const body =
        chamber.seats >= 2 && chamber.level === office.level
          ? bodyOf(api, chamber.id)
          : undefined;
      if (!body || sitting.has(chamber.id)) return [];
      const roster = bodyMembersOf(api, chamber.id);
      return [
        {
          officeId: chamber.id,
          title: body.bodyName ?? body.governmentName,
          level: chamber.level,
          kind: chamber.kind,
          // Sent through a member, never in the executive's own name, unless the executive
          // presides over this body and puts the bill before it as its chair.
          ...(presides ? { presides: true } : { byRequest: true }),
          members: roster.map((row) => ({
            key: memberKey(row),
            name: personName(core, memberKey(row)),
            party: row.party,
            you: row.personId === personId,
          })),
        },
      ];
    });
  });
  return [
    ...federal,
    ...byRequest,
    ...mine.flatMap((term) => seatedBody(core, term.officeId, personId)),
  ];
}

/** A body of two seats or more by its office, with its serving members; `personId` marks which member is the viewer, if any. */
function seatedBody(core: CoreState, officeId: string, personId: string) {
  const offices = coreAPI(core).moduleState(OFFICES);
  const office = offices.table("offices").get(officeId) as
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
}

/**
 * The body whose room a person is in: one they sit on, or, for someone who came to
 * watch its meeting (`watching`), the body itself with none of its members marked as them.
 */
function roomBody(
  core: CoreState,
  personId: string,
  officeId: string,
  watching: boolean,
) {
  return (
    bodiesOf(core, personId).find((b) => b.officeId === officeId) ??
    (watching ? seatedBody(core, officeId, personId)[0] : undefined)
  );
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
        // The bill said with its form's word ("Ordinance 2025-8"), never bare.
        spoken: spokenDesignation(bill.number, bill.form.kind),
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
    menus: menusFor(api, body.level, body.officeId),
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
 *
 * A phase-in is the same bill in dated steps (the owner's ruling, Sept 12
 * travel clarification, item 1): one section per step, each the same law
 * with its own amount and date, never a second bill. The legislature
 * engine puts each section into law on its own date when the bill is
 * enacted, for the bill's government and by that government's rule
 * (`enact`), so the seat names no jurisdiction and computes no date.
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
    /** A phase-in: each step's amount and the date it takes effect, in place of `value`. */
    steps?: readonly { value: number; effectiveDate: string }[];
  },
) {
  const api = coreAPI(core);
  if (input.kind !== "draft") throw new Error("Unknown act from your seat.");
  const body = bodiesOf(core, personId).find(
    (b) => b.officeId === input.officeId,
  );
  if (!body) throw new Error("You don't sit on that body.");
  // An executive's bill goes through a member (`seatAsk`), never drafted in their name.
  if ("byRequest" in body && body.byRequest)
    throw new Error("An executive asks a member (seatAsk).");
  // A budget line's amount in force today, as the writing screen shows it
  // beside the box: the player types the line's new amount, and a budget-line
  // section records the change to the line (`value`) on that amount (`of`),
  // as every other drafter of a budget bill does (legislature.ts
  // `budgetProvisions`, world-legislating), so the law sets the line to what
  // was typed.
  const lineToday = input.line
    ? (menusFor(api, body.level, input.officeId!)
        .flatMap((menu) => menu.items)
        .find((row) => row.line === input.line)?.inForce ?? null)
    : null;
  const sectionOf = (value: number | undefined): Provision =>
    input.line
      ? {
          kind: "budget-line",
          line: input.line,
          value: value === undefined ? 0 : value - (lineToday ?? 0),
          ...(lineToday ? { of: lineToday } : {}),
        }
      : input.series
        ? {
            kind: "law-amount",
            series: input.series,
            value: value ?? 0,
            unit:
              menusFor(api, body.level, input.officeId!)
                .flatMap((menu) => menu.items)
                .find((row) => row.series === input.series)?.unit ?? undefined,
          }
        : {
            kind: "policy-question",
            question: input.question ?? "",
            value: value ?? 1,
          };
  // stopgapId: SG-LEGISLATURE-phase-in-percent-a-year
  // The ruling's other form, a percent a year, is not drafted from the seat:
  // a phase-in is the dated steps the sponsor names.
  if (input.steps?.length) {
    if (input.value !== undefined)
      throw new Error("A phase-in gives each step's amount, not a value.");
    // Only a law amount reads a section's date: a budget line is amended the
    // day the bill becomes law (SG-LEGISLATURE-dated-budget-line-amended-on-enactment),
    // so its steps would land at once, and a policy question has no amount.
    if (!input.series || input.line)
      throw new Error("A phase-in steps a law amount.");
    let last = core.date;
    for (const step of input.steps) {
      const date = makeIsoDate(step.effectiveDate);
      if (date <= last)
        throw new Error(
          "Each step of a phase-in takes effect after today and after the step before it.",
        );
      last = date;
    }
  }
  if ("byRequest" in body && body.byRequest && input.steps?.length)
    throw new Error(
      "An executive's bill is sent as one amount, not a phase-in.",
    );
  const provisions: Provision[] = input.steps?.length
    ? input.steps.map((step) => ({
        ...sectionOf(step.value),
        effectiveDate: makeIsoDate(step.effectiveDate),
      }))
    : [sectionOf(input.value)];
  const bill = draftBill(api, {
    bodyOfficeId: input.officeId!,
    sponsorId: personId,
    provisions,
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
    // The bill said with its form's word ("Ordinance 2025-8"), never bare.
    spoken: spokenDesignation(bill.number, bill.form.kind),
    text,
    ...(floor.agendaDate ? { agendaDate: floor.agendaDate } : {}),
    floorDate: floor.floorDate,
    whip: floor.whip,
  };
}

/**
 * A repeal from this seat: the player's own body that can repeal the law at
 * this level (the body's bill catalog allows the series), or, for an
 * officeholder whose bodies lack the power, the legislature bodies that hold
 * it, named from the record. A resident with no office gets neither, and the
 * law page shows no Repeal action. Single-seat executives sit on no body, so
 * the action appears for them only with the mayors' and governors' bill menu.
 */
export function repealFor(
  core: CoreState,
  personId: string,
  series: string,
  level: string,
): { officeId: string | null; body: string | null } {
  const api = coreAPI(core);
  const mine = bodiesOf(core, personId)
    .filter((body) => body.level === level)
    .sort((a, b) => a.officeId.localeCompare(b.officeId));
  for (const body of mine) {
    const hit = menusFor(api, body.level, body.officeId)
      .flatMap((menu) => menu.items)
      .find(
        (item) =>
          (item.kind === "law-amount" && item.series === series) ||
          (item.kind === "policy-question" && item.question === series),
      );
    // A repeal is a draft with the value 0 (an amount zeroed, a yes-or-no
    // law answered No): the same value dev mode's Repeal button sends, and
    // the seat's draft marks it blocked where the catalog does not allow it.
    if (hit?.allowed) return { officeId: body.officeId, body: null };
  }
  const serving = (
    terms(core).query("byPerson", [personId]) as unknown as TermRow[]
  ).some((row) => row.status === "serving");
  if (!serving) return { officeId: null, body: null };
  const names = [
    ...new Set(
      townSeats(api)
        .filter(
          (seat) => seat.office.level === level && bodyRow(seat.office.kind),
        )
        .map((seat) => seat.office.bodyName ?? seat.office.title),
    ),
  ].sort();
  return { officeId: null, body: names.length ? names.join(" or ") : null };
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
 * The amount a budget-line section sets its line to: the engine's own after
 * (the line in force plus the change), else the change on the amount the
 * section names it is made on.
 */
function lineSets(
  provision: Provision,
  section: { after: { value: number | null } } | null,
): number {
  return typeof section?.after.value === "number"
    ? section.after.value
    : (provision.of ?? 0) + provision.value;
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
    // A budget line says its own name and amount (rounded as people say it), not the bill's one
    // purpose again on every line.
    const clause =
      composed?.sections[index] ??
      (provision.kind === "budget-line" && named
        ? budgetSectionSaid(named, moneySaid(lineSets(provision, section)))
        : purpose && named
          ? `${named}: ${purpose}`
          : (purpose ?? named));
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
        // The bill that passed the law this section amends, said as the section
        // text names it ("Ordinance 2025-3"): the record's designation and form
        // through the English engine's `spokenDesignation`.
        statute: section?.before.statute
          ? spokenDesignation(
              section.before.statute,
              section.before.statuteForm ?? "",
            )
          : null,
        lawId: section?.before.lawId ?? null,
        beforeValue: section?.before.value ?? null,
        beforeUnit: section?.before.unit ?? null,
        afterValue: section?.after.value ?? null,
        afterUnit: section?.after.unit ?? null,
        // The date this section names for itself (a phase-in's step), or
        // null when it takes effect by the bill's closing section.
        effectiveDate: section?.after.effectiveDate ?? null,
        line: provision.line ?? null,
        // The amount the bill sets the line to for the year: the change added
        // to the amount it is made on, as the law would pay it.
        lineNewMinor:
          provision.kind === "budget-line"
            ? lineSets(provision, section)
            : null,
        ofMinor: provision.of ?? null,
      },
    };
  });
  const floor = floorOf(core, bill);
  return {
    id: bill.id,
    number: bill.number,
    spoken: spokenDesignation(bill.number, bill.form.kind),
    title:
      composed?.title ??
      titled?.title ??
      spokenDesignation(bill.number, bill.form.kind),
    purpose: titled?.purpose ?? null,
    sponsor: personName(core, bill.sponsorId),
    bodyOfficeId: bill.bodyOfficeId,
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
        : {
            status: bill.status,
            passedOn: bill.passedOn ?? null,
            // The day the bill's fate was decided: it passed, or a vote or a committee ended it.
            decidedOn: bill.passedOn ?? bill.failedOn ?? null,
          },
  };
}

/**
 * The picture of a body's own meeting room, by its kind and size (scene-places
 * bodyPlaces and bodyPlacesBySize); null when the person does not sit on it.
 * The body scene and any scene staged in that chamber show the same room.
 */
export function bodyPicture(
  core: CoreState,
  personId: string,
  officeId: string,
  watching = false,
): string | null {
  const body = roomBody(core, personId, officeId, watching);
  if (!body) return null;
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
  return place;
}

/** The body in its meeting room: the player at the front, colleagues behind. */
export function bodyScene(
  core: CoreState,
  personId: string,
  officeId: string,
  minute: number,
  watching = false,
) {
  const body = roomBody(core, personId, officeId, watching);
  if (!body) throw new Error("You don't sit on that body.");
  const place = bodyPicture(core, personId, officeId, watching)!;
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
    ...peopleHere(core, backdrop.file, cast),
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
  watching = false,
) {
  const body = roomBody(core, personId, officeId, watching);
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
function menusFor(
  api: ReturnType<typeof coreAPI>,
  bodyLevel: string,
  officeId: string,
) {
  const lineNames = budgetLineNames();
  const level =
    bodyLevel === "federal" || bodyLevel === "state" || bodyLevel === "county"
      ? bodyLevel
      : "city";
  const body = bodyOf(api, officeId);
  // A senator's seat is of a state; its lawmaking body is the one US chamber.
  const jurisdiction =
    bodyRow(body?.kind ?? "")?.jurisdiction ?? body?.jurisdiction;
  return billCatalog(api, level, jurisdiction).map((menu) => ({
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
        today: {
          value: row.inForce,
          unit: row.inForceUnit ?? row.unit ?? null,
          recordId: row.inForceRecordId,
        },
        allowed: row.authority.allowed,
        warning: row.authority.warning,
        reason: row.authority.reason,
      })),
  }));
}

/** Whether the person's bill to this body goes through a member (a single-seat executive's right). */
export function isByRequest(
  core: CoreState,
  personId: string,
  officeId: string | undefined,
): boolean {
  return bodiesOf(core, personId).some(
    (b) => b.officeId === officeId && "byRequest" in b && b.byRequest,
  );
}

/**
 * An executive sends one bill to the body that votes on their government's bills: the
 * member most inclined to carry it is asked (`proposeAsExecutive`, the one engine) and
 * answers from their own position and tie to the executive. Returns who was asked, what
 * they said and the bill when they carried it; a refusal files nothing.
 */
/** The one provision an executive's ask names, from the menu item and amount the player picked. */
function askProvision(
  api: ReturnType<typeof coreAPI>,
  body: { level: string },
  input: {
    officeId?: string;
    series?: string;
    question?: string;
    line?: string;
    value?: number;
  },
): Provision {
  return input.line
    ? { kind: "budget-line", line: input.line, value: input.value ?? 0 }
    : input.series
      ? {
          kind: "law-amount",
          series: input.series,
          value: input.value ?? 0,
          unit:
            menusFor(api, body.level, input.officeId!)
              .flatMap((menu) => menu.items)
              .find((row) => row.series === input.series)?.unit ?? undefined,
        }
      : {
          kind: "policy-question",
          question: input.question ?? "",
          value: input.value ?? 1,
        };
}

/**
 * The members an executive may ask to carry this bill, with the one the engine would ask marked as
 * the likely yes (`likelyCarriers`, the ranking the ask itself reads).
 */
export function seatAskOptions(
  core: CoreState,
  personId: string,
  input: {
    officeId?: string;
    series?: string;
    question?: string;
    line?: string;
    value?: number;
  },
) {
  const api = coreAPI(core);
  const body = bodiesOf(core, personId).find(
    (b) => b.officeId === input.officeId && "byRequest" in b && b.byRequest,
  );
  if (!body) throw new Error("You can't send a bill to that body.");
  const ranked = likelyCarriers(api, input.officeId!, [
    askProvision(api, body, input),
  ]);
  return {
    members: ranked.map((row, index) => ({
      key: row.key,
      name: personName(core, row.key),
      party: body.members.find((m) => m.key === row.key)?.party ?? null,
      likely: index === 0,
    })),
  };
}

export function seatAsk(
  core: CoreState,
  personId: string,
  input: {
    officeId?: string;
    series?: string;
    question?: string;
    line?: string;
    value?: number;
    /** The member the executive chose to ask; none asks the likeliest yes. */
    memberId?: string;
  },
) {
  const api = coreAPI(core);
  const body = bodiesOf(core, personId).find(
    (b) => b.officeId === input.officeId && "byRequest" in b && b.byRequest,
  );
  if (!body) throw new Error("You can't send a bill to that body.");
  const provision = askProvision(api, body, input);
  const asked = proposeAsExecutive(api, {
    bodyOfficeId: input.officeId!,
    provisions: [provision],
    byPlayer: true,
    ...(input.memberId ? { memberId: input.memberId } : {}),
  });
  if (!asked)
    throw new Error("No member of that body can be asked to carry it.");
  // The member asked is never the player: `proposeAsExecutive` skips the executive's own key,
  // and `bodiesOf` offers an executive only a body they do not sit on, so the engine's held
  // ask for the player (`awaitingPlayer`) cannot come back here and the screen has no line for it.
  if (asked.awaitingPlayer)
    throw new Error(
      "An executive's bill was asked of the player; the menu should not offer this body.",
    );
  // A no is kept with its reason and date (the ask's own row, `declinedAsks`) and can be asked
  // again later; the screen reads the reason back and says when the same member said no before.
  const reason = asked.carried ? null : publicDeclineReason(asked);
  const section = asked.provisions[0]!;
  const spoken =
    reason === "views" &&
    section.kind === "policy-question" &&
    section.question &&
    section.value > 0
      ? questionReasons(section.question, "against").reason
      : null;
  const earlier = declinedAsks(
    api,
    asked.askerId,
    asked.memberId,
    asked.bodyOfficeId,
  )
    .filter((row) => row.id !== asked.id)
    .map((row) => row.date);
  const seat = bodyMembersOf(api, input.officeId!).find(
    (row) => memberKey(row) === asked.memberId,
  );
  const person = api.state.people.get(asked.memberId);
  const words = pronounWords(
    person?.looks?.pronouns ?? pronounSetOfGender(seat?.identity.gender),
  );
  return {
    asked: {
      memberId: asked.memberId,
      // How the screen speaks of the member, from their record: null is the they form.
      pronouns: words
        ? {
            lower: words.lower,
            object: words.object,
            possessive: words.possessive,
          }
        : null,
      name: personName(core, asked.memberId),
      carried: asked.carried,
      askId: asked.id,
      billId: asked.billId,
      ...(reason ? { reason, ...(spoken ? { reasonWords: spoken } : {}) } : {}),
      ...(!asked.carried && earlier.length ? { earlier } : {}),
    },
  };
}
