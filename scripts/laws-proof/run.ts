import { prepareCommonCondition, prepareMatchedHazard } from "./conditions";
import {
  DC_GOVERNMENT_KEY,
  ensureDistrictOfColumbiaCouncilOpening,
} from "../../src/simulation/nationwide-world/district-of-columbia-council-opening";
import { municipalGovernmentJurisdictionId } from "../../src/simulation/municipal-public-work";
import { territorialProofPack } from "./territorial-packs";
import { randomBytes, createHash } from "node:crypto";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import { SeededRng } from "../../src/simulation/rng";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { townRoster } from "../../src/simulation/living-world/town-residents";
import { legislatureForState } from "../../src/simulation/legislature-game-profile";
import {
  municipalGovernmentByKey,
  municipalGovernmentForLifePlace,
  municipalRulePackFor,
} from "../../src/simulation/municipal-government";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../../src/simulation/national-election-geography";
import { US_CONGRESS_PACK_ID } from "../../src/simulation/congress-rule-pack";
import { questionPowersRow } from "../../src/simulation/governing/question-authority";
import { lawInForce } from "../../src/simulation/governing/law-in-force";
import { lawEffectPaths } from "../../src/simulation/governing/law-effect-paths";
import {
  legislativeRulePackForWorld,
  regularSessionDateStatus,
  regularSessionYearForWorld,
} from "../../src/simulation/legislative-procedure-world";
import { advanceObservedWorld } from "../../src/presentation/observer-world";
import {
  openWatchedWorld,
  createObserverDayButton,
  anniversary,
} from "../dev-lab/world-aging";
import { assertWorldIntegrity } from "../../src/simulation/world";
import { prepareLawPair } from "./enact";
import {
  lawCalibrationReadings,
  lawCalibrationValues,
  worldMovement,
  type MeasuredMovement,
} from "./measure";

