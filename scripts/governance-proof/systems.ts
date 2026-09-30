import { personName } from "../../src/simulation/people";
import { proseDate } from "../../src/presentation/prose-dates";
import { TOWN_RENT_VERSION } from "../../src/simulation/living-world/town-rent";
import type { EnactedLawEffects } from "../../src/simulation/enacted-law-effects";
import type {
  EntityId,
  HistoricalEvent,
  IsoDate,
  ResourceEndpoint,
  World,
} from "../../src/simulation/types";

export type ProofSystem = "evictions" | "laws" | "filing" | "life" | "all";
export interface ProofPeriod {
  readonly from: IsoDate;
  readonly through: IsoDate;
  /** Excludes opening/pre-run records even when they share the opening date. */
  readonly openingSequence: number;
}

/** Structural consumer of Team 3's held, pure case projection. No producer copy. */
export interface EvictionObservation {
  readonly caseId: EntityId;
  readonly leaseFlowId: string;
  readonly filedOn: IsoDate;
  readonly filing: HistoricalEvent;
  readonly lease:
    | {
        readonly state: "observed";
        readonly householdId: EntityId;
        readonly dwellingId: EntityId;
        readonly townId: EntityId;
      }
    | { readonly state: "unavailable"; readonly reason: string };
  readonly resolution:
    | { readonly state: "open" }
    | { readonly state: "resolved"; readonly event: HistoricalEvent };
  readonly publicCourtRecord:
    | { readonly state: "unavailable" }
    | { readonly state: "observed"; readonly eventId: EntityId };
}
export type ReadEvictionObservations = (
  world: World,
  onDate: IsoDate,
) => readonly EvictionObservation[];

function inPeriod(date: IsoDate, sequence: number, period: ProofPeriod) {
  return (
    sequence >= period.openingSequence &&
    date >= period.from &&
    date <= period.through
  );
}

function namedPerson(world: World, id: EntityId) {
  const person = world.people[id];
  return person ? personName(person) : `Unrecorded person (${id})`;
}

function endpoint(
  world: World,
  owner: ResourceEndpoint,
  asOf = world.currentDate,
) {
  if (owner.kind === "person")
    return { ...owner, label: namedPerson(world, owner.personId) };
  if (owner.kind === "household")
    return {
      ...owner,
      label:
        world.history.households.find((h) => h.id === owner.householdId)
          ?.label ?? `Unrecorded household (${owner.householdId})`,
    };
  return {
    ...owner,
    label:
      world.history.organizationProfiles
        .filter(
          (o) =>
            o.organizationId === owner.organizationId && o.effectiveAt <= asOf,
        )
        .sort((a, b) => b.sequence - a.sequence)[0]?.name ??
      `Unrecorded organization (${owner.organizationId})`,
  };
}

/** Read canonical occupancy on the outcome day; later housing cannot fill it. */
function destinations(
  world: World,
  people: readonly EntityId[],
  date: IsoDate,
) {
  const households = new Set<EntityId>();
  for (const membership of world.history.householdMemberships) {
    if (!people.includes(membership.personId) || membership.startedAt > date)
      continue;
    const state = world.history.householdMembershipStates
      .filter((s) => s.membershipId === membership.id && s.effectiveAt <= date)
      .sort((a, b) => b.sequence - a.sequence)[0];
    if (state?.status === "resident") households.add(membership.householdId);
  }
  return world.history.dwellingOccupancies.flatMap((occupancy) => {
    if (occupancy.startedAt > date) return [];
    const relevant =
      occupancy.occupant.kind === "person"
        ? people.includes(occupancy.occupant.personId)
        : households.has(occupancy.occupant.householdId);
    if (!relevant) return [];
    const state = world.history.dwellingOccupancyStates
      .filter(
        (s) => s.dwellingOccupancyId === occupancy.id && s.effectiveAt <= date,
      )
      .sort((a, b) => b.sequence - a.sequence)[0];
    if (state?.status !== "active") return [];
    const dwelling = world.history.dwellings.find(
      (d) => d.id === occupancy.dwellingId,
    );
    return [
      {
        occupancyId: occupancy.id,
        dwellingId: occupancy.dwellingId,
        startedAt: occupancy.startedAt,
        kind: state.kind,
        location: dwelling?.locationLabel ?? null,
        jurisdictionId: dwelling?.jurisdictionId ?? null,
      },
    ];
  });
}

