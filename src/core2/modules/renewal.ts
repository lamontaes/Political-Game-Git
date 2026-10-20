import { renewalParameter } from "../births-parameters";
import { addDays, daysBetween, makeIsoDate } from "../kernel/dates";
import {
  BIRTHS_STOPGAP,
  chooseBirthPlan,
  PLAN_CHILD,
  birthCircumstances,
  forgetBirthConditions,
  type BirthCouple,
} from "../births-plan";
import { buildNewborn } from "../births-people";
import { decideUnplanned, unplannedExposure } from "../births-unplanned";
import { transferCash } from "../world-transfer";
import { applyCountedFlows } from "../births-counted";
import { nextMonthDay } from "../residents";
import type { CoreAPI, CoreModule, Source } from "../types";
import type { ModuleRow } from "../module-data";
import { declareSnapshotCovered, registerSnapshotPart } from "../snapshot";

export const RENEWAL_MODULE_ID = "core2-renewal-v1";
const INACTIVE_TIER = "husk";
const initialized = new WeakSet<object>();
registerSnapshotPart("renewal-initialized", {
  save: (core) => initialized.has(core),
  restore(core, done) {
    if (done === true) initialized.add(core);
    else initialized.delete(core);
    forgetBirthConditions(core);
  },
});
// Plans, pregnancies, births and calendar work already use snapshot-backed
// module records. The remaining lookup caches rebuild from current records.
declareSnapshotCovered(RENEWAL_MODULE_ID);
const source = (api: CoreAPI): Source => ({
  tag: "SOURCED",
  asOf: api.state.date,
  citation:
    "Canonical core2 agreed family plan and dated pregnancy; simulation record, not a surveyed birth.",
});
const table = (api: CoreAPI, name: string) =>
  api.moduleState(RENEWAL_MODULE_ID).table(name);
const couple = (row: ModuleRow) =>
  row as unknown as BirthCouple & { status: string };
const dateAfter = (api: CoreAPI, days: number) =>
  addDays(makeIsoDate(api.state.date), days);

function scheduleReview(api: CoreAPI, row: BirthCouple, date: string): void {
  api.moduleCalendar(RENEWAL_MODULE_ID).schedule({
    key: `${row.id}:review:${date}`,
    date,
    kind: "review",
    source: source(api),
    sourceRecordIds: [row.id],
  });
}

function review(
  api: CoreAPI,
  row: BirthCouple,
  asOf = api.state.date,
  opening = false,
): void {
  const parents = [
    api.state.people.get(row.motherId),
    api.state.people.get(row.otherParentId),
  ];
  // A parent who died or moved away (the inactive tier) ends the couple's
  // plans here.
  if (
    parents.some((person) => !person?.alive || person.tier === INACTIVE_TIER) ||
    parents[0]!.householdId !== parents[1]!.householdId
  ) {
    table(api, "couples").put({
      ...row,
      childIds: [...row.childIds],
      status: "inactive",
    });
    return;
  }
  if (
    table(api, "pregnancies").query("byMotherStatus", [
      row.motherId,
      "pregnant",
    ]).length
  )
    return;
  api.stopgap(BIRTHS_STOPGAP);
  const decisions = [row.motherId, row.otherParentId].map((id) =>
    chooseBirthPlan(api, id, row, asOf),
  );
  const planSource: Source = opening
    ? {
        tag: "ESTIMATED",
        asOf: api.state.date,
        citation:
          "Opening pregnancy reconstructed through both partners' chooser plans.",
        estimatedFrom:
          "Current opening resources, health and temperament; historical ages, partnership and children. SG-M1-opening-pregnancies.",
      }
    : source(api);
  const planId = `${row.id}:plan:${asOf}`;
  const agreed = decisions.every(
    (decision) => decision.selected === PLAN_CHILD.id,
  );
  table(api, "plans").put({
    id: planId,
    coupleId: row.id,
    date: asOf,
    recordedAt: api.state.date,
    opening,
    motherId: row.motherId,
    otherParentId: row.otherParentId,
    agreed,
    decisions: decisions as unknown as ModuleRow["decisions"],
    source: planSource as unknown as ModuleRow["source"],
  });
  if (agreed) {
    const dueDate = addDays(
      makeIsoDate(asOf),
      renewalParameter(api, "renewalGestationDays"),
    );
    const pregnancyId = `${planId}:pregnancy`;
    table(api, "pregnancies").put({
      id: pregnancyId,
      planId,
      coupleId: row.id,
      motherId: row.motherId,
      otherParentId: row.otherParentId,
      conceivedAt: asOf,
      opening,
      dueDate,
      status: "pregnant",
      source: planSource as unknown as ModuleRow["source"],
    });
    api.moduleCalendar(RENEWAL_MODULE_ID).schedule({
      key: `${pregnancyId}:delivery`,
      date: dueDate,
      kind: "delivery",
      source: planSource,
      sourceRecordIds: [pregnancyId],
    });
    api.emit({
      id: `${pregnancyId}:recorded`,
      date: api.state.date,
      kind: "pregnancy-recorded",
      personIds: [row.motherId, row.otherParentId],
      placeId: parents[0]!.placeId,
      source: planSource,
      facts: { pregnancyId, planId, dueDate, conceivedAt: asOf },
    });
  } else if (!opening) {
    conceiveUnplanned(api, row, parents[0]!.placeId);
    scheduleReview(
      api,
      row,
      dateAfter(api, renewalParameter(api, "renewalReviewDays")),
    );
  }
}

