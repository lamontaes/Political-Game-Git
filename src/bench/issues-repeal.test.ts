/**
 * Issues → a law's page offers Repeal to the body that holds the power
 * (pool item play-repeal-action-on-every-law-page). In a played bench world
 * (buildBenchWorld, two-level) in drawn places: a council member sees the
 * action on a law its council set, with the office its own body drafts
 * through; on a law only the state can change it sees no action and the line
 * naming the legislature bodies; a resident with no office sees neither. A
 * state legislator sees the action on the state law. The repeal drafts
 * through the seat with the value 0: an amount zeroed, a yes-or-no law
 * answered No, the same value dev mode's Repeal button sends.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { coreAPI } from "../core2/state";
import { townSeats } from "../core2/modules/offices";
import { buildBenchWorld } from "./world";
import { governmentView } from "./government";
import { seatAct } from "./legislature";

const seed =
  process.env.GOVERN_REPEAL_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

const CHAMBER_KINDS = [
  "legislature-lower",
  "legislature-unicameral",
  "legislature-upper",
];

it(`a law page offers Repeal to the body with the power, seed ${seed}`, () => {
  setBookkeeping(false);
  let found:
    | {
        core: ReturnType<typeof buildBenchWorld>["core"];
        where: string;
        councilOfficeId: string;
        councilBody: string;
        councilPerson: string;
        chamberOfficeId: string;
        chamberPerson: string;
        resident: string;
        citySeries: string;
        cityYesNo: boolean;
        stateSeries: string;
      }
    | undefined;
  for (let draw = 0; draw < 12 && !found; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "issues-repeal");
    const built = buildBenchWorld(place.seed, "2025-01-20", {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, playerId } = built;
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const api = coreAPI(core);
    const seats = townSeats(api);
    const council = seats.find(
      (s) => s.office.kind === "council" && s.holder?.personId,
    );
    const chamber = CHAMBER_KINDS.map((kind) =>
      seats.find((s) => s.office.kind === kind && s.holder?.personId),
    ).find((s) => s !== undefined);
    if (!council || !chamber || !playerId) continue;
    // The resident playing holds no office: any serving term disqualifies.
    const serving = (
      api
        .moduleState("core2-offices-v1")
        .table("terms")
        .query("byPerson", [playerId]) as unknown as { status: string }[]
    ).some((row) => row.status === "serving");
    if (serving) continue;
    const councilView = governmentView(core, council.holder!.personId!);
    const chamberView = governmentView(core, chamber.holder!.personId!);
    const cityLaw = councilView.law.find((law) =>
      law.levels.some(
        (entry) =>
          entry.level === "city" && entry.row && entry.repeal?.officeId,
      ),
    );
    const stateLaw = chamberView.law.find((law) =>
      law.levels.some(
        (entry) =>
          entry.level === "state" && entry.row && entry.repeal?.officeId,
      ),
    );
    if (!cityLaw || !stateLaw) continue;
    found = {
      core,
      where,
      councilOfficeId: council.office.id,
      councilBody: council.office.bodyName ?? council.office.title,
      councilPerson: council.holder!.personId!,
      chamberOfficeId: chamber.office.id,
      chamberPerson: chamber.holder!.personId!,
      resident: playerId,
      citySeries: cityLaw.series,
      cityYesNo: cityLaw.yesNo,
      stateSeries: stateLaw.series,
    };
  }
  expect(
    found,
    `a town with a seated council, a seated chamber and a state and city law (seed ${seed})`,
  ).toBeDefined();
  const {
    core,
    where,
    councilOfficeId,
    councilBody,
    councilPerson,
    chamberOfficeId,
    chamberPerson,
    resident,
    citySeries,
    cityYesNo,
    stateSeries,
  } = found!;
  process.stdout.write(`REPEAL-OFFER ${JSON.stringify({ where })}\n`);
  const entryOf = (
    view: ReturnType<typeof governmentView>,
    series: string,
    level: string,
  ) =>
    view.law
      .find((law) => law.series === series)
      ?.levels.find((l) => l.level === level);
  const councilView = governmentView(core, councilPerson);
  const chamberView = governmentView(core, chamberPerson);
  const residentView = governmentView(core, resident);

  // The council member repeals the council's law through its own office.
  const cityOffer = entryOf(councilView, citySeries, "city")?.repeal;
  expect(cityOffer?.officeId, `${where}: ${citySeries}`).toBe(councilOfficeId);
  // The same member sees no action on the state-only law, only the bodies.
  const stateNoOffer = entryOf(councilView, stateSeries, "state")?.repeal;
  expect(stateNoOffer?.officeId, `${where}: ${stateSeries}`).toBeNull();
  expect(stateNoOffer?.body, `${where}: ${stateSeries}`).toBeTruthy();
  expect(stateNoOffer?.body, `${where}: ${stateSeries}`).not.toBe(councilBody);
  // The state legislator repeals the state law through its chamber.
  const stateOffer = entryOf(chamberView, stateSeries, "state")?.repeal;
  expect(stateOffer?.officeId, `${where}: ${stateSeries}`).toBe(
    chamberOfficeId,
  );
  // The resident with no office sees neither an action nor a line.
  for (const [series, level] of [
    [citySeries, "city"],
    [stateSeries, "state"],
  ] as const) {
    const seen = entryOf(residentView, series, level)?.repeal;
    expect(seen?.officeId, `${where}: resident ${series}`).toBeNull();
    expect(seen?.body, `${where}: resident ${series}`).toBeNull();
  }

  // What repeal writes: an amount zeroed, a yes-or-no law answered No.
  const acted = seatAct(core, councilPerson, {
    kind: "draft",
    officeId: councilOfficeId,
    ...(cityYesNo ? { question: citySeries } : { series: citySeries }),
    value: 0,
  });
  const tag = `${where}; bill ${acted.id}`;
  expect(acted.status, tag).toBe("drafted");
  if (cityYesNo)
    expect(acted.provisions, tag).toContainEqual(
      expect.objectContaining({
        kind: "policy-question",
        question: citySeries,
        value: 0,
      }),
    );
  else
    expect(acted.provisions, tag).toContainEqual(
      expect.objectContaining({
        kind: "law-amount",
        series: citySeries,
        value: 0,
      }),
    );
}, 600_000);
