import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createScenarioWorld } from "../demo";
import { createWorld } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import { governmentUnitsForPlace } from "../government-units";
import {
  ensureLocalGovernmentSeatsForUnit,
  sittingLocalOfficers,
} from "../living-world/local-government-seats";
import { townCouncilProfilePack } from "../town-council-profile";
import { createFormationContext, recordPrinciples } from "../politics";
import { personName } from "../people";
import { requireLifePlace, stateJurisdictionForKey } from "../life-places";
import {
  DC_GOVERNMENT_KEY,
  ensureDistrictOfColumbiaCouncilOpening,
} from "../nationwide-world/district-of-columbia-council-opening";
import {
  municipalGovernmentJurisdictionId,
  municipalMeasures,
  municipalSeats,
  municipalMeasureKey,
} from "../municipal-public-work";
import { mayAnswerQuestion } from "./question-authority";
import { ensureCouncilPrinciples } from "./council-lawmaking";
import { fileMemberAgendaBills } from "./member-agenda";
import { principledLeaning } from "./officeholder-principles";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "../municipal-government";
import { deserializeWorld, serializeWorld } from "../serialization";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "../future-transitions";
import { addDays } from "../dates";
import { placeMeasureOnCalendar, takeFloorVote } from "../legislation";
import type { World } from "../types";

function fixture() {
  const place = requireLifePlace("1150000");
  const base = createScenarioWorld("dc-numbering-caller", place.context, {
    peopleCount: 16,
  });
  let world = ensureDistrictOfColumbiaCouncilOpening(
    createWorld({
      seed: base.seed,
      currentDate: base.currentDate,
      currentMoment: base.currentMoment,
      jurisdictions: base.jurisdictionOrder.map(
        (id) => base.jurisdictions[id]!,
      ),
      people: base.personOrder.map((id) => base.people[id]!),
      policyCatalog: createProductionPolicyCatalog(),
    }),
  );
  const members = municipalSeats(world, DC_GOVERNMENT_KEY).filter(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
  world = ensureCouncilPrinciples(world, members);
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    DC_GOVERNMENT_KEY,
  )!;
  return { world, members, jurisdictionId };
}

let opened: ReturnType<typeof fixture>;
beforeAll(() => {
  opened = fixture();
});
function file(world: World) {
  const rules = municipalRulePackFor(
    municipalGovernmentByKey(DC_GOVERNMENT_KEY)!,
  );
  if (!rules.ok) throw new Error("Expected actual D.C. pack");
  return fileMemberAgendaBills(world, {
    jurisdictionId: opened.jurisdictionId,
    intakeKey: `a72:${world.currentDate}`,
    chamberKey: "council",
    council: {
      pack: rules.pack,
      members: opened.members,
      questions: world.policyCatalog.propositionOrder.filter((id) =>
        mayAnswerQuestion(world, opened.jurisdictionId, id),
      ),
      measures: municipalMeasures(world, DC_GOVERNMENT_KEY),
      playerPersonId:
        world.control.kind === "person" ? world.control.personId : null,
      measureKey: (numbering) =>
        municipalMeasureKey(DC_GOVERNMENT_KEY, numbering.designation),
    },
  });
}
function selection(world: World) {
  return municipalMeasures(world, DC_GOVERNMENT_KEY).map((measure) => {
    const answer = measure.propositionAnswers![0]!;
    return [
      measure.sponsorPersonId,
      answer.propositionId,
      answer.answer,
      principledLeaning(
        opened.world,
        measure.sponsorPersonId!,
        answer.propositionId,
      ).score,
    ];
  });
}

