/**
 * Prints, for every scene type whose setting can reach the "office" setting,
 * where it resolves for a legislator, the governor, a mayor and a county
 * official at one pinned place and seed, and whether the old rule (the job's
 * employer organization) would have named a payroll body.
 * Run: node --import tsx scripts/words/office-rooms-table.ts > table.md
 */
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { OFFICES_MODULE_ID } from "../../src/core2/modules/offices";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { isPayrollOrganization } from "../../src/english/journal-words";
import {
  resolveSetting,
  SITUATION_LIBRARY,
} from "../../src/director/scheduling";
import type { Moment } from "../../src/director/types";

const PLACE = "5669845";
const SEED = "7";
const { core } = buildBenchWorld(SEED, gameStartDate(), {
  twoLevel: true,
  placeKey: PLACE,
});
const state = coreAPI(core).moduleState(OFFICES_MODULE_ID);
const offices = state.table("offices").rows() as unknown as {
  id: string;
  kind: string;
}[];
const serving = (
  state.table("terms").rows() as unknown as {
    personId: string | null;
    officeId: string;
    status: string;
  }[]
)
  .filter(
    (r) =>
      r.status === "serving" &&
      r.personId &&
      core.people.get(r.personId as PersonId)?.alive,
  )
  .map((r) => ({
    personId: r.personId as PersonId,
    kind: offices.find((o) => o.id === r.officeId)?.kind ?? "",
  }))
  .sort((a, b) => a.personId.localeCompare(b.personId));
const CLASSES: [string, RegExp][] = [
  ["governor", /governor/],
  ["mayor", /mayor/],
  ["county official", /county/],
  ["legislator", /senate|house|upper|lower|legislat/],
];
const watched = CLASSES.map(([label, re]) => {
  const row = serving.find(
    (r) =>
      re.test(r.kind) &&
      !(label === "legislator" && /governor|mayor|county/.test(r.kind)),
  );
  if (!row) throw new Error(`no ${label} at ${PLACE}`);
  return { label, ...row };
});
const TYPES = [
  "vote-asked",
  "vote-sought",
  "serve-sought",
  "vote-confirmed",
  "bill-carry",
  "donor-ask",
  "bribe-offer",
  "office-hours",
  "desk-visit",
  "section-bargain",
  "bill-held-chair",
  "bribe-pressed",
  "budget-cut",
  "bill-sign-on",
];
console.log(`# Office rooms, place ${PLACE}, seed ${SEED}\n`);
for (const w of watched) {
  const person = core.people.get(w.personId)!;
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  const employer = job ? core.organizations.get(job.organizationId) : undefined;
  console.log(
    `${w.label} (${w.kind}) ${w.personId}: job employer "${employer?.name}" kind ${employer?.kind}`,
  );
}
console.log(
  "\n| type | official | old first setting | new first setting |\n|---|---|---|---|",
);
for (const key of TYPES) {
  const type = SITUATION_LIBRARY.types.find((t) => t.key === key)!;
  const lists = new Set(
    [type.setting, ...type.causes.map((c) => c.setting ?? type.setting)].map(
      (l) => l.join(","),
    ),
  );
  for (const list of lists)
    for (const w of watched) {
      const person = core.people.get(w.personId)!;
      const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
      const moment = {
        personId: w.personId,
        causeId: job?.id ?? "",
        counterpartIds: [],
      } as unknown as Moment;
      const first = (
        reader: (k: string) => { kind: string; recordId: string } | undefined,
      ) => {
        for (const k of list.split(",")) {
          const r = reader(k);
          if (r) return `${r.kind} ${r.recordId}`;
        }
        return "none (no scene)";
      };
      const emp = job ? core.organizations.get(job.organizationId) : undefined;
      const oldFirst = first((k) =>
        k === "office"
          ? emp
            ? {
                kind: "office",
                recordId: `${emp.name} [${emp.kind}${isPayrollOrganization(emp) ? ", PAYROLL" : ""}]`,
              }
            : undefined
          : resolveSetting(k, core, moment, 2),
      );
      const newFirst = first((k) => {
        const r = resolveSetting(k, core, moment, 2);
        return r && { kind: r.kind, recordId: r.recordId };
      });
      console.log(
        `| ${key} [${list}] | ${w.label} | ${oldFirst} | ${newFirst} |`,
      );
    }
}
