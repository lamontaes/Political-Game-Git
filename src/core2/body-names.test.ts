/**
 * A body is named by its own record (pool item gov-body-named-by-member-title):
 * a county board, a township board or a town council carries a name of its own
 * on its office row, never a member's title ("Commissioner") and never its
 * government's bare listing ("COUNTY OF DARLINGTON"). The bill it drafts opens
 * with that name. A random place from all 56.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { openLaws } from "./modules/laws";
import { OFFICES_MODULE_ID, openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import {
  bodyNameOf,
  bodyOf,
  draftBill,
  openLegislature,
} from "./modules/legislature";
import { municipalBodyName } from "./offices-local";
import { governmentUnit } from "./reference/government-units";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`body-names:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();

describe("a body's name", () => {
  it("a municipal body is named for its form and place, not its members", () => {
    const unit = {
      id: "x",
      name: "CITY OF PALACIOS",
      unitType: "municipality",
    } as never;
    expect(municipalBodyName(unit)).toMatch(
      /^City (Council|Commission) of Palacios$/,
    );
  });

  it("every body in a generated place has a name of its own, and its bills open with it", () => {
    const state = pick(states, "state");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "place").key;
    const where = `seed ${seed}, ${state} place ${key}`;
    const full = buildPopulation({
      seed,
      placeKey: key,
      startedAt: "2026-01-05",
      minimumPeople: 250,
    });
    const player = [...full.people].sort((a, b) =>
      a.id.localeCompare(b.id),
    )[0]!;
    const core = createLifeCore(
      collapseToTwoLevels({ ...full, playerId: player.id }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openRecord(core);
    openLegislature(core);
    const api = coreAPI(core);
    const bodies = (
      api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
        id: string;
        kind: string;
        title: string;
        governmentName: string;
        jurisdiction: string;
        bodyName?: string;
        coversTown: boolean;
      }[]
    ).filter(
      (o) =>
        o.coversTown && /^(council|county-board|township-board)$/.test(o.kind),
    );
    expect(bodies.length, `${where}: no local body`).toBeGreaterThan(0);
    for (const office of bodies) {
      const name = bodyNameOf(office);
      expect(office.bodyName, `${where} ${office.id}`).toBeTruthy();
      expect(name, where).not.toBe(office.governmentName);
      expect(name, where).not.toBe(office.title);
      expect(name, where).toMatch(
        /council|board|commission|court|meeting|jury|assembly|trustees|selectm|supervisors|legislature/i,
      );
      const unit = governmentUnit(office.jurisdiction);
      expect(unit, where).toBeTruthy();
      expect(bodyOf(api, office.id)!.bodyName, where).toBe(name);
      const bill = draftBill(api, {
        bodyOfficeId: office.id,
        sponsorId: player.id,
        provisions: [
          {
            kind: "policy-question" as const,
            question: "local-policy:paid-family-leave",
            value: 1,
          },
        ],
      });
      expect(bill.form.enactingClause, where).toContain(name);
    }
  }, 600_000);
});