/** Repeated filings stay separate; an unresolved case is never an order. */
export function evictionProof(
  world: World,
  period: ProofPeriod,
  readCases?: ReadEvictionObservations,
) {
  const prefix = `${TOWN_RENT_VERSION}:lease:`;
  const observations = readCases
    ? new Map(readCases(world, period.through).map((row) => [row.caseId, row]))
    : null;
  const unresolved = new Map<string, number>();
  const cases: {
    filingId: EntityId;
    leaseFlowId: string;
    filedOn: IsoDate;
    jurisdictionId: EntityId | null;
    filingReason: string;
    people: { id: EntityId; name: string }[];
    landlord: ReturnType<typeof endpoint> | null;
    resolutionId: EntityId | null;
    outcome: string;
    resolvedOn: IsoDate | null;
    reason: string | null;
    immediateDestination: ReturnType<typeof destinations> | null;
    laterDestination: ReturnType<typeof destinations> | null;
    evictedFrom: EntityId | null;
    returnedToEvictedHome: boolean;
    caseProjectionAvailable: boolean;
    publicCourtRecordId: EntityId | null;
    linkedHousingRecords: HistoricalEvent[];
    formerHomeReturns: {
      occupancyId: EntityId;
      stateId: EntityId;
      effectiveAt: IsoDate;
      kind: string;
    }[];
    costs: null;
    costEvidence: string;
  }[] = [];
  const relevant = new Set([
    "housing.eviction-dismissed",
    "housing.eviction-settled",
    "housing.evicted",
    "housing.moved-out-before-hearing",
  ]);
  for (const event of [...world.history.events].sort(
    (a, b) => a.sequence - b.sequence,
  )) {
    if (event.occurredAt > period.through || event.recordedAt > period.through)
      continue;
    const tag = event.tags.find((t) => t.startsWith(prefix));
    if (!tag) continue;
    const flowId = tag.slice(prefix.length);
    if (event.type === "housing.eviction-filed") {
      const flow = world.history.resourceFlows.find((f) => f.id === flowId);
      const basis = flow?.basisReference;
      const tenure =
        basis?.kind === "housing"
          ? world.history.housingTenures.find(
              (t) => t.id === basis.housingTenureId,
            )
          : null;
      const people = event.participants.map((p) => ({
        id: p.personId,
        name: namedPerson(world, p.personId),
      }));
      const observation = observations?.get(event.id);
      unresolved.set(flowId, cases.length);
      cases.push({
        filingId: event.id,
        leaseFlowId: flowId,
        filedOn: event.occurredAt,
        jurisdictionId: event.jurisdictionId,
        filingReason: event.summary,
        people,
        landlord: flow
          ? endpoint(world, flow.recipient, event.occurredAt)
          : null,
        resolutionId: null,
        outcome: "open",
        resolvedOn: null,
        reason: null,
        immediateDestination: null,
        laterDestination: null,
        evictedFrom:
          observation?.lease.state === "observed"
            ? observation.lease.dwellingId
            : (tenure?.dwellingId ?? null),
        returnedToEvictedHome: false,
        caseProjectionAvailable: observations !== null,
        publicCourtRecordId:
          observation?.publicCourtRecord.state === "observed"
            ? observation.publicCourtRecord.eventId
            : null,
        linkedHousingRecords: [],
        formerHomeReturns: [],
        costs: null,
        costEvidence:
          "No linked court or moving-cost transaction contract in the inspected rent records. Unpaid rent in the reason is debt, not case cost.",
      });
    } else if (relevant.has(event.type)) {
      const index = unresolved.get(flowId);
      if (index === undefined) continue;
      const row = cases[index]!;
      row.resolutionId = event.id;
      row.outcome = event.type;
      row.resolvedOn = event.occurredAt;
      row.reason = event.summary;
      const people = row.people.map((p) => p.id);
      row.immediateDestination = destinations(world, people, event.occurredAt);
      const immediateIds = new Set(
        row.immediateDestination.map((d) => d.occupancyId),
      );
      // Find a dated later housing record, rather than using the final home
      // as though it existed on eviction day.
      const laterDates = [
        ...new Set(
          [
            ...world.history.dwellingOccupancies,
            ...world.history.householdMemberships,
          ]
            .filter(
              (o) =>
                o.startedAt > event.occurredAt && o.startedAt <= period.through,
            )
            .map((o) => o.startedAt),
        ),
      ].sort();
      row.laterDestination =
        laterDates
          .map((d) => destinations(world, people, d))
          .map((rows) => rows.filter((d) => !immediateIds.has(d.occupancyId)))
          .find((d) => d.length) ?? null;
      row.returnedToEvictedHome =
        event.type === "housing.evicted" &&
        row.evictedFrom !== null &&
        [...row.immediateDestination, ...(row.laterDestination ?? [])].some(
          (d) => d.dwellingId === row.evictedFrom,
        );
      unresolved.delete(flowId);
    }
  }
  for (const row of cases) {
    if (
      row.outcome !== "housing.evicted" ||
      !row.resolutionId ||
      !row.resolvedOn
    )
      continue;
    const order = world.history.events.find(
      (event) => event.id === row.resolutionId,
    )!;
    row.linkedHousingRecords = world.history.events.filter(
      (event) =>
        event.occurredAt >= row.resolvedOn! &&
        event.occurredAt <= period.through &&
        event.recordedAt <= period.through &&
        event.tags.includes(`eviction:order:${row.resolutionId}`) &&
        [
          "housing.eviction-host-answer",
          "housing.eviction-host-move-unresolved",
          "housing.eviction-destination",
        ].includes(event.type),
    );
    const observation = observations?.get(row.filingId);
    const householdId =
      observation?.lease.state === "observed"
        ? observation.lease.householdId
        : (row.linkedHousingRecords.find(
            (event) => event.type === "housing.eviction-destination",
          )?.involvedEntityIds[0] ?? null);
    const people = new Set(row.people.map((person) => person.id));
    const formerOccupancies = new Set(
      world.history.dwellingOccupancies
        .filter(
          (occupancy) =>
            occupancy.dwellingId === row.evictedFrom &&
            occupancy.startedAt <= period.through &&
            (occupancy.occupant.kind === "person"
              ? people.has(occupancy.occupant.personId)
              : occupancy.occupant.kind === "household" &&
                householdId !== null &&
                occupancy.occupant.householdId === householdId),
        )
        .map((occupancy) => occupancy.id),
    );
    row.formerHomeReturns = world.history.dwellingOccupancyStates
      .filter(
        (state) =>
          formerOccupancies.has(state.dwellingOccupancyId) &&
          state.status === "active" &&
          state.residenceRole === "primary" &&
          state.effectiveAt <= period.through &&
          (state.effectiveAt > row.resolvedOn! ||
            (state.effectiveAt === row.resolvedOn &&
              state.sequence > order.sequence)),
      )
      .map((state) => ({
        occupancyId: state.dwellingOccupancyId,
        stateId: state.id,
        effectiveAt: state.effectiveAt,
        kind: state.kind,
      }));
    row.returnedToEvictedHome ||= row.formerHomeReturns.length > 0;
  }
  return cases.filter(
    (row) =>
      inPeriod(
        row.filedOn,
        world.history.events.find((e) => e.id === row.filingId)!.sequence,
        period,
      ) ||
      (row.resolutionId !== null &&
        inPeriod(
          row.resolvedOn!,
          world.history.events.find((e) => e.id === row.resolutionId)!.sequence,
          period,
        )),
  );
}