/**
 * A couple that chose to wait still carries exposure each review; a whole unit
 * is an unplanned pregnancy, and the mother decides what to do with it from
 * her records, the law in force where she lives and the trip to a provider.
 * The player's own character and household are left out: unplanned pregnancies
 * happen to the people in the background, from their own records and the law
 * where they live, and nothing here is shown to the player.
 */
function conceiveUnplanned(
  api: CoreAPI,
  row: BirthCouple,
  placeId: string,
): void {
  const playerHome = api.state.playerId
    ? api.state.people.get(api.state.playerId)?.householdId
    : undefined;
  if (
    playerHome &&
    api.state.people.get(row.motherId)?.householdId === playerHome
  )
    return;

  const carryRow = table(api, "exposure").get(row.id);
  const carry =
    Number(carryRow?.carry ?? 0) + unplannedExposure(api, row, api.state.date);
  if (carry < renewalParameter(api, "one")) {
    table(api, "exposure").put({ id: row.id, carry });
    return;
  }
  table(api, "exposure").put({
    id: row.id,
    carry: carry - renewalParameter(api, "one"),
  });
  const decision = decideUnplanned(api, row, api.state.date);
  const planId = `${row.id}:unplanned:${api.state.date}`;
  const planSource: Source = {
    tag: "ESTIMATED",
    asOf: api.state.date,
    citation:
      "Unplanned pregnancy from the couple's exposure and the mother's own weighing of it.",
    estimatedFrom:
      "Household cushion and the mother's age curve; the restriction law in force and the trip to a provider from the place's sourced table. SG-PEOPLE-unplanned-pregnancy.",
  };
  table(api, "plans").put({
    id: planId,
    coupleId: row.id,
    date: api.state.date,
    recordedAt: api.state.date,
    opening: false,
    unplanned: true,
    motherId: row.motherId,
    otherParentId: row.otherParentId,
    agreed: decision.continues,
    decisions: [decision] as unknown as ModuleRow["decisions"],
    lawId: decision.lawId,
    source: planSource as unknown as ModuleRow["source"],
  });
  const pregnancyId = `${planId}:pregnancy`;
  const facts = {
    pregnancyId,
    planId,
    unplanned: "true",
    restricted: String(decision.restricted),
    lawId: decision.lawId ?? "none recorded",
    miles: String(decision.miles),
  };
  if (!decision.continues) {
    // The trip is paid from the household's cash, largest balance first, to
    // the place's outside account (the provider is outside the town's books).
    const payee = [...api.state.organizations.values()].find(
      (org) => org.placeId === placeId && org.outsideFlow !== undefined,
    )?.id;
    let paidMinor = 0;
    if (payee)
      for (const personId of [
        ...api.state.households.get(
          api.state.people.get(row.motherId)!.householdId,
        )!.memberIds,
      ]
        .filter((id) => api.state.people.get(id)?.alive)
        .sort(
          (a, b) =>
            api.state.people.get(b)!.liquidMinor -
            api.state.people.get(a)!.liquidMinor,
        )) {
        if (paidMinor >= decision.travelMinor) break;
        paidMinor += transferCash(
          api,
          `${pregnancyId}:trip:${personId}`,
          personId,
          payee,
          decision.travelMinor - paidMinor,
          planSource,
        );
      }
    table(api, "pregnancies").put({
      id: pregnancyId,
      planId,
      coupleId: row.id,
      motherId: row.motherId,
      otherParentId: row.otherParentId,
      conceivedAt: api.state.date,
      opening: false,
      unplanned: true,
      status: "ended",
      paidMinor,
      lawId: decision.lawId,
      source: planSource as unknown as ModuleRow["source"],
    });
    api.emit({
      id: `${pregnancyId}:ended`,
      date: api.state.date,
      kind: "pregnancy-ended",
      personIds: [row.motherId, row.otherParentId],
      placeId,
      source: planSource,
      facts: { ...facts, paidMinor: String(paidMinor) },
    });
    return;
  }
  const dueDate = addDays(
    makeIsoDate(api.state.date),
    renewalParameter(api, "renewalGestationDays"),
  );
  table(api, "pregnancies").put({
    id: pregnancyId,
    planId,
    coupleId: row.id,
    motherId: row.motherId,
    otherParentId: row.otherParentId,
    conceivedAt: api.state.date,
    opening: false,
    unplanned: true,
    dueDate,
    status: "pregnant",
    lawId: decision.lawId,
    source: planSource as unknown as ModuleRow["source"],
  });
  api.moduleCalendar(RENEWAL_MODULE_ID).schedule({
    key: `${pregnancyId}:delivery`,
    date: dueDate,
    kind: "delivery",
    source: planSource,
    sourceRecordIds: [pregnancyId],
  });
  api.emit({
    id: `${pregnancyId}:recorded`,
    date: api.state.date,
    kind: "pregnancy-recorded",
    personIds: [row.motherId, row.otherParentId],
    placeId,
    source: planSource,
    facts: { ...facts, dueDate, conceivedAt: api.state.date },
  });
}

