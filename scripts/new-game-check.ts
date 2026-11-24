// The one check before a merge (owner, Nov 3, ruling 2): "a new game opens and
// runs briefly without crashing; nothing else holds a merge."
//
// It goes through the game's own request handler, the same routes the screen
// calls: a new life in a town drawn from all 56 places, then a few weeks of play.
// The town comes from a replay number printed first, so a failure can be
// replayed on the same town against main to see whose fault it is (ruling 3):
//   npm run new-game-check -- <replay number>
// With no replay number one is drawn. Exit 0 is a pass; any crash or refused
// request is exit 1 with the route, the replay number and the error.
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { benchRequest } from "../src/bench/handler";

/** Weeks of play after the opening; "briefly" is a month. Engineering value, not a model value. */
export const WEEKS = 4;

/** Stops one week may hold before the check calls it stuck. Engineering value, not a model value. */
const MAX_STOPS = 50;

type PacketView = { kind?: string; pauseId?: string };
type Step = { route: string; status: number; body: string; seconds: number };

async function call(method: string, route: string): Promise<Step> {
  const started = performance.now();
  const reply = await benchRequest(method, new URL(route, "http://localhost"), {
    developer: false,
  });
  const body =
    typeof reply.body === "string"
      ? reply.body
      : Buffer.from(reply.body).toString("utf8");
  return {
    route: `${method} ${route}`,
    status: reply.status,
    body,
    seconds: (performance.now() - started) / 1000,
  };
}

/** Plays a new game on one replay number. Returns the steps and the first failure, if any. */
export async function newGameCheck(
  replay: string,
  weeks = WEEKS,
): Promise<{ place: string; steps: Step[]; failure: Step | null }> {
  const steps: Step[] = [];
  let place = "";
  let personId = "";
  const opened = await call(
    "POST",
    `/api/newlife?seed=${encodeURIComponent(replay)}`,
  );
  steps.push(opened);
  if (opened.status !== 200) return { place, steps, failure: opened };
  try {
    const reply = JSON.parse(opened.body) as {
      placeName?: string;
      personId?: string;
    };
    place = String(reply.placeName ?? "");
    personId = String(reply.personId ?? "");
  } catch {
    return { place, steps, failure: { ...opened, body: "not JSON" } };
  }
  console.log(`New game check: place ${place || "(unnamed)"}`);
  // A week of play may stop for something that needs the player (a scene, a
  // notice); the screen's Continue resumes it, and so does this check. An open
  // choice lets time go on, as on the screen.
  for (let week = 0; week < weeks; week++) {
    let step = await call("POST", "/api/advance?mode=week");
    steps.push(step);
    let cleared = false;
    for (let stops = 0; step.status === 200; stops++) {
      const packet = (JSON.parse(step.body) as { packet?: PacketView }).packet;
      if (!packet || packet.kind === "complete" || packet.kind === "choice") {
        cleared = true;
        break;
      }
      if (stops === MAX_STOPS)
        return {
          place,
          steps,
          failure: {
            ...step,
            body: `stuck: ${MAX_STOPS} stops in one week never cleared (last ${packet.kind})`,
          },
        };
      step = await call(
        "POST",
        `/api/resume?pauseId=${encodeURIComponent(packet.pauseId ?? "")}`,
      );
      steps.push(step);
    }
    if (step.status !== 200 || !cleared) return { place, steps, failure: step };
  }
  // The player's own scene now, and the journal, as the screen asks for them.
  for (const route of [
    `/api/scene?id=${encodeURIComponent(personId)}`,
    "/api/journal",
  ]) {
    const step = await call("GET", route);
    steps.push(step);
    if (step.status !== 200) return { place, steps, failure: step };
  }
  return { place, steps, failure: null };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const replay =
    process.argv[2] ||
    process.env.NEW_GAME_REPLAY ||
    randomBytes(8).toString("hex");
  console.log(`New game check: replay number ${replay}`);
  let code = 0;
  try {
    const { place, steps, failure } = await newGameCheck(replay);
    for (const s of steps)
      console.log(`  ${s.route}: ${s.status} in ${s.seconds.toFixed(1)} s`);
    if (failure) {
      console.error(
        `New game check FAILED at ${failure.route} (${failure.status}), place ${place || "unknown"}, replay number ${replay}:\n${failure.body.slice(0, 2000)}`,
      );
      code = 1;
    } else
      console.log(
        `New game check passed: ${place}, replay number ${replay}, opened and played ${WEEKS} weeks.`,
      );
  } catch (error) {
    console.error(
      `New game check CRASHED, replay number ${replay}:\n${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
    );
    code = 1;
  }
  process.exit(code);
}
