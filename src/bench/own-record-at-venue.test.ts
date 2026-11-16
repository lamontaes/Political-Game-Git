/**
 * The player's own records that are met where they happened (the filing at
 * the clerk's counter, the count of their own race on election night) stop
 * the day there, played by the page's own presses (pool item
 * director-own-record-at-a-venue-stops-the-day). Before, race-won,
 * race-lost and filing bound at a venue, which scheduling.ownRecordSettings
 * did not list, so the filing and the night of the count were Journal lines
 * and election night opened no scene of the player's own result.
 *
 * Pinned to Amherst, New Hampshire (3301220), world seed 2988b829…df4a9,
 * played as Pat Leonard for the Selectman race of 2025-11-04 (skill
 * pinned-tests): a new life, weekly presses to the filing, the counter, a
 * Week press at a time to the vote, the ballot, then Day presses to the night
 * of the count. Dev mode's Trace of each moment shows how it was staged.
 */
import { expect, it } from "vitest";
import { setBookkeeping } from "../core2/bookkeeping";
import { traceNode } from "./dev-trace";
import { benchRequest, benchWorld } from "./handler";

const PLACE = {
  name: "Amherst, New Hampshire",
  key: "3301220",
  seed: "2988b82939851f417a56f82c77b222cab047a3a3ccef9e7739aabe92101df4a9",
  personId: "person_6adac55e30bc0468",
  contestId: "contest:seat:gus2025:108959:board:0:2025-11-04",
  election: "2025-11-04",
};
const WHERE = `${PLACE.name} (${PLACE.key}), world seed ${PLACE.seed}, as ${PLACE.personId}`;
// About 75 s alone on a cloud container; the limit is near twice the slower run.
const LIMIT_MS = 180_000;

/** The parts of the bench's replies this test reads. */
interface Packet {
  readonly kind?: string;
  readonly pauseId?: string;
}
interface Body {
  readonly packet?: Packet;
  readonly life?: { readonly packet?: Packet };
  readonly filing?: { readonly id: string; readonly status: string };
  readonly contestId?: string;
  readonly resultMomentId?: string | null;
}
interface Json {
  readonly status?: number;
  readonly json: Body | null;
}
const ask = async (method: string, path: string): Promise<Json> => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: true,
  });
  const text =
    typeof reply.body === "string"
      ? reply.body
      : Buffer.from(reply.body ?? "").toString("utf8");
  return {
    status: reply.status,
    json: text ? (JSON.parse(text) as Body) : null,
  };
};
const q = (o: Record<string, string>) => new URLSearchParams(o).toString();

/** Every stop the day holds is resumed as the page's Continue does. */
const resume = async (first: Json): Promise<void> => {
  let next = first;
  for (
    let stops = 0;
    next.json?.packet?.kind === "stop" && stops < 20;
    stops += 1
  )
    next = await ask(
      "POST",
      `/api/resume?${q({ kind: "stop", pauseId: next.json.packet.pauseId ?? "" })}`,
    );
};
const held = async (): Promise<void> => {
  const packet = (await ask("GET", "/api/title")).json?.life?.packet;
  if (packet?.kind === "stop") await resume({ json: { packet } });
  if ((await ask("GET", "/api/polling-place")).json) {
    await ask(
      "POST",
      `/api/polling-place/mark?${q({ contestId: PLACE.contestId, candidateId: PLACE.personId })}`,
    );
    await ask("POST", "/api/polling-place/leave");
  }
};

/** The row the director wrote for the player's moment of a record, and dev mode's panel of it. */
const staged = async (recordPart: string) => {
  const book = benchWorld().director!.ledger.people.get(
    PLACE.personId as never,
  )!;
  const row = book.schedule.find(
    (entry) => entry.momentId.includes(recordPart) && entry.bindings.length > 0,
  );
  // The trace dev mode's Trace box shows for the moment (dev-mode.ts trace).
  const trace = row
    ? traceNode(benchWorld().core!, benchWorld().director, row.momentId)
    : null;
  const panel = (trace?.why ?? []).find(
    (each) => each.title === "How the story staged it",
  );
  return { row, panel };
};

it(
  `${PLACE.name}: the filing and the night of the count stop the day at the venue`,
  async () => {
    setBookkeeping(false);
    expect(
      (
        await ask(
          "POST",
          `/api/newlife?${q({ seed: PLACE.seed, placeKey: PLACE.key })}`,
        )
      ).status,
    ).toBe(200);
    expect(
      (await ask("POST", `/api/play?${q({ id: PLACE.personId })}`)).status,
    ).toBe(200);
    const core = benchWorld().core!;
    let filingId = "";
    for (let week = 0; week < 60 && !filingId; week += 1) {
      const filed = (
        await ask("POST", `/api/file?${q({ contestId: PLACE.contestId })}`)
      ).json;
      if (
        filed?.filing?.status === "on-ballot" ||
        filed?.filing?.status === "petitioning"
      )
        filingId = filed.filing.id;
      else await resume(await ask("POST", "/api/advance?mode=week"));
    }
    expect(filingId, `${WHERE}: never filed`).not.toBe("");
    const filing = await staged(`candidate-filed:${filingId}`);
    expect(filing.row, `${WHERE}: no filing moment`).toBeDefined();
    expect(
      filing.row!.bindings.map((b) => [b.typeKey, b.setting.kind]),
    ).toContainEqual(["filing", "venue"]);
    expect(filing.row!.outcome, `${WHERE}: ${JSON.stringify(filing.row)}`).toBe(
      "scene-now",
    );
    expect(filing.row!.stopsBecause).toContain("own-record");
    expect(JSON.stringify(filing.panel)).toContain(
      "own record, met where its scene is set",
    );

    let night: Body | null = null;
    for (let presses = 0; presses < 200 && !night; presses += 1) {
      await held();
      const before = core.date;
      const mode = core.date < "2025-10-28" ? "week" : "day";
      await resume(await ask("POST", `/api/advance?mode=${mode}`));
      if (core.date === before) await held();
      const read = (
        await ask("GET", `/api/election-night?${q({ id: PLACE.personId })}`)
      ).json;
      if (read?.contestId === PLACE.contestId) night = read;
    }
    expect(night, `${WHERE}: election night never came`).not.toBeNull();
    const result = await staged(`election-result:${PLACE.contestId}`);
    expect(result.row, `${WHERE}: no result moment`).toBeDefined();
    expect(
      result.row!.bindings.map((b) => [b.typeKey, b.setting.kind]),
    ).toContainEqual(["race-lost", "venue"]);
    expect(result.row!.outcome, `${WHERE}: ${JSON.stringify(result.row)}`).toBe(
      "scene-now",
    );
    expect(result.row!.stopsBecause).toContain("own-record");
    // Election night opens the scene of the player's own result.
    expect(night!.resultMomentId).toBe(result.row!.momentId);
    expect(JSON.stringify(result.panel)).toContain(
      "own record, met where its scene is set",
    );
    process.stdout.write(
      `${WHERE}: filing ${filing.row!.momentId} and result ${result.row!.momentId} staged scene-now at the venue\n`,
    );
  },
  LIMIT_MS,
);