function sourceFingerprint(): string {
  const paths = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8" },
  )
    .split("\0")
    .filter(
      (path) =>
        path === "package.json" ||
        (/^(src|scripts|data\/research)\//.test(path) &&
          /\.(ts|json|mjs)$/.test(path)),
    )
    .sort();
  const hash = createHash("sha256");
  for (const path of [...new Set(paths)]) {
    hash.update(path);
    hash.update("\0");
    hash.update(readFileSync(path));
    hash.update("\0");
  }
  return hash.digest("hex");
}
const fingerprint = sourceFingerprint();
interface Result {
  sourceFingerprint: string;
  law: string;
  seed: string;
  place: string;
  status: "PASS" | "FAIL";
  problem?: string;
  movements: readonly MeasuredMovement[];
  days?: number;
  effectiveYear?: string;
  calibration?: ReturnType<typeof lawCalibrationReadings>;
  paths: readonly string[];
  condition?: string | null;
  placeSelection?: string;
}
const args = process.argv.slice(2);
const option = (key: string) => {
  const index = args.indexOf(key);
  return index < 0 ? undefined : args[index + 1];
};
const catalog = createProductionPolicyCatalog();
const questions = catalog.propositionOrder.map(
  (id) => catalog.propositions[id]!,
);
const output = resolve("test-results/laws-proof", fingerprint.slice(0, 12));
mkdirSync(output, { recursive: true });
if (args.includes("--worker")) {
  const law = option("--law")!,
    seed = option("--seed")!,
    file = option("--result")!;
  let placeName = "NOT OPENED";
  let result: Result;
  try {
    const question = questions.find((p) => p.stableKey === law);
    if (!question) throw Error(`Unknown law ${law}`);
    const rng = new SeededRng(seed);
    const reach = questionPowersRow(law)?.levels;
    const level =
      reach?.includes("federal") && law.startsWith("us-federal-positions:")
        ? "federal"
        : reach?.includes("state")
          ? "state"
          : "municipality";
    const allStates = lifePlaceStateIdentities();
    const placesFor = (stateKey: string) =>
      searchLifePlaces("", 5000, { stateJurisdictionKey: stateKey }).filter(
        (p) =>
          p.scope !== "state" &&
          townRoster(p.context.jurisdiction.id).population > 0 &&
          (level !== "municipality" ||
            (() => {
              const government = municipalGovernmentForLifePlace(p);
              return government !== null && municipalRulePackFor(government).ok;
            })()),
      );
    // All 56 places are considered. A local-law sample must have an actual
    // recorded local legislature: a census settlement is not itself a government.
    const eligibleStates =
      level === "municipality"
        ? allStates.filter(
            (state) => placesFor(state.jurisdictionKey).length > 0,
          )
        : allStates;
    if (!eligibleStates.length)
      throw Error(
        "No recorded local legislative route is available for this question",
      );
    const state = rng.pick(eligibleStates);
    const candidates = placesFor(state.jurisdictionKey);
    const small = candidates.filter(
      (p) =>
        p.scope === "locality" &&
        townRoster(p.context.jurisdiction.id).population >= 500 &&
        townRoster(p.context.jurisdiction.id).population <= 5000,
    );
    const place = rng.pick(small.length ? small : candidates);
    placeName = place.displayName;
    const opened = openWatchedWorld(seed, place.key);
    let world = ensureNationalElectionJurisdiction(opened.world);
    let jurisdiction =
      level === "federal"
        ? NATIONAL_ELECTION_JURISDICTION
        : level === "state"
          ? stateJurisdictionForKey(state.jurisdictionKey)!
          : place.context.jurisdiction;
    let rulePackId: string;
    if (level === "federal") rulePackId = US_CONGRESS_PACK_ID;
    else if (level === "state" && state.usps === "DC") {
      world = ensureDistrictOfColumbiaCouncilOpening(world);
      const council = municipalRulePackFor(
        municipalGovernmentByKey(DC_GOVERNMENT_KEY)!,
      );
      if (!council.ok) throw Error("The D.C. Council procedure is incomplete");
      rulePackId = council.pack.packId;
      jurisdiction =
        world.jurisdictions[
          municipalGovernmentJurisdictionId(world, DC_GOVERNMENT_KEY)!
        ]!;
    } else if (level === "state") {
      const statePack =
        legislatureForState(state.jurisdictionKey) ??
        territorialProofPack(state.jurisdictionKey);
      if (!statePack)
        throw Error("No recorded legislative route serves this place");
      rulePackId = statePack.packId;
    } else {
      const government = municipalGovernmentForLifePlace(place);
      if (!government)
        throw Error(
          "No recorded local government serves the randomly selected place",
        );
      const pack = municipalRulePackFor(government);
      if (!pack.ok)
        throw Error("The local government's procedural reading is incomplete");
      rulePackId = pack.pack.packId;
    }
    const pack = legislativeRulePackForWorld(world, rulePackId);
    // A closed biennial session is honored. Both arms begin after the same real-clock preparation.
    let warmup = 0;
    while (
      !regularSessionYearForWorld(
        world,
        jurisdiction.id,
        Number(world.currentDate.slice(0, 4)),
      ) ||
      ["outside-regular-session-year", "past-outer-limit"].includes(
        regularSessionDateStatus(pack, world.currentDate).kind,
      )
    ) {
      if (++warmup > 730)
        throw Error("No legal regular session opened within two years");
      world = advanceObservedWorld(world, 1);
    }
    // Real starting law stays in the opened world. The shared legal repeal supplies the requested "without" counterfactual when the law already exists.
    if (lawInForce(world, jurisdiction.id, question.id)?.answer === "yes")
      world = prepareLawPair(world, {
        jurisdictionId: jurisdiction.id,
        rulePackId,
        propositionId: question.id,
        sponsorPersonId: opened.anchorPersonId,
        advance: advanceObservedWorld,
        compiledLevel: level,
        answer: "no",
      }).treated;
    const common = prepareCommonCondition(
      world,
      law,
      state.jurisdictionKey,
      place.context.jurisdiction.id,
    );
    const pair = prepareLawPair(common.world, {
      jurisdictionId: jurisdiction.id,
      rulePackId,
      propositionId: question.id,
      sponsorPersonId: opened.anchorPersonId,
      advance: advanceObservedWorld,
      compiledLevel: level,
    });
    const end = anniversary(pair.control.currentDate, 1);
    const controlReadings = new Map<string, Readonly<Record<string, number>>>();
    const firstEffectDates: Record<string, typeof world.currentDate> = {};
    const run = (initial: typeof world, label: string) => {
      const button = createObserverDayButton(initial);
      let days = 0;
      const observe = () => {
        const readings = lawCalibrationValues(button.world, law);
        if (label === "control")
          controlReadings.set(button.world.currentDate, readings);
        else {
          const baseline = controlReadings.get(button.world.currentDate);
          for (const [key, value] of Object.entries(readings))
            if (
              !firstEffectDates[key] &&
              baseline?.[key] !== undefined &&
              value !== baseline[key]
            )
              firstEffectDates[key] = button.world.currentDate;
        }
      };
      observe();
      while (button.world.currentDate < end) {
        const moved = button.press();
        if (moved.status !== "moved") throw Error(`${label}: ${moved.problem}`);
        observe();
        if (++days % 30 === 0)
          console.log(`${law} ${placeName}: ${label} ${days} days`);
      }
      assertWorldIntegrity(button.world);
      return { world: button.world, days };
    };
    const control = run(
        prepareMatchedHazard(
          pair.control,
          law,
          state.usps,
          place.context.jurisdiction.id,
        ),
        "control",
      ),
      treated = run(
        prepareMatchedHazard(
          pair.treated,
          law,
          state.usps,
          place.context.jurisdiction.id,
        ),
        "enacted",
      );
    const movements = worldMovement(control.world, treated.world);
    const calibration = lawCalibrationReadings(
      control.world,
      treated.world,
      law,
      pair.control.currentDate,
      firstEffectDates,
    );
    const outsideBand = calibration.some(
      (row) => row.assessment.status === "FAIL",
    );
    const unavailableCalibration = calibration.some(
      (row) => row.assessment.status === "unavailable",
    );
    result = {
      sourceFingerprint: fingerprint,
      law,
      seed,
      place: placeName,
      status:
        movements.length && !outsideBand && !unavailableCalibration
          ? "PASS"
          : "FAIL",
      ...(outsideBand
        ? { problem: "Recorded outcome falls outside its calibration band" }
        : unavailableCalibration
          ? {
              problem:
                "Calibration cohort or first outcome-change date unavailable",
            }
          : movements.length
            ? {}
            : { problem: "No measured money or residents moved" }),
      days: treated.days,
      effectiveYear: pair.control.currentDate.slice(0, 4),
      calibration,
      placeSelection: `Considered all 56 places; ${eligibleStates.length} have the recorded government route used by this question. Actual town is selected randomly within that scope.`,
      condition:
        common.condition ??
        (law === "us-federal-positions:emergencies.states-share-disaster-costs"
          ? "Matched fictional catastrophic flood, applied identically after enactment. No hazard incidence is inferred."
          : null),
      movements,
      paths: lawEffectPaths()
        .filter((p) => p.questionKey === law)
        .map((p) =>
          p.kind === "outcome-web"
            ? `src/simulation/outcome-web/index.ts (${p.via})`
            : p.via,
        ),
    };
  } catch (error) {
    result = {
      sourceFingerprint: fingerprint,
      law,
      seed,
      place: placeName,
      status: "FAIL",
      problem: String(error),
      movements: [],
      paths: [],
    };
  }
  writeFileSync(file, JSON.stringify(result, null, 2) + "\n");
  process.exit(result.status === "PASS" ? 0 : 1);
}
const seed = option("--seed") ?? randomBytes(16).toString("hex");
const selected = option("--law")
  ? questions.filter((p) => p.stableKey === option("--law"))
  : questions;
