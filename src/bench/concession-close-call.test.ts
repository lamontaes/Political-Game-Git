/**
 * The concession call says "close" only when the race was (pool item
 * director-concession-call-says-close-when-the-race-was-not). Played by the
 * page's own presses at Amherst, New Hampshire (3301220, world seed
 * 2988b829…df4a9) as Pat Leonard, who files for Selectman, buys a poll
 * through the campaign's own act a week before the vote, votes, and loses on
 * 2025-11-04 far wider than that poll had it, with no recount. On the night
 * of the count the player asks the manager "How close was it?"; the answer is
 * fitted by the one race read (src/director/race-turnout-facts.ts
 * raceReadFacts): wider than the campaign's own poll, outside the state's
 * recount rule. Before, every loss heard "Closer than anybody expected."
 * Pinned (skill pinned-tests); place, seed and record ids in every message.
 */
import { expect, it } from "vitest";
import { setBookkeeping } from "../core2/bookkeeping";
import { raceReadFacts } from "../director/race-turnout-facts";
import { benchRequest, benchWorld } from "./handler";

const PLACE = {
  name: "Amherst, New Hampshire",
  key: "3301220",
  seed: "2988b82939851f417a56f82c77b222cab047a3a3ccef9e7739aabe92101df4a9",
  personId: "person_6adac55e30bc0468",
  contestId: "contest:seat:gus2025:108959:board:0:2025-11-04",
};
const WHERE = `${PLACE.name} (${PLACE.key}), world seed ${PLACE.seed}, as ${PLACE.personId}`;
// About 80 s alone on a cloud container; the limit is near twice the slower run.
const LIMIT_MS = 180_000;
/** The manager's answers the bank holds for a loss wider than the campaign's poll, with no recount. */
const WIDER = [
  "It wasn't close. Our own poll had it tighter than that.",
  "Worse than our poll had it. It wasn't close.",
];

type Json = Record<string, any>;
const ask = async (method: string, path: string): Promise<Json> => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: true,
  });
  const text =
    typeof reply.body === "string"
      ? reply.body
      : Buffer.from(reply.body ?? "").toString("utf8");
  return { status: reply.status, json: text ? JSON.parse(text) : null };
};
const q = (o: Record<string, string>) => new URLSearchParams(o).toString();
const resume = async (first: Json): Promise<void> => {
  let next = first;
  for (
    let stops = 0;
    next.json?.packet?.kind === "stop" && stops < 20;
    stops += 1
  )
    next = await ask(
      "POST",
      `/api/resume?${q({ kind: "stop", pauseId: next.json.packet.pauseId })}`,
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

it(
  `${PLACE.name}: a loss wider than the campaign's poll is not called close`,
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
    let polled = false;
    let night: Json | null = null;
    for (let presses = 0; presses < 200 && !night; presses += 1) {
      await held();
      // A week of raising money, as the Campaign sheet's day does, then the
      // campaign's own poll a week before the vote, paid from what was raised.
      if (!polled && core.date >= "2025-10-20" && core.date < "2025-10-27")
        await resume(
          await ask(
            "POST",
            `/api/campaign/day?${q({ filingId, kind: "raise-money" })}`,
          ),
        );
      if (!polled && core.date >= "2025-10-27") {
        const bought = await ask(
          "POST",
          `/api/campaign/act?${q({ filingId, kind: "poll", sampleSize: "400" })}`,
        );
        expect(
          bought.json?.contacted,
          `${WHERE}: poll ${JSON.stringify(bought.json)}`,
        ).toBeGreaterThan(0);
        polled = true;
      }
      const before = core.date;
      await resume(
        await ask(
          "POST",
          `/api/advance?mode=${core.date < "2025-10-20" ? "week" : "day"}`,
        ),
      );
      if (core.date === before) await held();
      const read = (
        await ask("GET", `/api/election-night?${q({ id: PLACE.personId })}`)
      ).json;
      if (read?.contestId === PLACE.contestId) night = read;
    }
    expect(
      night?.resultMomentId,
      `${WHERE}: no scene of the result on election night`,
    ).toBeTruthy();
    const facts = raceReadFacts(core, PLACE.contestId, PLACE.personId);
    expect(
      Object.keys(facts).sort(),
      `${WHERE}: ${JSON.stringify(facts)}`,
    ).toEqual(["poll-wider", "recount-none"]);
    const momentId = night!.resultMomentId as string;
    const story = (await ask("GET", `/api/story?${q({ momentId })}`)).json;
    const talk = story?.talk;
    const at = (talk?.tree?.replies ?? []).findIndex(
      (reply: Json) => reply.line.text === "How close was it?",
    );
    expect(
      at,
      `${WHERE}: ${momentId} offers no "How close was it?"`,
    ).toBeGreaterThanOrEqual(0);
    await ask(
      "POST",
      `/api/story/reply?${q({ momentId, typeKey: talk.typeKey, path: String(at) })}`,
    );
    const answer = (talk.tree.replies[at].next?.lines ?? []).map(
      (line: Json) => line.text,
    );
    expect(answer.join(" "), `${WHERE}: ${momentId}`).not.toMatch(
      /close enough|closer than/i,
    );
    expect(
      answer.some((text: string) => WIDER.includes(text)),
      `${WHERE}: ${momentId} answered ${JSON.stringify(answer)}`,
    ).toBe(true);
    process.stdout.write(
      `${WHERE}: ${momentId} answered "${answer.join(" ")}" on ${facts["poll-wider"]!.sourceRecordIds.join(", ")}\n`,
    );
  },
  LIMIT_MS,
);
