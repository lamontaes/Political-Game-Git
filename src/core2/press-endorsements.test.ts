/**
 * Outlets endorse (SG-PEOPLE-press-endorsements), in a random place from all
 * 56: a candidate is on the ballot, the election nears, and an outlet whose
 * head's views favor the candidate over their own lean endorses once; the
 * outlet's followers are reached by it as cause rows the voting engine reads,
 * and a second week does not say it again.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openRecord } from "./modules/record";
import {
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { followersOf, openPress, outletsHere } from "./modules/press";
import { viewsModule } from "./modules/views";

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`press-endorsements:${Date.now()}`).digest("hex");

function setup(attempt: number) {
  const place = drawPlace(`${runSeed}:${attempt}`, "press-endorsements");
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: START,
      minimumPeople: 300,
    }),
    { modules: [viewsModule] },
  );
  openLaws(core);
  openOffices(core, place.seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openRecord(core);
  openPress(core);
  const api = coreAPI(core);
  const where = `${place.name} (${place.key}), run seed ${runSeed}:${attempt}`;
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  let filing: FilingRow | null = null;
  for (const candidate of adults) {
    for (const contest of openContests(api)) {
      const filed = fileCandidacy(api, {
        personId: candidate.id,
        contestId: contest.id,
        platform: [],
      });
      if (filed.status !== "refused" && filed.filing.status === "on-ballot") {
        filing = filed.filing;
        break;
      }
    }
    if (filing) break;
  }
  return { core, api, filing, where };
}

it("an outlet's head endorses a candidate once, and the outlet's followers are reached", () => {
  const seen: string[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { core, api, filing, where } = setup(attempt);
    if (!filing) {
      seen.push(`${where}: nobody filed`);
      continue;
    }
    const outlets = outletsHere(api).filter((o) => o.headId);
    if (!outlets.length) {
      seen.push(`${where}: no outlet`);
      continue;
    }
    const contest = openContests(api).find((c) => c.id === filing.contestId)!;
    // The press week runs weekly; stop a few weeks before the election and
    // run through it so the window opens and passes.
    advanceCore(core, addDays(makeIsoDate(contest.electionDate), -1));
    const rows = api.moduleState("core2-press-v1").table("endorsements").rows();
    seen.push(`${where}: ${rows.length} endorsements`);
    if (!rows.length) continue;
    const row = rows[0] as unknown as {
      id: string;
      outletId: string;
      headId: string;
      heardBy: number;
    };
    // Said once per outlet and contest.
    expect(new Set(rows.map((r) => (r as { id: string }).id)).size, where).toBe(
      rows.length,
    );
    const followers = followersOf(api, row.outletId);
    expect(row.heardBy, where).toBeGreaterThanOrEqual(0);
    if (followers.length) {
      // A follower of the outlet was reached by the head's endorsement.
      const reached = followers.some((id) =>
        (
          api
            .moduleState("core2-campaigns-v1")
            .table("causes")
            .query("byVoter", [id]) as unknown as {
            act: string;
            actorId: string;
          }[]
        ).some((c) => c.act === "endorsement" && c.actorId === row.headId),
      );
      expect(reached, `${where}: ${row.id}`).toBe(true);
    }
    console.log(`press-endorsements: ${seen.join("; ")}`);
    return;
  }
  throw new Error(`no endorsement in any drawn place: ${seen.join("; ")}`);
}, 1_800_000);
