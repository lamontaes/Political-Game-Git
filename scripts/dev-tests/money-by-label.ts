/**
 * Dev Tester: where a law's money went, by the payments' own labels. Builds
 * the same generated world twice, passes one bill through the level's real
 * body in one of them, runs both the same number of days with the journal
 * trace on, and prints, for each payment label, who ended with more and who
 * with less than in the world left alone (people, counted households,
 * businesses, each level's treasury, the outside account). `DevMode.twinMoney`
 * says who holds more at the end; this says by which payments it got there.
 * Usage:
 *   PLACE_KEY=<key> WORLD_SEED=<seed> tsx scripts/dev-tests/money-by-label.ts \
 *     <level> <policyIdSubstring> [days] [amount | +points] [out.json]
 *   LIST=1 ... lists the level's policies that match and passes nothing.
 * The level is city, county, state or federal (federal files in the House).
 * Two worlds built this way with no bill end identical to the dollar, so
 * every difference comes from the bill.
 */
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { billCatalog, provisionFor } from "../../src/core2/bill-catalog";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { setJournalTrace } from "../../src/core2/journal-state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { governments } from "../../src/core2/modules/budgets";
import {
  billEnding,
  bodyOf,
  castChairHearing,
  castMemberVote,
  chambersOf,
  draftBill,
  executiveDecision,
  holdVote,
  memberKey,
  members,
  sectionsAddedTo,
} from "../../src/core2/modules/legislature";
import { LAWS_MODULE_ID } from "../../src/core2/modules/laws";
import { townSeats } from "../../src/core2/modules/offices";
import { coreAPI } from "../../src/core2/state";
import type { CoreState } from "../../src/core2/types";

setBookkeeping(false);
const [level = "city", pick = "", daysArg = "120", amountArg = "", out = ""] =
  process.argv.slice(2);
const days = Number(daysArg);
const seed = process.env.WORLD_SEED ?? "";
const placeKey = process.env.PLACE_KEY ?? "";
if (!seed || !placeKey) {
  console.error(
    "Set PLACE_KEY and WORLD_SEED: the place and seed are named, never drawn here.",
  );
  process.exit(2);
}
const build = () =>
  buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey }).core;

/** Who holds an account: the outside, a level's treasury, people, or the organization's kind (counted households are `residents`). */
function holderOf(
  core: CoreState,
  treasuries: ReadonlyMap<string, string>,
  accountId: string,
): string {
  const account = core.cashJournal.accounts.get(accountId);
  if (!account) return "unknown account";
  if (account.outsideFlow) return "outside";
  const treasury = treasuries.get(account.ownerId);
  if (treasury) return treasury;
  if (core.people.has(account.ownerId as never)) return "people";
  const organization = core.organizations.get(account.ownerId as never);
  return organization ? organization.kind : "other";
}

/** Run a world with the trace on: each label's net change by holder, and the cash each holder ends with. */
function play(core: CoreState) {
  const api = coreAPI(core);
  const treasuries = new Map(
    governments(api).map((row) => [
      row.organizationId as string,
      `${row.level} treasury`,
    ]),
  );
  const labels = new Map<string, Map<string, number>>();
  setJournalTrace((input) => {
    const label = input.sourceRef.id.split(":")[0]!;
    const row = labels.get(label) ?? new Map<string, number>();
    for (const posting of input.postings) {
      const holder = holderOf(core, treasuries, posting.accountId);
      row.set(holder, (row.get(holder) ?? 0) + posting.deltaMinor);
    }
    labels.set(label, row);
  });
  try {
    advanceCore(core, addDays(makeIsoDate(core.date), days));
  } finally {
    setJournalTrace(null);
  }
  const cash = new Map<string, number>();
  const add = (holder: string, minor: number) =>
    cash.set(holder, (cash.get(holder) ?? 0) + minor);
  for (const person of core.people.values())
    if (person.alive) add("people", person.liquidMinor);
  for (const organization of core.organizations.values())
    add(
      treasuries.get(organization.id) ??
        (organization.outsideFlow ? "outside" : organization.kind),
      organization.liquidMinor,
    );
  return { labels, cash };
}

const law = build();
const api = coreAPI(law);
const seat = townSeats(api).find(
  (row) =>
    row.office.level === level &&
    row.holder?.personId &&
    bodyOf(api, row.office.id) &&
    (level === "state"
      ? row.office.kind.startsWith("legislature-")
      : level === "federal"
        ? row.office.kind === "us-house"
        : true),
);
if (!seat) {
  console.error(
    `No ${level} body with a resident member over place ${placeKey}.`,
  );
  process.exit(1);
}
const matches = billCatalog(api, level as never)
  .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
  .filter((policy) => policy.id.includes(pick));