/** The counted population's flows run on the first of each month. */
function scheduleCounted(api: CoreAPI): void {
  const date = nextMonthDay(
    dateAfter(api, api.parameter("one")),
    api.parameter("one"),
  );
  api.moduleCalendar(RENEWAL_MODULE_ID).schedule({
    key: `counted:${date}`,
    date,
    kind: "counted",
    source: source(api),
    sourceRecordIds: [`counted:${date}`],
  });
}

function deliver(api: CoreAPI, pregnancyId: string): void {
  const row = table(api, "pregnancies").get(pregnancyId);
  if (!row || row.status !== "pregnant") return;
  if (row.dueDate !== api.state.date)
    throw new Error("Delivery must occur on its recorded date.");
  const motherId = String(row.motherId),
    otherParentId = String(row.otherParentId);
  const mother = api.state.people.get(motherId)!;
  const father = api.state.people.get(otherParentId)!;
  // A mother who moved away has her baby where she now lives, outside town.
  if (mother.tier === INACTIVE_TIER) {
    table(api, "pregnancies").put({ ...row, status: "moved-away" });
    return;
  }
  if (!mother.alive || mother.householdId !== father.householdId) {
    // SG-M1-births-circumstances: postpartum/relocation medicine is outside this prototype.
    table(api, "pregnancies").put({
      ...row,
      status: "requires-health-or-household-resolution",
    });
    api.state.gaps.add(
      `${pregnancyId}: delivery requires health or household resolution`,
    );
    return;
  }
  const generated = buildNewborn(
    api,
    pregnancyId,
    [motherId, otherParentId],
    source(api),
  );
  const baby = api.addBornPersonV1(
    generated.person,
    [motherId, otherParentId],
    generated.kin,
  );
  table(api, "births").put({
    id: `${baby.id}:birth`,
    childId: baby.id,
    pregnancyId,
    motherId,
    otherParentId,
    date: api.state.date,
    placeId: baby.placeId,
    householdId: baby.householdId,
  });
  table(api, "pregnancies").put({
    ...row,
    status: "delivered",
    childId: baby.id,
  });
  const previous = couple(table(api, "couples").get(String(row.coupleId))!);
  const next = { ...previous, childIds: [...previous.childIds, baby.id] };
  table(api, "couples").put(next as unknown as ModuleRow);
  for (const relation of generated.kin)
    table(api, "kin").put({
      id: `${baby.id}:kin:${relation.otherId}`,
      personId: baby.id,
      otherId: relation.otherId,
      relation: relation.relation,
      date: api.state.date,
    });
  api.emit({
    id: `${baby.id}:birth`,
    date: api.state.date,
    kind: "person-birth",
    personIds: [motherId, otherParentId, baby.id],
    placeId: baby.placeId,
    source: source(api),
    publicRecord: true,
    facts: {
      childId: baby.id,
      motherId,
      otherParentId,
      householdId: baby.householdId,
      pregnancyId,
      planId: String(row.planId),
    },
  });
  scheduleReview(
    api,
    next,
    dateAfter(api, renewalParameter(api, "renewalReviewDays")),
  );
}