describe("council filing survivor", () => {
  expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
  it.each(CHIEF_EXECUTIVE_JURISDICTIONS)(
    "preserves seeded selection with an observer in %s",
    (code) => {
      const jurisdiction = stateJurisdictionForKey(`US-${code}`)!;
      const observer = opened.world.personOrder[0]!;
      const world: World = {
        ...opened.world,
        control: { kind: "person", personId: observer },
        jurisdictions: {
          ...opened.world.jurisdictions,
          [jurisdiction.id]: jurisdiction,
        },
        jurisdictionOrder: opened.world.jurisdictionOrder.includes(
          jurisdiction.id,
        )
          ? opened.world.jurisdictionOrder
          : [...opened.world.jurisdictionOrder, jurisdiction.id],
        people: {
          ...opened.world.people,
          [observer]: {
            ...opened.world.people[observer]!,
            homeJurisdictionId: jurisdiction.id,
            establishedFacts: opened.world.people[
              observer
            ]!.establishedFacts.map((fact) =>
              fact.kind === "residence" && fact.endedAt === null
                ? { ...fact, jurisdictionId: jurisdiction.id }
                : fact,
            ),
          },
        },
      };
      const next = file(world);
      // Captured from councilFilings on main37a25100b before its deletion.
      expect(
        createHash("sha256")
          .update(JSON.stringify(selection(next)))
          .digest("hex"),
      ).toBe(
        "a8b648478a8d09df80f693db4886d7b8cf0223a960f151b77a84e10866db7c34",
      );
      for (const measure of municipalMeasures(next, DC_GOVERNMENT_KEY)) {
        expect(
          opened.members.some(
            (seat) => seat.personId === measure.sponsorPersonId,
          ),
        ).toBe(true);
        const motive = next.history.events.find(
          (event) => event.stableKey === `${measure.stableKey}:motive`,
        )!;
        expect(motive.type).toBe("legislation.sponsor-motive");
        const leaning = principledLeaning(
          opened.world,
          measure.sponsorPersonId!,
          measure.propositionIds![0]!,
        );
        expect(leaning.recordIds.length).toBeGreaterThan(0);
        for (const id of leaning.recordIds)
          expect(motive.tags).toContain(`reason:principle-record:${id}`);
      }
      expect(next.control).toEqual(world.control);
    },
  );
  it("records today's council act titles on actual filed bills", () => {
    const next = file(opened.world);
    const rows = municipalMeasures(next, DC_GOVERNMENT_KEY).map((bill) => ({
      question: next.policyCatalog.propositions[bill.propositionIds![0]!]!.name,
      answer: bill.propositionAnswers![0]!.answer,
      title: bill.shortTitle,
      sponsor: personName(next.people[bill.sponsorPersonId!]!),
    }));
    expect(rows).toEqual([
      {
        question: "Fund a behavioral health crisis response",
        answer: "yes",
        title: "Fund a Behavioral Health Crisis Response Act of 2026",
        sponsor: "Rebecca Snyder",
      },
    ]);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("records today's town ordinance titles through the same filer", () => {
    const place = requireLifePlace("0162328");
    const unit = governmentUnitsForPlace(place.sourceGeoid!).find(
      (candidate) =>
        candidate.unitType === "municipality" && candidate.functionalActive,
    )!;
    const base = createScenarioWorld("a76-town-titles", place.context, {
      peopleCount: 8,
    });
    let world = createWorld({
      seed: base.seed,
      currentDate: base.currentDate,
      currentMoment: base.currentMoment,
      jurisdictions: base.jurisdictionOrder.map(
        (id) => base.jurisdictions[id]!,
      ),
      people: base.personOrder.map((id) => base.people[id]!),
      policyCatalog: createProductionPolicyCatalog(),
    });
    world = ensureLocalGovernmentSeatsForUnit(
      world,
      unit,
      place.context.jurisdiction.id,
    );
    const members = sittingLocalOfficers(world, unit).filter(
      (seat) => !seat.mayor,
    );
    expect(members.length).toBeGreaterThan(0);
    world = ensureCouncilPrinciples(world, members);
    const proposition = world.policyCatalog.propositionOrder
      .map((id) => world.policyCatalog.propositions[id]!)
      .find(
        (question) =>
          mayAnswerQuestion(
            world,
            place.context.jurisdiction.id,
            question.id,
          ) &&
          (question.principles ?? []).reduce(
            (sum, bearing) => sum + (bearing.weight ?? 1),
            0,
          ) >= 1,
      )!;
    expect(proposition).toBeDefined();
    const bearings = new Map(
      proposition.principles!.map((bearing) => [
        bearing.principleId,
        bearing.bearing,
      ]),
    );
    world = recordPrinciples(
      world,
      members.flatMap((member) =>
        world.policyCatalog.principleOrder.map((principleId) => ({
          stableKey: `a76:title-view:${member.personId}:${principleId}`,
          personId: member.personId,
          principleId,
          formedAt: world.currentDate,
          stance: bearings.has(principleId)
            ? bearings.get(principleId) === "against"
              ? ("rejects" as const)
              : ("endorses" as const)
            : ("conflicted" as const),
          strength: 1,
          conviction: "settled" as const,
          flexibility: "firm" as const,
          qualification: null,
          formation: createFormationContext("experience:life", {
            note: "Controlled saved council views exercise the existing filing title writer.",
          }),
          supersedesPrincipleRecordId:
            world.history.principles
              .filter(
                (record) =>
                  record.personId === member.personId &&
                  record.principleId === principleId,
              )
              .at(-1)?.id ?? null,
        })),
      ),
    );
    const pack = townCouncilProfilePack(unit)!;
    const input = {
      jurisdictionId: place.context.jurisdiction.id,
      intakeKey: "a76:town-titles",
      chamberKey: "council",
      council: {
        pack,
        members,
        questions: world.policyCatalog.propositionOrder.filter((id) =>
          mayAnswerQuestion(world, place.context.jurisdiction.id, id),
        ),
        measures: [],
        playerPersonId: null,
        measureKey: (numbering: { designation: string }) =>
          `a76:town:${numbering.designation}`,
      },
    };
    const next = fileMemberAgendaBills(world, input);
    const bills = next.history.legislativeMeasures ?? [];
    const rows = bills.map((bill) => ({
      question: next.policyCatalog.propositions[bill.propositionIds![0]!]!.name,
      answer: bill.propositionAnswers![0]!.answer,
      title: bill.shortTitle,
      sponsor: personName(next.people[bill.sponsorPersonId!]!),
    }));
    expect(rows).toEqual([
      {
        question: "Limit council terms",
        answer: "yes",
        title: "Limit Council Terms Ordinance",
        sponsor: "Rachel Thompson",
      },
      {
        question: "Independent ward commission",
        answer: "yes",
        title: "Independent Ward Commission Ordinance",
        sponsor: "Joseph McGee",
      },
    ]);
    expect(rows.length).toBeGreaterThan(0);
    for (const bill of bills)
      expect(
        members.some((member) => member.personId === bill.sponsorPersonId),
      ).toBe(true);
    const continued = deserializeWorld(serializeWorld(next));
    expect(continued).toEqual(next);
    expect(
      fileMemberAgendaBills(continued, {
        ...input,
        council: { ...input.council, measures: bills },
      }),
    ).toEqual(next);
  });
  it("preserves bills and refuses duplicate questions through canonical Save/Continue", () => {
    const next = file(opened.world);
    const reloaded = deserializeWorld(serializeWorld(next));
    expect(reloaded).toEqual(next);
    const uninterrupted = file(next);
    const continued = file(reloaded);
    expect(continued).toEqual(uninterrupted);
    const prior = municipalMeasures(next, DC_GOVERNMENT_KEY);
    const repeated = municipalMeasures(continued, DC_GOVERNMENT_KEY);
    expect(repeated.slice(0, prior.length)).toEqual(prior);
    expect(
      new Set(repeated.map((measure) => measure.propositionIds![0]!)).size,
    ).toBe(repeated.length);
  });
  it("does not file for a controlled council member", () => {
    const first = municipalMeasures(file(opened.world), DC_GOVERNMENT_KEY)[0]!;
    const next = file({
      ...opened.world,
      control: { kind: "person", personId: first.sponsorPersonId! },
    });
    expect(
      municipalMeasures(next, DC_GOVERNMENT_KEY).every(
        (measure) => measure.sponsorPersonId !== first.sponsorPersonId,
      ),
    ).toBe(true);
  });
  it("keeps the council's 365-day defeated-question cooldown", () => {
    const filed = file(opened.world);
    const bill = municipalMeasures(filed, DC_GOVERNMENT_KEY)[0]!;
    let defeated = placeMeasureOnCalendar(filed, {
      stableKey: "a72:failed:calendar",
      measureId: bill.id,
      rationale: "Controlled actual council rejection.",
    });
    defeated = takeFloorVote(defeated, {
      stableKey: "a72:failed:vote",
      measureId: bill.id,
      dispositions: opened.members.map((member) => ({
        memberKey: member.participationId,
        personId: member.personId,
        disposition: "nay",
      })),
      provenance: {
        method: "member-decisions",
        note: "Controlled recorded rejection for cooldown boundary.",
        sourceEntityIds: [bill.id],
      },
    });
    // This is an isolated date-boundary fixture, not a simulated year.
    // Cancel unrelated future work through the canonical writer before moving time.
    for (const item of defeated.history.futureDueItems) {
      if (
        futureDueItemStateAt(defeated, item.id, {
          asOfDate: defeated.currentDate,
          historySequenceExclusive: defeated.history.nextSequence,
        })?.status !== "scheduled"
      )
        continue;
      defeated = cancelFutureDueItem(defeated, {
        stableKey: `a72:isolated:${item.id}`,
        dueItemId: item.id,
        effectiveAt: defeated.currentDate,
        reasonKey: "process:fixture-isolated",
        context:
          "Isolated cooldown boundary; no annual background simulation claimed.",
      });
    }
    const count = (world: World) =>
      municipalMeasures(world, DC_GOVERNMENT_KEY).filter((measure) =>
        measure.propositionIds?.includes(bill.propositionIds![0]!),
      ).length;
    expect(
      count(
        file({
          ...defeated,
          currentDate: addDays(defeated.currentDate, 365),
          currentMoment: {
            ...defeated.currentMoment,
            date: addDays(defeated.currentDate, 365),
          },
        }),
      ),
    ).toBe(1);
    expect(
      count(
        file({
          ...defeated,
          currentDate: addDays(defeated.currentDate, 366),
          currentMoment: {
            ...defeated.currentMoment,
            date: addDays(defeated.currentDate, 366),
          },
        }),
      ),
    ).toBe(2);
  });
});
