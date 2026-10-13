/**
 * The executive's desk (M3-05; BOARD "features the old engine had":
 * executive acts), on one engine for every level: appointments with
 * confirmation, and executive orders where the office really has the power.
 * Signing or vetoing and budget priorities already run through the
 * legislature and budgets engines.
 *
 * - **Appointments.** The town's department heads come from its form of
 *   government (`data/research/executive/executive-powers-2026.json`, local
 *   forms): the appointing authority (the mayor, or the council where it
 *   appoints) chooses among the town's adults by how closely their views
 *   match, their qualification (reliability and deliberation, and experience
 *   in that department) and whether the appointer knows them; the council
 *   confirms where the form asks it to. The player, as the appointer, names
 *   their own choice. A state's cabinet is drawn as fictional appointees the
 *   governor chooses among, confirmed by the state senate where the state
 *   requires it.
 * - **Executive orders.** An executive can order what their office may set
 *   without the legislature (research `canOrder`), as a law row the next
 *   executive can revoke; it reaches people through the same law effects as a
 *   statute. Only orders an engine can carry are offered.
 */
import research from "../../../data/research/executive/executive-powers-2026.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { enactLaw, lawChain } from "./laws";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./offices";
import {
  nominateAndConfirm,
  partySide,
  type Appointment,
} from "../appointments";
import { drawOfficialIdentity } from "../officials-identity";
import { campaignParameter, personLean } from "../campaign-views";
import { mayorVeto, memberKey, members } from "./legislature";
import { BUDGETS_MODULE_ID, governments } from "./budgets";
import { startPublicJob } from "../public-payroll";

export const EXECUTIVE_MODULE_ID = "core2-executive-v1";

interface PostSpec {
  readonly key: string;
  readonly title: string;
  readonly appointedBy: string;
  readonly confirmedBy: string;
}
const RESEARCH = research as unknown as {
  local: { city: Record<string, PostSpec[]> };
  places: Record<
    string,
    {
      cabinet?: { positions?: PostSpec[] };
      canOrder?: { key: string }[] | Record<string, unknown>;
    }
  >;
};

/** The orders an engine can carry, by the research key, to the law series they set. */
const ORDERABLE: Readonly<Record<string, string>> = {
  "restore-voting-after-sentence":
    "us-policy-positions:justice-public-safety.restore-voting-after-sentence",
};

export interface AppointmentRow {
  readonly id: string;
  readonly government: string;
  readonly post: string;
  readonly title: string;
  readonly holderId: string;
  /** A fictional appointee's name, where they aren't a resident. */
  readonly identity: { givenName: string; familyName: string } | null;
  readonly appointedBy: string;
  readonly confirmation: Appointment["confirmation"];
  readonly reasons: Appointment["reasons"];
  readonly since: string;
}

export const EXECUTIVE_MODULE: CoreModule = {
  id: EXECUTIVE_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      appointments: { indexes: { byGovernment: { fields: ["government"] } } },
      orders: {},
    },
  },
};

const table = (api: CoreAPI, name: string) =>
  api.moduleState(EXECUTIVE_MODULE_ID).table(name);
const ageOn = (p: Readonly<Pick<PersonState, "birthDate">>, date: string) =>
  Number(date.slice(0, 4)) - Number(p.birthDate.slice(0, 4));

/** The town's form of government, read from who holds office there. */
export function townForm(
  api: CoreAPI,
): "strong-mayor" | "weak-mayor-council" | "council-manager" {
  const seats = townSeats(api);
  const mayor = seats.find(
    (s) => s.office.kind === "mayor" && s.office.elected && s.holder,
  );
  // A directly elected mayor with the state's veto runs the departments; one
  // without it shares them with the council (weak mayor); no elected mayor,
  // a manager does.
  if (!mayor) return "council-manager";
  return mayorVeto(api).veto ? "strong-mayor" : "weak-mayor-council";
}

/**
 * Register the desk and fill the town's department heads and the state's
 * cabinet at the opening (who holds them then; vacancies come later).
 */
export function openExecutive(core: CoreState, worldSeed: string): void {
  if (core.modules.has(EXECUTIVE_MODULE_ID)) return;
  registerModule(core, EXECUTIVE_MODULE);
  const api = coreAPI(core);
  appointTownDepartments(api);
  appointStateCabinet(api, worldSeed);
}

function townAppointer(api: CoreAPI, by: string): TermRow | null {
  const seats = townSeats(api);
  const office = /mayor/.test(by) ? "mayor" : "council";
  return (
    seats.find((s) => s.office.kind === office && s.holder?.personId)?.holder ??
    null
  );
}

function councilSides(api: CoreAPI): number[] {
  const council = townSeats(api).find((s) => s.office.kind === "council");
  return council
    ? members(api, council.office.id).map((t) => partySide(t.party))
    : [];
}