if (!selected.length)
  throw Error("No catalog law matches the requested filter");
const results: Result[] = [];
const date = new Date().toISOString().slice(0, 10);
const report = resolve(
  `docs/evidence/laws-proof-${date}${selected.length === 92 ? "" : `-partial-${selected[0]!.stableKey.replaceAll(/[^a-z0-9.-]/gi, "_")}`}.md`,
);
mkdirSync(resolve("docs/evidence"), { recursive: true });
const table = () => {
  const failures = results.filter((r) => r.status === "FAIL");
  const lines = [
    "# Law enactment proof",
    "",
    `Source SHA-256: ${fingerprint}. Seed: ${seed}. ${selected.length === 92 ? "Full 92-law run" : "PARTIAL diagnostic run"}. Completed ${results.length} of ${selected.length}; ${failures.length} failures.`,
    "",
    "Failures:",
    "",
    ...failures.map((r) => `- ${r.law}: ${r.problem?.replaceAll("\n", " ")}`),
    ...(failures.length
      ? []
      : ["None among completed laws. Uncompleted laws are NOT RUN."]),
    "",
    "| Law | Year effective | Place | What moved | How much | Path file |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const r of results) {
    const moved = [...r.movements].sort(
      (a, b) => Math.abs(b.amount) - Math.abs(a.amount),
    );
    lines.push(
      `| ${r.law} | ${r.effectiveYear ?? "NOT RUN"} | ${r.place} | ${
        r.status === "FAIL"
          ? "FAIL: " + r.problem
          : moved
              .slice(0, 5)
              .map((m) => m.account)
              .join("; ")
      } | ${
        r.status === "FAIL"
          ? "NO RESULT"
          : moved
              .slice(0, 5)
              .map(
                (m) =>
                  `${m.amount.toFixed(m.unit === "dollars" ? 2 : 0)} ${m.unit}`,
              )
              .join("; ")
      } | ${r.paths.join("; ")} |`,
    );
  }
  lines.push(
    "",
    ...results
      .filter((r) => r.condition)
      .map((r) => `- ${r.law}: ${r.condition}`),
    "",
    "Location sampling considers all 56 places; local-law draws are restricted to a recorded local government with an available rule pack. Census settlements are not silently treated as governing bodies. Each arm uses the ordinary Day clock for one anniversary year. Legal common preparation precedes the intervention when a session is closed. Controlled passage votes establish the treatment; they do not establish autonomous legislative support. Receipts retain every measured account delta. Budget figures are government books; cash transfers are separately measured. Prices, percentages, prose and elapsed time do not count as movement.",
    "",
  );
  writeFileSync(report, lines.join("\n"));
};
table();
const jobs = Number(option("--jobs") ?? "2");
if (!Number.isInteger(jobs) || jobs < 1 || jobs > 2)
  throw Error(
    "--jobs must be 1 or 2; each worker owns one independent matched world pair.",
  );