/** Saved reasons only: current principles cannot rewrite an earlier motive. */
export function filingProof(world: World, period: ProofPeriod) {
  return (world.history.legislativeMeasures ?? [])
    .filter((m) => inPeriod(m.introducedAt, m.sequence, period))
    .map((measure) => {
      const motives = world.history.events.filter(
        (e) =>
          e.type === "legislation.sponsor-motive" &&
          e.involvedEntityIds.includes(measure.id) &&
          e.occurredAt <= period.through,
      );
      const provisions = (world.history.legislativeProvisions ?? []).filter(
        (p) =>
          p.measureId === measure.id &&
          p.supersedesProvisionId === null &&
          p.recordedAt <= period.through,
      );
      return {
        measureId: measure.id,
        designation: measure.designation,
        title: measure.shortTitle,
        introducedAt: measure.introducedAt,
        jurisdictionId: measure.jurisdictionId,
        sponsorId: measure.sponsorPersonId,
        sponsor: measure.sponsorPersonId
          ? namedPerson(world, measure.sponsorPersonId)
          : null,
        savedReasons: motives.map((e) => ({ id: e.id, reason: e.summary })),
        filedTextEvidence: provisions.map((p) => ({
          id: p.id,
          heading: p.heading,
          text: p.text,
        })),
        compilationEvidence: (world.history.legislativeDraftLineages ?? [])
          .filter(
            (l) => l.measureId === measure.id && l.recordedAt <= period.through,
          )
          .map((l) => ({ id: l.id, provenance: l.provenanceNote })),
        missingReason:
          motives.length === 0
            ? "No separately recorded sponsor-motive event; filed text provenance is evidence of compilation, not a new inferred personal reason."
            : null,
      };
    });
}