if (process.env.LIST) {
  for (const policy of matches)
    console.log(
      `${policy.id} (${policy.kind}; ${policy.operations.join(", ")}; in force ${policy.inForce ?? "none"})`,
    );
  process.exit(0);
}
const policy = matches[0];
if (!policy) {
  console.error(`No ${level} policy matches "${pick}".`);
  process.exit(1);
}
const operation =
  process.env.OPERATION ??
  (policy.operations.includes("enact")
    ? "enact"
    : policy.operations.includes("raise")
      ? "raise"
      : policy.operations[0]!);
const amount =
  policy.kind === "policy-question"
    ? undefined
    : amountArg.startsWith("+")
      ? Math.round(((policy.inForce ?? 0) + Number(amountArg.slice(1))) * 100) /
        100
      : amountArg
        ? Number(amountArg)
        : Math.max(1, Math.round((policy.inForce ?? 1) * 1.2 + 1));
interface LawRow {
  readonly id: string;
  readonly series: string;
  readonly jurisdiction: string;
  readonly value: number | null;
  readonly effectiveDate: string;
}
const lawRows = () =>
  api.moduleState(LAWS_MODULE_ID).table("laws").rows() as unknown as LawRow[];
const before = new Set(lawRows().map((row) => row.id));
const bill = draftBill(api, {
  bodyOfficeId: seat.office.id,
  sponsorId: seat.holder!.personId!,
  provisions: [
    provisionFor({
      policyId: policy.id,
      operation: operation as never,
      ...(amount !== undefined ? { amount } : {}),
    }),
  ],
});
// Every member is cast yes, each chair hears it and the executive signs, as dev mode's force does: one section, no trade.
for (const chamber of chambersOf(api, bill)) {
  for (const member of members(api, chamber))
    castMemberVote(api, bill.id, memberKey(member), "yes");
  castChairHearing(api, bill.id, chamber, true);
}
executiveDecision(api, bill.id, true);
let held = holdVote(api, bill.id);
if (held.status === "awaiting-signature")
  held = executiveDecision(api, bill.id, true);
const treated = play(law);
// The rows the world wrote after the bill was drafted, in this jurisdiction's chain: the bill's own and what it set.
const written = lawRows().filter((row) => !before.has(row.id));
const control = play(build());

const dollars = (minor: number) =>
  `${minor < 0 ? "-" : "+"}$${Math.round(Math.abs(minor) / 100).toLocaleString("en-US")}`;
console.log(
  `Place ${placeKey}, world seed ${seed}, ${days} days. ${policy.id} (${operation}${amount !== undefined ? ` ${amount}` : ""}) at ${seat.office.id}: ${held.status}, ended ${billEnding(api, bill.id).how}, sections added ${JSON.stringify(sectionsAddedTo(held))}.`,
);
console.log(
  `Law rows written in the treated world after the draft: ${written.length}`,
);
for (const row of written
  .filter(
    (one) =>
      one.series === policy.series ||
      one.id.includes(policy.id.split(":").slice(1).join(":")),
  )
  .slice(0, 6))
  console.log(
    `  ${row.series} at ${row.jurisdiction} = ${row.value} from ${row.effectiveDate}`,
  );
console.log("Cash at the end, with the bill against without:");
const holders = [
  ...new Set([...treated.cash.keys(), ...control.cash.keys()]),
].sort();
for (const holder of holders) {
  const diff =
    (treated.cash.get(holder) ?? 0) - (control.cash.get(holder) ?? 0);
  if (Math.abs(diff) >= 100) console.log(`  ${holder}: ${dollars(diff)}`);
}
console.log(
  "By payment label (net change per holder, with the bill against without), largest first:",
);
const rows = [...new Set([...treated.labels.keys(), ...control.labels.keys()])]
  .map((label) => {
    const a = treated.labels.get(label) ?? new Map<string, number>();
    const b = control.labels.get(label) ?? new Map<string, number>();
    const diff = [...new Set([...a.keys(), ...b.keys()])]
      .map(
        (holder) =>
          [holder, (a.get(holder) ?? 0) - (b.get(holder) ?? 0)] as const,
      )
      .filter(([, minor]) => Math.abs(minor) >= 100)
      .sort((x, y) => x[1] - y[1]);
    const moved = diff.reduce((sum, [, minor]) => sum + Math.abs(minor), 0) / 2;
    return { label, moved, diff };
  })
  .filter((row) => row.moved >= 100)
  .sort((x, y) => y.moved - x.moved);
for (const row of rows.slice(0, 25))
  console.log(
    `  ${row.label}: ${row.diff.map(([holder, minor]) => `${holder} ${dollars(minor)}`).join(", ")}`,
  );
if (out)
  writeFileSync(
    out,
    JSON.stringify(
      {
        placeKey,
        seed,
        days,
        level,
        policy: policy.id,
        operation,
        amount: amount ?? null,
        status: held.status,
        written,
        rows,
      },
      null,
      1,
    ),
  );