/** How qualified a resident is for a department: temperament, and work there. */
function qualification(
  api: CoreAPI,
  person: Readonly<PersonState>,
  post: string,
): number {
  const temperament =
    ((person.traits["people-mind-v1:reliability"] ?? 0) +
      (person.traits["people-mind-v1:deliberation"] ?? 0)) /
    4;
  const core = api.state as CoreState;
  const worksThere = [...(core.work.commitmentsByPerson.get(person.id) ?? [])]
    .map((id) => core.work.commitments.get(id))
    .some((c) => {
      const org = c ? core.organizations.get(c.organizationId) : undefined;
      return !!org && org.name.toLowerCase().includes(post.split("-")[0]!);
    });
  return Math.max(
    0,
    Math.min(
      1,
      0.5 +
        temperament +
        (worksThere ? campaignParameter("appointmentExperienceWeight") : 0),
    ),
  );
}

/**
 * Fill one town post: the appointer's choice among the town's adults (or the
 * player's own choice, when the player is the appointer), confirmed by the
 * council where the form asks it to.
 */
function fillTownPost(
  api: CoreAPI,
  spec: PostSpec,
  chosenId?: string,
): AppointmentRow | null {
  const appointer = townAppointer(api, spec.appointedBy);
  const date = api.state.date;
  const town = lawChain(api).townPlaceId;
  const appointerLean = appointer?.personId
    ? personLean(api.state.people, api.state.people.get(appointer.personId)!, 0)
    : 0;
  // One post each: someone already heading a department isn't asked again.
  const holding = new Set(
    appointmentsIn(api, town)
      .filter((a) => a.post !== spec.key)
      .map((a) => a.holderId),
  );
  const pool = [...(api.state.peopleByPlace.get(town) ?? [])]
    .map((id) => api.state.people.get(id))
    .filter(
      (p): p is PersonState =>
        !!p &&
        p.alive &&
        ageOn(p, date) >= 25 &&
        p.id !== appointer?.personId &&
        !holding.has(p.id) &&
        (!chosenId || p.id === chosenId),
    );
  if (!pool.length) return null;
  const relationships = (api.state as CoreState).relationships;
  const appointment = nominateAndConfirm({
    seatKey: `town:${spec.key}`,
    appointerSide: appointerLean,
    candidates: pool.map((p) => ({
      id: p.id,
      lean: personLean(api.state.people, p, 0),
      qualification: qualification(api, p, spec.key),
      known:
        !!appointer?.personId &&
        relationships.has([appointer.personId, p.id].sort().join(":")),
    })),
    confirmingBody: /council/.test(spec.confirmedBy)
      ? { name: "council", sides: councilSides(api) }
      : null,
    tolerance: campaignParameter("confirmationTolerance"),
  });
  if (!appointment.nomineeId) return null;
  const row: AppointmentRow = {
    id: `appointment:town:${spec.key}`,
    government: town,
    post: spec.key,
    title: spec.title,
    holderId: appointment.nomineeId,
    identity: null,
    appointedBy: appointer ? memberKey(appointer) : spec.appointedBy,
    confirmation: appointment.confirmation,
    reasons: appointment.reasons.slice(0, 5),
    since: date,
  };
  table(api, "appointments").put(row as unknown as ModuleRow);
  api.emit({
    id: `appointed:${row.id}:${date}`,
    date,
    kind: "official-appointed",
    personIds: [row.holderId],
    placeId: town,
    source: { tag: "SOURCED", citation: `Appointment ${row.id}`, asOf: date },
    publicRecord: true,
    news: true,
    facts: { post: spec.key, appointedBy: row.appointedBy },
  });
  // On the town government's payroll at a department head's pay.
  const govs = api.state.modules.has(BUDGETS_MODULE_ID) ? governments(api) : [];
  const employer = (
    govs.find((g) => g.level === "city") ??
    govs.find((g) => g.level === "county")
  )?.organizationId;
  const paid = employer
    ? startPublicJob(api, {
        personId: row.holderId,
        employerId: employer,
        post: `town:${spec.key}`,
        title: spec.title,
        hourlyMinor: campaignParameter("appointeeHourlyMinor"),
        citation: `Appointment ${row.id}`,
      })
    : null;
  // stopgapId: SG-GOV-appointee-pay
  if (!paid) api.stopgap("SG-GOV-appointee-pay");
  return row;
}

function appointTownDepartments(api: CoreAPI): void {
  // An unincorporated place has no town government to staff.
  if (
    !townSeats(api).some(
      (s) =>
        (s.office.kind === "council" || s.office.kind === "mayor") && s.holder,
    )
  )
    return;
  const playerId = (api.state as CoreState).playerId;
  for (const spec of RESEARCH.local.city[townForm(api)] ?? []) {
    // The player's own posts wait for their choice (`appoint`).
    if (townAppointer(api, spec.appointedBy)?.personId === playerId) continue;
    fillTownPost(api, spec);
  }
}

/** The player, as the appointing official, names someone to a town post. */
export function appoint(
  api: CoreAPI,
  input: { readonly post: string; readonly personId: string },
): AppointmentRow | null {
  const spec = (RESEARCH.local.city[townForm(api)] ?? []).find(
    (s) => s.key === input.post,
  );
  if (!spec) throw new Error(`No post ${input.post} in this town's government`);
  return fillTownPost(api, spec, input.personId);
}

