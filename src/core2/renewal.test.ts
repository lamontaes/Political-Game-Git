/** Unplanned pregnancies and the decision, read in a drawn place's played world. */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { ABORTION_LAW_SERIES, decideUnplanned } from "./births-unplanned";
import type { BirthCouple } from "./births-plan";
import { lawInForce } from "./modules/laws";
import { coreAPI, fillInPerson } from "./state";
import providerDistance from "../../data/research/people/abortion-provider-distance.json" with { type: "json" };

const PLACES = 4;
/** The tier the moves engine gives a person who left town. */
const INACTIVE_TIER = "husk";
/**
 * A natural unplanned pregnancy in the named tier is rare: named people are
 * few and mostly past the age curve's center, and they are reviewed every 91
 * days. Drawn years gave one in about four to five places (Leeds, Utah;
 * Kootenai, Idaho; none in Sumatra FL, Pleasant Garden NC, Billings MT and
 * Faga'alu AS), so the ordinary case draws up to twelve.
 */
const ORDINARY_PLACES = 12;
const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

interface Decision {
  continues: boolean;
  restricted: boolean;
  lawId: string | null;
  miles: number;
  scores: { continue: number; end: number };
  travelMinor: number;
  cashMinor: number;
}

/** The miles recorded for her state, before a restriction and now. */
function milesFor(state: string) {
  return (
    providerDistance.places as unknown as Record<
      string,
      { milesBefore: { miles: number }; milesNow: { miles: number } }
    >
  )[state]!;
}

/** The decision kept on a plan read the law in force and her state's miles, and reading it again gives the same. */
function expectDistance(
  api: ReturnType<typeof coreAPI>,
  plan: Record<string, unknown>,
  decision: Decision,
  state: string,
  where: string,
) {
  const law = lawInForce(api, ABORTION_LAW_SERIES, String(plan.date));
  expect(decision.restricted, where).toBe((law.value ?? 0) > 0);
  const miles = milesFor(state);
  expect(decision.miles, where).toBe(
    decision.restricted ? miles.milesNow.miles : miles.milesBefore.miles,
  );
  const couple = api
    .moduleState(RENEWAL_MODULE_ID)
    .table("couples")
    .get(String(plan.coupleId));
  expect(couple, where).toBeDefined();
  const again = decideUnplanned(
    api,
    couple as unknown as BirthCouple,
    String(plan.date),
  );
  expect(again.lawId, where).toBe(decision.lawId);
  expect(again.miles, where).toBe(decision.miles);
}