const runOutput = resolve(
  output,
  createHash("sha256").update(seed).digest("hex").slice(0, 12),
);
mkdirSync(runOutput, { recursive: true });
let cursor = 0;
const activeWorkers = new Set<ReturnType<typeof spawn>>();
try {
  await Promise.all(
    Array.from({ length: Math.min(jobs, selected.length) }, async () => {
      while (cursor < selected.length) {
        const question = selected[cursor++]!;
        const file = resolve(
          runOutput,
          `${question.stableKey.replaceAll(/[^a-z0-9.-]/gi, "_")}.json`,
        );
        console.log(
          `PROVING ${question.stableKey}; seed ${seed}:${question.stableKey}`,
        );
        if (sourceFingerprint() !== fingerprint)
          throw Error(
            "Source changed during the proof; completed receipts cannot certify the changed source.",
          );
        const child = await new Promise<{ error?: Error }>((done) => {
          const worker = spawn(
            process.execPath,
            [
              "--import",
              "tsx",
              resolve("scripts/laws-proof/run.ts"),
              "--worker",
              "--law",
              question.stableKey,
              "--seed",
              `${seed}:${question.stableKey}`,
              "--result",
              file,
            ],
            { stdio: "inherit" },
          );
          activeWorkers.add(worker);
          worker.once("error", (error) => {
            activeWorkers.delete(worker);
            done({ error });
          });
          worker.once("exit", (code, signal) => {
            activeWorkers.delete(worker);
            if (signal || code === null)
              done({
                error: Error(
                  `Proof worker stopped: ${signal ?? "no exit code"}`,
                ),
              });
            else if (!existsSync(file))
              done({
                error: Error(`Proof worker exited ${code} without a receipt`),
              });
            else done({});
          });
        });
        const result: Result = child.error
          ? {
              sourceFingerprint: fingerprint,
              law: question.stableKey,
              seed: `${seed}:${question.stableKey}`,
              place: "NOT OPENED",
              status: "FAIL",
              problem: String(child.error),
              movements: [],
              paths: [],
            }
          : JSON.parse(readFileSync(file, "utf8"));
        if (
          result.sourceFingerprint !== fingerprint ||
          sourceFingerprint() !== fingerprint
        )
          throw Error(
            "Source changed while a law was being proved; rerun against stable source.",
          );
        if (result.seed !== `${seed}:${question.stableKey}`)
          throw Error("A worker receipt belongs to a different run seed.");
        results.push(result);
        results.sort(
          (a, b) =>
            questions.findIndex((q) => q.stableKey === a.law) -
            questions.findIndex((q) => q.stableKey === b.law),
        );
        table();
      }
    }),
  );
} catch (error) {
  for (const worker of activeWorkers) worker.kill("SIGTERM");
  throw error;
}
console.log(
  `${results.filter((r) => r.status === "PASS").length} of ${selected.length} laws moved measured money or people; report ${report}`,
);
process.exit(results.some((r) => r.status === "FAIL") ? 1 : 0);