/**
 * The state's cabinet: for each post the governor fills, three fictional
 * people who exist for it (drawn from the world's seed), the governor
 * choosing among them, confirmed by the state senate where required.
 */
function appointStateCabinet(api: CoreAPI, worldSeed: string): void {
  const chain = lawChain(api);
  const state = chain.stateKey;
  const posts = RESEARCH.places[state]?.cabinet?.positions ?? [];
  const governor = townSeats(api).find(
    (s) => s.office.kind === "governor" && s.holder,
  )?.holder;
  if (!governor) return;
  const side = partySide(governor.party);
  const senate = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .query("byJurisdiction", [state]) as unknown as {
      id: string;
      kind: string;
    }[]
  ).find(
    (o) =>
      o.kind === "legislature-upper" || o.kind === "legislature-unicameral",
  );
  const senateSides = senate
    ? members(api, senate.id).map((t) => partySide(t.party))
    : [];
  const date = api.state.date;
  for (const spec of posts) {
    if (!/governor/.test(spec.appointedBy)) continue;
    const pool = [0, 1, 2].map((n) => {
      const identity = drawOfficialIdentity({
        worldSeed,
        seatKey: `cabinet:${state}:${spec.key}:${n}`,
        stateUsps: state.slice(3),
        role: "executive-officeholder-at-opening",
        referenceDate: date,
      });
      return { n, identity };
    });
    const appointment = nominateAndConfirm({
      seatKey: `cabinet:${state}:${spec.key}`,
      appointerSide: side,
      candidates: pool.map(({ n }) => ({
        id: `official:cabinet:${state}:${spec.key}:${n}`,
        // Candidates for a governor's cabinet come from the governor's side;
        // how far each sits from it is who they are.
        lean: side * campaignParameter("identityLeanScale") * (1 - n * 0.25),
        qualification: 0.6 + 0.1 * (2 - n),
        known: n === 0,
      })),
      confirmingBody: /senate|legislature/.test(spec.confirmedBy)
        ? { name: "state senate", sides: senateSides }
        : null,
      tolerance: campaignParameter("confirmationTolerance"),
    });
    if (!appointment.nomineeId) continue;
    const chosen = pool[Number(appointment.nomineeId.split(":").pop())]!;
    table(api, "appointments").put({
      id: `appointment:${state}:${spec.key}`,
      government: state,
      post: spec.key,
      title: spec.title,
      holderId: appointment.nomineeId,
      identity: {
        givenName: chosen.identity.givenName,
        familyName: chosen.identity.familyName,
      },
      appointedBy: memberKey(governor),
      confirmation: appointment.confirmation,
      reasons: appointment.reasons,
      since: date,
    } as unknown as ModuleRow);
  }
}

export function appointmentsIn(
  api: CoreAPI,
  government: string,
): readonly AppointmentRow[] {
  if (!api.state.modules.has(EXECUTIVE_MODULE_ID)) return [];
  return (
    table(api, "appointments").query("byGovernment", [
      government,
    ]) as unknown as AppointmentRow[]
  )
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** The orders this executive may issue that an engine can carry. */
export function orderableBy(api: CoreAPI): readonly string[] {
  const state = lawChain(api).stateKey;
  const raw = RESEARCH.places[state]?.canOrder ?? [];
  const keys = Array.isArray(raw) ? raw.map((r) => r.key) : Object.keys(raw);
  return keys.filter((k) => k in ORDERABLE).sort();
}

/**
 * Issue an executive order (the governor, from the state's own powers): a
 * law row in force from tomorrow that reaches people like a statute, and
 * that the next executive can revoke (`revoke: true`).
 */
export function issueOrder(
  api: CoreAPI,
  input: {
    readonly executiveId: string;
    readonly order: string;
    readonly revoke?: boolean;
  },
): { readonly lawId: string } {
  if (!orderableBy(api).includes(input.order))
    throw new Error(`This office can't order ${input.order} here.`);
  const state = lawChain(api).stateKey;
  const tomorrow = new Date(
    Date.parse(`${api.state.date}T00:00:00Z`) + 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  const measureId = `order:${state}:${input.order}:${api.state.date}`;
  // stopgapId: SG-GOV-executive-powers-research
  api.stopgap("SG-GOV-executive-powers-research");
  const row = enactLaw(api, {
    jurisdiction: state,
    level: "state",
    series: ORDERABLE[input.order]!,
    value: input.revoke ? 0 : 1,
    effectiveDate: tomorrow,
    measureId,
    citation: `Executive order ${measureId} by ${input.executiveId}`,
    terms: { executiveOrder: true, issuedBy: input.executiveId },
  });
  table(api, "orders").put({
    id: measureId,
    executiveId: input.executiveId,
    order: input.order,
    revoke: input.revoke ?? false,
    lawId: row.id,
    date: api.state.date,
  } as unknown as ModuleRow);
  return { lawId: row.id };
}