it(
  "an unplanned pregnancy is decided from her records and the law in force where she lives",
  () => {
    const tried: string[] = [];
    for (let n = 0; n < ORDINARY_PLACES; n += 1) {
      const draw = drawPlace(
        createHash("sha256").update(`${base}:${n}`).digest("hex"),
        "unplanned-pregnancy",
      );
      setBookkeeping(false);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const label = `${draw.name}, ${draw.state} (${draw.key}), seed ${draw.seed}`;
      // A played year through the ordinary producers: no fixture fills anything in.
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      const renewal = api.moduleState(RENEWAL_MODULE_ID);
      const plans = renewal
        .table("plans")
        .rows()
        .filter((row) => row.unplanned === true);
      const couples = renewal
        .table("couples")
        .rows()
        .filter((c) => c.status === "active");
      tried.push(
        `${label}: ${plans.length} unplanned plans, ${couples.length} active couples`,
      );
      // Nothing unplanned ever happens in the player's own household.
      const playerHome = core.people.get(core.playerId!)?.householdId;
      for (const plan of plans)
        expect(
          core.people.get(String(plan.motherId))?.householdId,
          `${label} ${plan.id}`,
        ).not.toBe(playerHome);
      if (!plans.length || !couples.length) continue;
      // Every unplanned plan cites the law record in force on its date, and
      // carries or ends by her own scores; an ended one pays her trip.
      let ended = 0;
      for (const plan of plans) {
        expect(plan.lawId, `${label} ${plan.id}`).toBe(
          lawInForce(api, ABORTION_LAW_SERIES, String(plan.date)).governing
            ?.id ?? null,
        );
        const decision = (plan.decisions as unknown as Decision[])[0]!;
        expect(decision.continues, `${label} ${plan.id}`).toBe(
          decision.scores.continue >= decision.scores.end,
        );
        // The trip is the miles recorded for her state, before or after a restriction.
        expectDistance(api, plan, decision, draw.state, `${label} ${plan.id}`);
        const pregnancy = renewal
          .table("pregnancies")
          .get(`${plan.id}:pregnancy`);
        expect(pregnancy, `${label} ${plan.id}`).toBeDefined();
        // Carried, it is a pregnancy or a birth; ended, it is ended.
        if (decision.continues)
          expect(["pregnant", "delivered"], `${label} ${plan.id}`).toContain(
            pregnancy!.status,
          );
        else expect(pregnancy!.status, `${label} ${plan.id}`).toBe("ended");
        if (pregnancy!.status !== "ended") continue;
        ended += 1;
        expect(
          Number(pregnancy!.paidMinor),
          `${label} ${plan.id}`,
        ).toBeLessThanOrEqual(decision.travelMinor);
        // Paid from the household's cash that day: the whole trip when it had
        // the cash, what it had when it did not.
        expect(
          Number(pregnancy!.paidMinor),
          `${label} ${plan.id}: the trip is paid from ${decision.cashMinor} on hand`,
        ).toBeGreaterThanOrEqual(
          Math.min(decision.travelMinor, Math.max(0, decision.cashMinor)),
        );
      }
      // The decision reads the law: an active couple weighs the trip the law in force sets.
      const law = lawInForce(api, ABORTION_LAW_SERIES);
      const decision = decideUnplanned(
        api,
        couples[0] as unknown as BirthCouple,
      );
      expect(decision.restricted, label).toBe((law.value ?? 0) > 0);
      expect(decision.lawId, label).toBe(law.governing?.id ?? null);
      expect(decision.miles, label).toBe(
        decision.restricted
          ? milesFor(draw.state).milesNow.miles
          : milesFor(draw.state).milesBefore.miles,
      );
      const plan = plans[0]!;
      const first = (plan.decisions as unknown as Decision[])[0]!;
      const pregnancy = renewal
        .table("pregnancies")
        .get(`${plan.id}:pregnancy`)!;
      process.stdout.write(
        `UNPLANNED ${label}: ${plans.length} unplanned plans (${ended} ended); ${plan.motherId}'s ${plan.id} on ${String(plan.date)}, ${first.continues ? "carried" : "ended"} (continue ${first.scores.continue.toFixed(3)}, end ${first.scores.end.toFixed(3)}), law ${String(plan.lawId)}, ${first.miles} miles, ${pregnancy.id} ${String(pregnancy.status)}${pregnancy.status === "ended" ? ` paid ${String(pregnancy.paidMinor)} of ${first.travelMinor}` : ""}\n`,
      );
      return;
    }
    throw new Error(
      `no drawn place had an unplanned pregnancy and an active couple in ${ORDINARY_PLACES} places (base ${base}): ${tried.join("; ")}`,
    );
    // Four drawn years took 813 seconds on a 4-core container (about 200 a
    // year, up to 5 minutes in a larger town); up to ORDINARY_PLACES of them.
  },
  ORDINARY_PLACES * 300_000,
);