/** Each transfer is attributed by exact tax/program lineage, never title. */
export function lawProof(
  world: World,
  period: ProofPeriod,
  readEffects: (world: World) => readonly EnactedLawEffects[],
) {
  const history = world.history;
  const flows = new Map(history.resourceFlows.map((f) => [f.id, f]));
  const outcomes = new Map(
    history.resourceTransferOutcomes.map((o) => [o.id, o]),
  );
  return readEffects(world)
    .filter(
      (law) => law.enactedOn >= period.from && law.enactedOn <= period.through,
    )
    .filter((law) =>
      (history.legislativeEnactments ?? []).some(
        (e) =>
          e.measureId === law.measureId &&
          e.outcome === "enacted" &&
          inPeriod(e.resolvedAt, e.sequence, period),
      ),
    )
    .map((law) => {
      const proposals = new Set(
        (history.taxProposals ?? [])
          .filter((p) => p.measureId === law.measureId)
          .map((p) => p.id),
      );
      const policies = new Set(
        (history.taxPolicies ?? [])
          .filter((p) => proposals.has(p.proposalId))
          .map((p) => p.id),
      );
      const assessments = new Map(
        (history.taxAssessments ?? [])
          .filter((a) => policies.has(a.policyId))
          .map((a) => [a.id, a]),
      );
      const bases = new Map((history.taxBases ?? []).map((b) => [b.id, b]));
      const appropriations = new Set(
        (history.publicProgramRecords ?? [])
          .filter(
            (p) =>
              p.kind === "appropriation" && p.sourceMeasureId === law.measureId,
          )
          .map((p) => p.id),
      );
      const commitments = new Set(
        (history.publicProgramRecords ?? [])
          .filter(
            (p) =>
              p.kind === "commitment" && appropriations.has(p.appropriationId),
          )
          .map((p) => p.id),
      );
      const payments = history.resourceTransferOutcomes
        .filter((o) => {
          const basis = flows.get(o.resourceFlowId)?.basisReference;
          return (
            basis?.kind === "public-program" &&
            commitments.has(basis.commitmentId) &&
            inPeriod(o.occurredAt, o.sequence, period)
          );
        })
        .map((o) => {
          const flow = flows.get(o.resourceFlowId)!;
          return {
            id: o.id,
            date: o.occurredAt,
            status: o.status,
            amount: o.transferredAmount,
            from: endpoint(world, flow.source, o.occurredAt),
            to: endpoint(world, flow.recipient, o.occurredAt),
          };
        });
      const taxes = (history.taxCollections ?? [])
        .filter(
          (c) =>
            assessments.has(c.assessmentId) &&
            inPeriod(c.recordedAt, c.sequence, period),
        )
        .map((c) => {
          const assessment = assessments.get(c.assessmentId)!;
          const base = bases.get(assessment.baseId);
          const outcome = c.resourceOutcomeId
            ? outcomes.get(c.resourceOutcomeId)
            : null;
          const flow = outcome ? flows.get(outcome.resourceFlowId) : null;
          return {
            id: c.id,
            date: c.recordedAt,
            status: c.status,
            amount: c.transferredAmount,
            from: base ? endpoint(world, base.payer, c.recordedAt) : null,
            to: flow ? endpoint(world, flow.recipient, c.recordedAt) : null,
            missingEndpoint: !base || !flow,
          };
        });
      const liabilities = new Map(
        (history.statutoryTaxLiabilities ?? [])
          .filter((l) => l.lawMeasureIds?.includes(law.measureId))
          .map((l) => [l.id, l]),
      );
      const withholding = (history.statutoryTaxPayments ?? [])
        .filter(
          (p) =>
            liabilities.has(p.liabilityId) &&
            inPeriod(p.recordedAt, p.sequence, period),
        )
        .map((p) => {
          const liability = liabilities.get(p.liabilityId)!;
          const flow = flows.get(
            outcomes.get(p.resourceOutcomeId)?.resourceFlowId as EntityId,
          );
          return {
            id: p.id,
            date: p.recordedAt,
            amount: p.amount,
            from: endpoint(world, liability.payer, p.recordedAt),
            to: flow ? endpoint(world, flow.recipient, p.recordedAt) : null,
            jointLawIds: liability.lawMeasureIds,
            attribution:
              "Actual withholding under the recorded laws, not a counterfactual change caused by this law alone.",
          };
        });
      return {
        ...law,
        payments,
        taxes,
        withholding,
        missingMoneyLink:
          payments.length + taxes.length + withholding.length === 0
            ? "No law-linked actual money movement recorded in this period. Authority or a future payment is not money received."
            : null,
      };
    });
}