/** One opening index build; subsequent reviews read one candidate, never the world/history. */
function initialize(api: CoreAPI): void {
  scheduleCounted(api);
  const children = new Map<string, string[]>();
  for (const link of api.state.familyLinks.values())
    if (link.kind === "parent-child") {
      const ids = children.get(link.personIds[0]) ?? [];
      ids.push(link.personIds[1]);
      children.set(link.personIds[0], ids);
    }
  // stopgapId: SG-TRAITS-partnerships-no-engine (couples come only from the opening; nobody partners or separates in play, so no temperament read decides it)
  for (const link of api.state.familyLinks.values()) {
    if (link.kind !== "partner") continue;
    const people = link.personIds.map((id) => api.state.people.get(id)!);
    const mother = people.find((person) => person.looks?.gender === "female");
    if (
      !mother ||
      people.some((person) => !person.alive) ||
      people[0]!.householdId !== people[1]!.householdId
    )
      continue;
    const other = people.find((person) => person.id !== mother.id)!;
    const partnerFact = mother.pastFacts?.find(
      (fact) =>
        fact.kind === "family:partner" &&
        fact.facts?.otherPersonId === other.id,
    );
    const row: BirthCouple = {
      id: link.id,
      motherId: mother.id,
      otherParentId: other.id,
      startedAt: partnerFact?.date ?? api.state.startedAt,
      childIds: [
        ...new Set([
          ...(children.get(mother.id) ?? []),
          ...(children.get(other.id) ?? []),
        ]),
      ],
    };
    table(api, "couples").put({
      ...row,
      childIds: [...row.childIds],
      status: "active",
    });
    // SG-M1-opening-pregnancies: reconstruct only still-pregnant plans. Opening
    // cash, housing, health and temperament are proxies for this short prehistory.
    const gestation = renewalParameter(api, "renewalGestationDays");
    const cadence = renewalParameter(api, "renewalReviewDays");
    const latestChild = row.childIds
      .map((id) => api.state.people.get(id)!.birthDate)
      .sort()
      .at(-1);
    const anchor = makeIsoDate(
      latestChild && latestChild > row.startedAt ? latestChild : row.startedAt,
    );
    const window = addDays(
      makeIsoDate(api.state.date),
      -gestation + api.parameter("one"),
    );
    const first = Math.max(
      api.parameter("one"),
      Math.ceil(daysBetween(anchor, window) / cadence),
    );
    api.stopgap("SG-M1-opening-pregnancies");
    for (
      let date = addDays(anchor, first * cadence);
      date < api.state.date;
      date = addDays(makeIsoDate(date), cadence)
    ) {
      review(api, row, date, true);
      if (
        table(api, "pregnancies").query("byMotherStatus", [
          row.motherId,
          "pregnant",
        ]).length
      )
        break;
    }
    review(api, row);
  }
}

export const RENEWAL_MODULE: CoreModule = {
  id: RENEWAL_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      couples: {
        indexes: {
          byMother: { fields: ["motherId"] },
          byOtherParent: { fields: ["otherParentId"] },
        },
      },
      plans: {
        indexes: {
          byCouple: { fields: ["coupleId"] },
          byDate: { fields: ["date"] },
        },
      },
      pregnancies: {
        indexes: {
          byMotherStatus: { fields: ["motherId", "status"] },
          byCouple: { fields: ["coupleId"] },
        },
      },
      births: {
        indexes: {
          byPlace: { fields: ["placeId"] },
          byParent: { fields: ["motherId"] },
        },
      },
      /** Exposure a waiting couple has carried toward an unplanned pregnancy. */
      exposure: {},
      countedIllness: {
        indexes: { byPlace: { fields: ["placeId"] } },
      },
      /** One row per place per month: what moved in the counted population. */
      counts: {
        indexes: { byPlace: { fields: ["placeId"] } },
      },
      /** Each place's fractional flows carried to next month. */
      countedCarry: {},
      kin: {
        indexes: {
          byPerson: { fields: ["personId"] },
          byRelative: { fields: ["otherId"] },
        },
      },
    },
  },
  reasonProviders: {
    "renewal-circumstances": (api, actor, offer, binding) => {
      const row = couple(table(api, "couples").get(offer.targetId)!);
      return {
        value:
          binding.arguments?.raising === "true"
            ? Object.values(
                birthCircumstances(
                  api,
                  actor,
                  row,
                  binding.arguments?.asOf ?? api.state.date,
                ),
              ).reduce((sum, value) => sum + value, api.parameter("zero"))
            : renewalParameter(api, "renewalWaitPull"),
        sourceIds: [row.id, actor.id, actor.householdId],
      };
    },
  },
  onDay(api) {
    if (!initialized.has(api.state)) {
      initialized.add(api.state);
      initialize(api);
    }
  },
  onCalendarWork(api, work) {
    const id = work.sourceRecordIds[0]!;
    if (work.kind === "delivery") deliver(api, id);
    else if (work.kind === "counted") {
      applyCountedFlows(api, "countedCarry", "counts", "births");
      scheduleCounted(api);
    } else if (work.kind === "review") {
      const row = table(api, "couples").get(id);
      if (row?.status === "active") review(api, couple(row));
    }
  },
};
