// W3 packet: the endorsement ask, played. A candidate the player knows files, the campaign asks the player to endorse, the director stages
// `endorsement-ask`, and every reply is pressed. The place and seed are the ones src/director/endorsement-ask-scene.test.ts names (Loving, New Mexico).
// Usage: node --import tsx scripts/story/endorsement-packet.mts
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { townSeats } from "../../src/core2/modules/offices";
import { members } from "../../src/core2/modules/legislature";
import {
  ENDORSEMENT_ASKED_EVENT,
  endorsementsOf,
} from "../../src/core2/modules/campaigns";
import {
  fileCandidacy,
  openContests,
  type ContestRow,
  type FilingRow,
  ELECTIONS_MODULE_ID,
} from "../../src/core2/modules/elections";
import { filingClerkFor } from "../../src/core2/modules/filing-clerk";
import { lawChain } from "../../src/core2/modules/laws";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";

const PLACE = {
  key: "3544420",
  name: "Loving, New Mexico",
  seed: "d1ef254b96157871fa107765d9300048c2d5d9e252b59d2ae19b810ed8cc83be",
};
const where = `${PLACE.name} (${PLACE.key}), seed ${PLACE.seed}`;
const out = (text: string) => process.stdout.write(`${text}\n`);

function world() {
  const favor = false;
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const api = coreAPI(core);
  const playerId = core.playerId as PersonId;
  const player = core.people.get(playerId)!;
  director.watch(core, playerId);
  const open = () =>
    [...openContests(api)].sort(
      (a, b) =>
        a.electionDate.localeCompare(b.electionDate) ||
        a.id.localeCompare(b.id),
    );
  for (let day = 0; !open().length && day < 365; day += 7)
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  // A favor is owed over a bill before the race's own body: a body with
  // members to sponsor one.
  const race = (
    favor
      ? open().find((row) =>
          townSeats(api).some(
            (seat) =>
              seat.office.id === row.officeId &&
              members(api, row.officeId).length > 1,
          ),
        )
      : open()[0]
  ) as ContestRow | undefined;
  const clerkId = race ? filingClerkFor(api, race.id)?.personId : undefined;
  const town = lawChain(api).townPlaceId;
  // The first adult the player knows (their circle, by id) who files.
  const circle = [...new Set([...player.familyIds, ...player.knownIds])]
    .sort()
    .map((id) => core.people.get(id))
    .filter(
      (p) =>
        p &&
        p.alive &&
        p.id !== clerkId &&
        p.placeId === town &&
        ageOnDate(p.birthDate, core.date) >= 18,
    );
  const candidate = race
    ? circle.find((p) =>
        ["petitioning", "on-ballot"].includes(
          fileCandidacy(api, {
            personId: p!.id,
            contestId: race.id,
            platform: [],
          }).status ?? "",
        ),
      )
    : undefined;
  if (!race || !candidate)
    throw new Error(`${where}: no one the player knows filed for a race`);
  const filing = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .rows() as unknown as FilingRow[]
  ).find((row) => row.personId === candidate.id)!;
  // Edge case by hand (a fixture, not a played deal): the player owes the
  // candidate a favor from a deal over a bill the body has before it.
  let obligationId: string | undefined;
  if (favor) {
    const sponsor = members(api, race.officeId)[0]!;
    const policy = billCatalog(api, race.level as "city" | "county" | "state")
      .flatMap((subject) => subject.topics.flatMap((t) => t.policies))
      .find((row) => row.kind === "policy-question" && row.authority.allowed)!;
    const bill = draftBill(api, {
      bodyOfficeId: race.officeId,
      sponsorId: memberKey(sponsor),
      provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
    });
    obligationId = `obligation:${bill.id}:${candidate.id}:fixture`;
    api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("obligations")
      .put({
        id: obligationId,
        owedBy: playerId,
        owedTo: candidate.id,
        kind: "trade",
        billId: bill.id,
        measure: bill.number,
        date: core.date,
        settled: false,
      } as never);
  }
  return {
    core,
    director,
    api,
    race,
    filing,
    candidate,
    playerId,
    obligationId,
  };
}

const ctx = world();
const { core, director, api, filing, candidate, playerId } = ctx;
const rowId = `endorsement:${filing.id}:${playerId}`;
for (
  let day = 0;
  day < 60 &&
  !endorsementsOf(api, filing.id).some((row) => row.speakerId === playerId);
  day += 1
)
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
const record = [...core.durableLog.values()]
  .filter(
    (r) =>
      r.kind === ENDORSEMENT_ASKED_EVENT && r.facts?.endorsementId === rowId,
  )
  .sort((a, b) => a.date.localeCompare(b.date))
  .at(-1);
if (!record) throw new Error(`${where}: the player was never asked`);
const book = director.ledger.people.get(playerId)!;
const entry = book.schedule.find(
  (e) => book.momentsById.get(e.momentId)?.causeId === record.id,
);
if (!entry) throw new Error(`${where}: no scene staged from ${record.id}`);
const result = purposeScene(core, director, playerId, entry, {
  typeKey: "endorsement-ask",
});
if (result?.kind !== "composed")
  throw new Error(`not composed: ${JSON.stringify(result)}`);
const talk = result.scene.talk;
out(
  `# ${where}, asked on ${record.date}: ${candidate.givenName} ${candidate.familyName} (${filing.id})`,
);
for (const line of talk.narration) out(`narrator: ${line.text}`);
if (talk.open) out(`${talk.open.role}: ${talk.open.text}`);
out(`${talk.state.role}: ${talk.state.text}`);
function walk(node: TreeNode, indent: string) {
  for (const line of node.lines) out(`${indent}${line.role}: ${line.text}`);
  for (const reply of node.replies) {
    out(`${indent}> [${reply.line.move}] ${reply.line.text}`);
    if (reply.next) walk(reply.next, `${indent}    `);
  }
  if (node.end?.close)
    out(`${indent}  (close, ${node.end.outcome}) ${node.end.close.text}`);
  else if (node.end) out(`${indent}  (ends: ${node.end.outcome})`);
}
walk(talk.tree, "  ");
if (talk.gaps.length) out(`GAPS: ${talk.gaps.join(" | ")}`);