it(
  "an unplanned pregnancy she ends pays her trip from her household's cash, on the journal (named regression)",
  () => {
    const tried: string[] = [];
    for (let n = 0; n < PLACES; n += 1) {
      const draw = drawPlace(
        createHash("sha256").update(`${base}:ended:${n}`).digest("hex"),
        "unplanned-ended",
      );
      setBookkeeping(false);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const label = `${draw.name}, ${draw.state} (${draw.key}), seed ${draw.seed}`;
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      const renewal = api.moduleState(RENEWAL_MODULE_ID);
      const playerHome = core.people.get(core.playerId!)?.householdId;
      // Couples whose own decision, read now, would end a pregnancy at a cost.
      const ending = renewal
        .table("couples")
        .rows()
        .filter(
          (c) =>
            c.status === "active" &&
            core.people.get(String(c.motherId))?.householdId !== playerHome &&
            renewal
              .table("pregnancies")
              .query("byMotherStatus", [c.motherId, "pregnant"]).length === 0,
        )
        .map((c) => ({
          couple: c,
          decision: decideUnplanned(api, c as unknown as BirthCouple),
        }))
        // With the cash for the trip on hand: a household with none pays nothing.
        .filter(
          (x) =>
            !x.decision.continues &&
            x.decision.travelMinor > 0 &&
            x.decision.cashMinor >= x.decision.travelMinor,
        );
      tried.push(`${label}: ${ending.length} couples who would end one`);
      if (!ending.length) continue;
      // Their households are in focus, so the journal keeps their receipts.
      for (const { couple } of ending)
        for (const id of core.households.get(
          core.people.get(String(couple.motherId))!.householdId,
        )?.memberIds ?? [])
          core.focusPersonIds.add(id);
      // An edge fixture beside the ordinary case above: exposure is a carried
      // total, and only these couples are brought to a whole unit, so the next
      // review settles each by her own scores.
      for (const { couple } of ending)
        renewal.table("exposure").put({ id: couple.id, carry: 1 });
      const ids = new Set(ending.map((x) => String(x.couple.id)));
      const endedNow = () =>
        renewal
          .table("pregnancies")
          .rows()
          .find(
            (row) =>
              row.unplanned === true &&
              row.status === "ended" &&
              ids.has(String(row.coupleId)),
          );
      for (let day = 0; day < 100 && !endedNow(); day += 1)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const pregnancy = endedNow();
      if (!pregnancy) {
        tried.push(`${label}: none ended at the review`);
        continue;
      }
      const plan = renewal.table("plans").get(String(pregnancy.planId))!;
      const decision = (plan.decisions as unknown as Decision[])[0]!;
      expect(decision.continues, label).toBe(false);
      expectDistance(api, plan, decision, draw.state, label);
      expect(plan.lawId, label).toBe(
        lawInForce(api, ABORTION_LAW_SERIES, String(plan.date)).governing?.id ??
          null,
      );
      const paid = Number(pregnancy.paidMinor);
      expect(paid, `${label}: ${String(pregnancy.id)} paid`).toBeGreaterThan(0);
      expect(paid, label).toBeLessThanOrEqual(decision.travelMinor);
      // The cash left her household on the journal, in the trip's own entries.
      const household =
        core.households.get(
          core.people.get(String(pregnancy.motherId))!.householdId,
        )?.memberIds ?? [];
      const journal = core.cashJournal;
      let left = 0;
      const receipts: string[] = [];
      for (const id of household)
        for (const entry of journal.detailedByOwner.get(id) ?? []) {
          const receipt = journal.detailedReceipts.get(entry);
          if (
            !receipt?.sourceRef.id.startsWith(`${String(pregnancy.id)}:trip:`)
          )
            continue;
          receipts.push(receipt.sourceRef.id);
          for (const posting of receipt.postings)
            if (posting.accountId === `cash:${id}:residual`)
              left -= posting.deltaMinor;
        }
      expect(left, `${label}: ${receipts.join(", ")}`).toBe(paid);
      process.stdout.write(
        `UNPLANNED ENDED ${label}: ${String(pregnancy.motherId)}'s ${String(pregnancy.id)} on ${String(plan.date)}, ended (continue ${decision.scores.continue.toFixed(3)}, end ${decision.scores.end.toFixed(3)}), law ${String(plan.lawId)}, ${decision.miles} miles, trip ${decision.travelMinor} paid ${paid} in ${[...new Set(receipts)].join(", ")}\n`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a couple who would end an unplanned pregnancy in ${PLACES} places (base ${base}): ${tried.join("; ")}`,
    );
    // One place's opening, month and review took 15 seconds of test time (Kokhanok, Alaska) on a 4-core container.
  },
  PLACES * 300_000,
);

/**
 * An edge fixture: the player's own household is left out: the player plays as the mother of
 * a waiting couple, the couple is brought to a whole unit of exposure, and
 * the review settles it with no plan and leaves the exposure unspent.
 */
it(
  "never puts an unplanned pregnancy in the player's own household",
  () => {
    const tried: string[] = [];
    for (let n = 0; n < PLACES; n++) {
      const draw = drawPlace(
        createHash("sha256").update(`${base}:home:${n}`).digest("hex"),
        `unplanned-player-home:${n}`,
      );
      setBookkeeping(false);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const renewal = api.moduleState(RENEWAL_MODULE_ID);
      const label = `${draw.name} (${draw.key}) seed ${draw.seed}`;
      // Couples are formed at their first review, within the first month.
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      const waiting = renewal
        .table("couples")
        .rows()
        .find(
          (c) =>
            c.status === "active" &&
            core.people.has(String(c.motherId)) &&
            renewal
              .table("pregnancies")
              .query("byMotherStatus", [c.motherId, "pregnant"]).length === 0,
        );
      tried.push(`${label}: ${waiting ? waiting.id : "no waiting couple"}`);
      if (!waiting) continue;
      core.playerId = String(waiting.motherId);
      const playerHome = core.people.get(core.playerId)!.householdId;
      renewal.table("exposure").put({ id: waiting.id, carry: 1 });
      advanceCore(core, addDays(makeIsoDate(core.date), 100));
      const atHome = renewal
        .table("plans")
        .rows()
        .filter(
          (row) =>
            row.unplanned === true &&
            core.people.get(String(row.motherId))?.householdId === playerHome,
        );
      expect(atHome, label).toEqual([]);
      expect(
        Number(renewal.table("exposure").get(waiting.id)?.carry),
        `${label} ${waiting.id} is never reviewed into a pregnancy`,
      ).toBe(1);
      process.stdout.write(
        `player home left out: ${label}; couple ${waiting.id}; player ${core.playerId}\n`,
      );
      return;
    }
    throw new Error(`no waiting couple to play as: ${tried.join("; ")}`);
    // A drawn town built in 4 to 44 seconds and plays 130 days in about a
    // third of a year's 36 to 184 seconds; up to PLACES of them.
  },
  PLACES * 120_000,
);

const COUNTED_UNPLANNED_DAYS = 365;
it(
  "a counted household's unplanned pregnancy is decided by the same rule from its record, and a counted birth follows",
  () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < PLACES; attempt += 1) {
      const draw = drawPlace(
        randomBytes(32).toString("hex"),
        "unplanned-counted-tier",
      );
      tried.push(`${draw.key} seed ${draw.seed}`);
      setBookkeeping(false);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      advanceCore(
        core,
        addDays(makeIsoDate(core.date), COUNTED_UNPLANNED_DAYS),
      );
      const renewal = api.moduleState(RENEWAL_MODULE_ID);
      const rows = renewal.table("countedUnplanned").rows();
      if (!rows.length) continue;
      const miles = (
        providerDistance.places as unknown as Record<
          string,
          { milesBefore: { miles: number }; milesNow: { miles: number } }
        >
      )[draw.state]!;
      for (const found of rows) {
        const label = `${draw.key} seed ${draw.seed} ${found.id}`;
        const scores = found.scores as { continue: number; end: number };
        expect(found.continues, label).toBe(scores.continue >= scores.end);
        expect(found.miles, label).toBe(
          found.restricted ? miles.milesNow.miles : miles.milesBefore.miles,
        );
        expect(found.lawId, label).toBe(
          lawInForce(api, ABORTION_LAW_SERIES, String(found.date)).governing
            ?.id ?? null,
        );
        expect(Number(found.stands), label).toBeGreaterThanOrEqual(1);
        expect(typeof found.cashMinor, label).toBe("number");
        // Her own exposure reached one and was spent on it: what is left is hers, under one.
        expect(
          Number(
            renewal.table("countedExposure").get(String(found.motherId))
              ?.carry ?? 0,
          ),
          label,
        ).toBeLessThan(1);
      }
      const born = rows.find((found) => found.status === "delivered");
      if (!born) continue;
      // Another engine reads it: the counted birth record cites the decision.
      const birth = renewal.table("births").get(`${born.childId}:birth`);
      expect(birth?.unplannedId, String(born.id)).toBe(born.id);
      process.stderr.write(
        `counted unplanned: place ${draw.key} (${draw.state}) seed ${draw.seed} decisions ${rows.length} record ${born.id} birth ${birth?.id} miles ${born.miles}\n`,
      );
      return;
    }
    throw new Error(
      `No counted unplanned birth in any drawn place: ${tried.join("; ")}`,
    );
    // A drawn town's played year took 36 to 184 seconds on a 4-core
    // container (three towns); up to PLACES of them.
  },
  PLACES * 300_000,
);

it(
  "a counted woman filled in keeps her own exposure and her pregnancy's due date, and the births engine goes on from them",
  () => {
    const tried: string[] = [];
    let carried: string | undefined;
    let delivered: string | undefined;
    for (
      let attempt = 0;
      attempt < PLACES && !(carried && delivered);
      attempt += 1
    ) {
      const draw = drawPlace(
        createHash("sha256").update(`${base}:fill-in:${attempt}`).digest("hex"),
        "unplanned-counted-fill-in",
      );
      const where = `${draw.key} seed ${draw.seed} base ${base}`;
      tried.push(where);
      setBookkeeping(false);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const renewal = api.moduleState(RENEWAL_MODULE_ID);
      const end = addDays(makeIsoDate(core.date), 365);
      while (core.date < end && !(carried && delivered)) {
        advanceCore(core, addDays(makeIsoDate(core.date), 30));
        // A woman part of the way to one: filled in, the full couple carries exactly what she had.
        const exposure = carried
          ? undefined
          : renewal
              .table("countedExposure")
              .rows()
              .filter((row) => Number(row.carry) > 0 && Number(row.carry) < 1)
              .sort((a, b) => String(a.id).localeCompare(String(b.id)))
              .find((row) => {
                const pregnant = renewal
                  .table("countedUnplanned")
                  .query("byMother", [String(row.id)])
                  .some((p) => p.status === "pregnant");
                return !pregnant;
              });
        if (exposure) {
          const id = String(exposure.id);
          const carry = Number(exposure.carry);
          fillInPerson(core, id as never);
          const couple = renewal
            .table("couples")
            .rows()
            .find(
              (row) =>
                row.motherId === id && String(row.id).startsWith("fill-in:"),
            );
          if (couple) {
            expect(couple.status, where).toBe("active");
            expect(
              Number(renewal.table("exposure").get(String(couple.id))?.carry),
              `${where}: ${couple.id} carries ${id}'s exposure`,
            ).toBe(carry);
            expect(
              renewal.table("countedExposure").get(id),
              where,
            ).toBeUndefined();
            // The next review goes on from it: a plan, or exposure grown past what she carried.
            const reviewed = addDays(makeIsoDate(core.date), 120);
            advanceCore(core, reviewed);
            const plan = renewal
              .table("plans")
              .rows()
              .find((row) => row.coupleId === couple.id);
            const after = Number(
              renewal.table("exposure").get(String(couple.id))?.carry,
            );
            expect(
              !!plan || after !== carry,
              `${where}: ${couple.id} reviewed after fill-in (carry ${carry} then ${after})`,
            ).toBe(true);
            carried = `${where}: ${id} carried ${carry.toFixed(4)} into ${couple.id}, then ${plan ? `plan ${String(plan.id)}` : `carry ${after.toFixed(4)}`}`;
          }
        }
        // A counted pregnancy under way: filled in, it is born at its due date as a full birth.
        const pregnant = delivered
          ? undefined
          : renewal
              .table("countedUnplanned")
              .rows()
              .filter(
                (row) =>
                  row.status === "pregnant" && String(row.dueDate) > core.date,
              )
              .sort((a, b) => String(a.id).localeCompare(String(b.id)))[0];
        if (pregnant) {
          const motherId = String(pregnant.motherId);
          fillInPerson(core, motherId as never);
          const row = renewal
            .table("countedUnplanned")
            .get(String(pregnant.id))!;
          if (row.status === "filled-in") {
            const pregnancyId = String(row.pregnancyId);
            const full = renewal.table("pregnancies").get(pregnancyId)!;
            expect(full.dueDate, `${where}: ${pregnancyId}`).toBe(
              pregnant.dueDate,
            );
            expect(full.status, where).toBe("pregnant");
            advanceCore(
              core,
              addDays(makeIsoDate(String(pregnant.dueDate)), 1),
            );
            const after = renewal.table("pregnancies").get(pregnancyId)!;
            expect(
              after.status,
              `${where}: ${pregnancyId} at its due date`,
            ).not.toBe("pregnant");
            // The births engine ran it on its due date: born in town, or
            // where she now lives when she moved away (its own rule).
            const birth = renewal
              .table("births")
              .rows()
              .find((b) => b.pregnancyId === pregnancyId);
            const mother = core.people.get(motherId as never);
            expect(
              after.status === "delivered"
                ? !!birth
                : after.status === "moved-away" &&
                    mother?.tier === INACTIVE_TIER,
              `${where}: ${pregnancyId} at its due date (pregnancy ${String(after.status)}, due ${String(full.dueDate)}, now ${core.date}, birth ${String(birth?.id)})`,
            ).toBe(true);
            delivered = `${where}: ${pregnant.id} due ${String(pregnant.dueDate)} filled in as ${pregnancyId}, ${String(after.status)}, ${birth ? `birth ${String(birth.id)} on ${String(birth.date)}` : "she had moved away"}`;
          }
        }
      }
    }
    process.stdout.write(
      `COUNTED FILL-IN ${carried ?? "no exposure case"}; ${delivered ?? "no pregnancy case"}\n`,
    );
    expect(
      carried,
      `no counted woman part of the way to one: ${tried.join("; ")}`,
    ).toBeDefined();
    expect(
      delivered,
      `no counted pregnancy under way: ${tried.join("; ")}`,
    ).toBeDefined();
  },
  PLACES * 300_000,
);