/** A person's own timeline; household money is attributed only while resident. */
export function lifeProof(
  world: World,
  period: ProofPeriod,
  personId: EntityId,
) {
  const memberships = world.history.householdMemberships.filter(
    (row) => row.personId === personId && row.startedAt <= period.through,
  );
  const states = new Map<
    EntityId,
    typeof world.history.householdMembershipStates
  >();
  for (const row of world.history.householdMembershipStates) {
    const previous = states.get(row.membershipId) ?? [];
    states.set(row.membershipId, [...previous, row]);
  }
  const belongs = (owner: ResourceEndpoint, on: IsoDate, sequence: number) => {
    if (owner.kind === "person") return owner.personId === personId;
    if (owner.kind !== "household") return false;
    return memberships.some((row) => {
      if (
        row.householdId !== owner.householdId ||
        row.startedAt > on ||
        row.sequence > sequence
      )
        return false;
      const state = (states.get(row.id) ?? [])
        .filter((s) => s.effectiveAt <= on && s.sequence <= sequence)
        .sort((a, b) => b.sequence - a.sequence)[0];
      return state?.status === "resident";
    });
  };
  const flows = new Map(
    world.history.resourceFlows.map((row) => [row.id, row]),
  );
  const transfers = world.history.resourceTransferOutcomes
    .flatMap((row) => {
      if (!inPeriod(row.occurredAt, row.sequence, period)) return [];
      const flow = flows.get(row.resourceFlowId);
      if (
        !flow ||
        flow.recordedAt > row.occurredAt ||
        flow.startsAt > row.occurredAt
      )
        return [];
      const paidBy = belongs(flow.source, row.occurredAt, row.sequence);
      const receivedBy = belongs(flow.recipient, row.occurredAt, row.sequence);
      if (!paidBy && !receivedBy) return [];
      return [
        {
          id: row.id,
          date: row.occurredAt,
          status: row.status,
          attemptedAmount: row.attemptedAmount,
          transferredAmount: row.transferredAmount,
          reason: row.reasonKind,
          note: row.note,
          paidBy,
          receivedBy,
          from: endpoint(world, flow.source, row.occurredAt),
          to: endpoint(world, flow.recipient, row.occurredAt),
          basis: flow.basisReference,
        },
      ];
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const events = world.history.events
    .filter(
      (row) =>
        inPeriod(row.occurredAt, row.sequence, period) &&
        row.recordedAt <= period.through &&
        (row.involvedEntityIds.includes(personId) ||
          row.participants.some((p) => p.personId === personId)),
    )
    .sort(
      (a, b) =>
        a.occurredAt.localeCompare(b.occurredAt) || a.sequence - b.sequence,
    )
    .map((row) => ({
      id: row.id,
      date: row.occurredAt,
      type: row.type,
      summary: row.summary,
      context: row.context,
      tags: row.tags,
    }));
  const months = new Set(
    [...events, ...transfers].map((row) => row.date.slice(0, 7)),
  );
  return {
    personId,
    name: namedPerson(world, personId),
    birthDate: world.people[personId]?.birthDate ?? null,
    openingDestination: destinations(world, [personId], period.from),
    closingDestination: destinations(world, [personId], period.through),
    months: [...months].sort().map((month) => ({
      month,
      events: events.filter((row) => row.date.startsWith(month)),
      transfers: transfers.filter((row) => row.date.startsWith(month)),
    })),
    evidenceLimit:
      "Canonical person events and personal or resident-household transfers only. Missing health, work, motives or moves are not reconstructed. Household money is not personal income.",
  };
}

export function collectSystemProof(
  world: World,
  period: ProofPeriod,
  system: ProofSystem,
  readEffects: (world: World) => readonly EnactedLawEffects[],
  readCases?: ReadEvictionObservations,
  watchedPersonId?: EntityId,
) {
  return {
    period,
    evictions:
      system === "all" || system === "evictions"
        ? evictionProof(world, period, readCases)
        : null,
    laws:
      system === "all" || system === "laws"
        ? lawProof(world, period, readEffects)
        : null,
    filing:
      system === "all" || system === "filing"
        ? filingProof(world, period)
        : null,
    life: watchedPersonId ? lifeProof(world, period, watchedPersonId) : null,
  };
}

export function plainSystemReport(
  proof: ReturnType<typeof collectSystemProof>,
  context: {
    seed: string;
    place: string;
    placeKey: string;
    sourceHead: string;
    collectorHead: string;
    collectorDirty?: boolean;
    sourceDirty: boolean;
    status: string;
    days: number;
    save: unknown;
    problem: string | null;
  },
) {
  const lines = [
    `# Watched ${context.place}: ${context.status}`,
    "",
    `Seed ${context.seed}; place ${context.placeKey}; ${proseDate(proof.period.from)} through ${proseDate(proof.period.through)}; ${context.days} actual Day presses.`,
    "",
    "## 1. Why-chain",
    "",
    "The existing world produced the following records. Saved reasons are quoted; missing reasons, destinations and money links are findings, not reconstructed explanations.",
    "",
    "## 2. Source research",
    "",
    "This is an observation report, not a new causal rate. Eviction research checks require Team 9's place-type breadth evidence and exposed/comparison cohorts; case shares alone do not estimate the causal increase in shelter use or moves.",
    "",
    "## 3. Revisions and breadth",
    "",
    "No simulation changes. The selected place is seeded; each listed law/bill retains its own jurisdiction. One watched place does not establish national calibration.",
    "",
    "## 4. Numbered HELD parts",
    "",
  ];
  const moneyText = (amount: { minorUnits: number; currency: string }) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: amount.currency,
    }).format(amount.minorUnits / 100);
  const placeText = (rows: ReturnType<typeof destinations> | null) =>
    rows?.length
      ? rows
          .map(
            (d) =>
              `${d.location ?? d.dwellingId} (${d.kind}, occupancy ${d.occupancyId}, started ${proseDate(d.startedAt)})`,
          )
          .join("; ")
      : "No active destination occupancy recorded. This does not establish shelter, car, motel or street residence.";
  if (proof.life) {
    lines.push(
      `### Watched life: ${proof.life.name}`,
      "",
      `Person ${proof.life.personId}; born ${proof.life.birthDate ? proseDate(proof.life.birthDate) : "date not recorded"}.`,
      `Opening home: ${placeText(proof.life.openingDestination)}`,
      `Closing home: ${placeText(proof.life.closingDestination)}`,
      proof.life.evidenceLimit,
      "",
    );
    if (proof.life.months.length === 0)
      lines.push(
        "No person events or relevant transfers were recorded during the watched period.",
        "",
      );
    for (const month of proof.life.months) {
      lines.push(
        `**Month beginning ${proseDate(`${month.month}-01` as IsoDate)}**`,
        "",
      );
      for (const row of month.events)
        lines.push(
          `${proseDate(row.date)}: ${row.type}; ${JSON.stringify(row.summary)}; event ${row.id}.`,
          `Saved context: ${JSON.stringify(row.context)}`,
          "",
        );
      for (const row of month.transfers)
        lines.push(
          `${proseDate(row.date)}: ${row.from.label} → ${row.to.label}; ${moneyText(row.transferredAmount)} transferred of ${moneyText(row.attemptedAmount)} attempted; ${row.status}; record ${row.id}.`,
          `Saved reason: ${JSON.stringify({ reason: row.reason, note: row.note, basis: row.basis })}`,
          "",
        );
    }
  }
  if (proof.evictions !== null) {
    lines.push("### 1. Eviction cases", "");
    if (proof.evictions.length === 0)
      lines.push(
        "No eviction filings or resolutions recorded in this period.",
        "",
      );
    for (const row of proof.evictions) {
      lines.push(
        `**${row.people.map((p) => p.name).join(", ") || "Unnamed lease household"}; filed ${proseDate(row.filedOn)}.** ${JSON.stringify(row.filingReason)}`,
        "",
        `Landlord: ${row.landlord?.label ?? "not recorded"}. Filing ${row.filingId}; lease ${row.leaseFlowId}; jurisdiction ${row.jurisdictionId ?? "not recorded"}.`,
        `Outcome: ${row.outcome}${row.resolvedOn ? ` on ${proseDate(row.resolvedOn)}` : " at observation end"}. ${row.reason ? JSON.stringify(row.reason) : "No resolution recorded."}`,
        `Public court record: ${row.publicCourtRecordId ?? (row.caseProjectionAvailable ? "unavailable in the case projection" : "case projection unavailable in this runtime")}.`,
        `Destination on outcome day: ${row.immediateDestination === null ? "Not applicable: unresolved case." : placeText(row.immediateDestination)}`,
        `First later recorded destination: ${placeText(row.laterDestination)}`,
        ...(row.outcome === "housing.evicted"
          ? [
              ...row.linkedHousingRecords.map(
                (event) =>
                  `${proseDate(event.occurredAt)} linked ${event.type}: ${JSON.stringify(event.summary)}; event ${event.id}; tags ${event.tags.join(", ")}.`,
              ),
              ...(row.linkedHousingRecords.length
                ? []
                : [
                    "No linked host-answer or eviction-destination records in this runtime.",
                  ]),
              `Later active returns to the former home through observation end: ${row.formerHomeReturns.length}. This checks the observed interval, not all future years.`,
              ...row.formerHomeReturns.map(
                (state) =>
                  `${proseDate(state.effectiveAt)} return: occupancy ${state.occupancyId}; state ${state.stateId}; ${state.kind}.`,
              ),
            ]
          : []),
        ...(row.returnedToEvictedHome
          ? [
              "Finding: the recorded destination is the home this household was evicted from.",
            ]
          : []),
        `Case/moving cost: not recorded. ${row.costEvidence}`,
        "",
      );
    }
  }
  if (proof.laws !== null) {
    lines.push("### 2. Enacted laws and actual money", "");
    if (proof.laws.length === 0)
      lines.push("No laws enacted in this period.", "");
    for (const law of proof.laws) {
      lines.push(
        `**${law.designation}: ${law.shortTitle}**, enacted ${proseDate(law.enactedOn)} (${law.level}; ${law.measureId}).`,
        "",
      );
      for (const p of law.payments)
        lines.push(
          `Program transfer: ${p.from.label} → ${p.to.label}, ${moneyText(p.amount)} on ${proseDate(p.date)}; ${p.status}; record ${p.id}.`,
        );
      for (const effect of law.operativeEffectOutcomes)
        lines.push(
          `Clause effect: ${effect.provisionKey}, ${effect.effectKind}; ${effect.status}${effect.refusalReason ? `: ${effect.refusalReason}` : ""}; provision ${effect.provisionId}.`,
        );
      for (const t of law.taxes)
        lines.push(
          `Tax collection: ${t.from?.label ?? "payer missing"} → ${t.to?.label ?? "recipient missing"}, ${moneyText(t.amount)} on ${proseDate(t.date)}; ${t.status}; record ${t.id}.`,
        );
      for (const t of law.withholding)
        lines.push(
          `Withholding: ${t.from.label}, ${moneyText(t.amount)} on ${proseDate(t.date)}; record ${t.id}. ${t.attribution} Joint law references: ${t.jointLawIds?.join(", ") ?? "none"}.`,
        );
      if (law.missingMoneyLink) lines.push(law.missingMoneyLink);
      for (const line of law.lines) {
        if (line.kind === "rule-change")
          lines.push(
            `Rule: ${line.officeKey}, ${line.field}; ${line.status} from ${proseDate(line.operativeAt)}; basis ${line.operativeBasis}.`,
          );
        if (line.kind === "program-term")
          lines.push(
            `Program term: ${line.heading}, ${line.change}; last day ${proseDate(line.lastDay)}; ${line.status}; superseded ${line.superseded}.`,
          );
        if (line.kind === "duty")
          lines.push(
            `Duty: ${line.heading}, ${line.coveredLabel}; ${line.status}; comply by ${proseDate(line.complyBy)}; ${line.complied} complied, ${line.complianceUnknown} compliance unknown, ${line.coverageUnknown} coverage unknown.`,
          );
        if (line.kind === "eligibility")
          lines.push(
            `Eligibility: ${line.heading}, ${line.coveredLabel}; ${line.qualifying ?? "unavailable"} qualifying, ${line.unknown} unknown; coverage ${line.coverage}.`,
          );
        if (line.kind === "transit")
          lines.push(
            `Transit funding: ${line.status}${line.reason ? `: ${line.reason}` : ""}; authority ${line.amountMinorUnits === null ? "unavailable" : moneyText({ minorUnits: line.amountMinorUnits, currency: "USD" })}. Authority is not a payment.`,
          );
        if (line.kind === "authorization")
          lines.push(
            `Authorized ceiling: ${moneyText({ minorUnits: line.ceilingMinorUnits, currency: "USD" })}; this is not a transfer.`,
          );
        if (line.kind === "appropriation")
          lines.push(
            `Appropriation: ${moneyText({ minorUnits: line.amountMinorUnits, currency: "USD" })}; available ${proseDate(line.availableFrom)} through ${proseDate(line.availableThrough)}, ${line.status}. Authority is separate from transfers above.`,
          );
        if (line.kind === "not-modeled" || line.kind === "no-operative-text")
          lines.push(
            `Missing effect: ${line.kind}; research ${line.researchQuestionId}.`,
          );
        if (line.kind === "tax" && line.reason)
          lines.push(`Tax activation: ${line.status}; ${line.reason}`);
      }
      lines.push("");
    }
  }
  if (proof.filing !== null) {
    lines.push("### 3. Bill filing and saved sponsor reasons", "");
    if (proof.filing.length === 0)
      lines.push("No bills introduced in this period.", "");
    for (const bill of proof.filing) {
      lines.push(
        `**${bill.designation}: ${bill.title}**, filed ${proseDate(bill.introducedAt)}; sponsor ${bill.sponsor ?? "not recorded"} (${bill.sponsorId ?? "no person ID"}); jurisdiction ${bill.jurisdictionId}; measure ${bill.measureId}.`,
        "",
      );
      for (const reason of bill.savedReasons)
        lines.push(
          `Saved reason (${reason.id}): ${JSON.stringify(reason.reason)}`,
        );
      for (const evidence of bill.compilationEvidence)
        lines.push(
          `Saved compilation evidence (${evidence.id}): ${JSON.stringify(evidence.provenance)}`,
        );
      if (bill.missingReason) lines.push(bill.missingReason);
      lines.push("");
    }
  }
  lines.push(
    "## 5. SIMULATED / RECORDS / WORLD PIECES / CHECKS",
    "",
    "SIMULATED: real observer Day path. RECORDS: canonical case, occupancy, legislative and money history. WORLD PIECES: unrecorded court/moving costs and absent destination capacity remain missing; no shelter/car/motel is inferred from absent occupancy. CHECKS: none-case is retained; blocked money is not a successful payment; debt, authority and commitments are not actual cost or transfer.",
    "",
    "## 6. Random-place proof",
    "",
    `Runtime source ${context.sourceHead}; runtime source dirty: ${context.sourceDirty}; status ${context.status}.`,
    `Collector ${context.collectorHead}; collector dirty: ${context.collectorDirty ?? false}.`,
    `Save/Continue result: ${JSON.stringify(context.save)}.`,
    context.problem
      ? `Run stopped: ${context.problem}. The requested watched period was not completed.`
      : "No recorded run stop.",
    "",
    "## 7. Named worked example",
    "",
    "The named case, law and sponsor records above are the worked examples. When a section has none, no example was generated to fill it. Amounts are saved currency/minor-unit amounts, not estimated losses or unobserved causal effects.",
    "",
  );
  return lines.join("\n");
}
