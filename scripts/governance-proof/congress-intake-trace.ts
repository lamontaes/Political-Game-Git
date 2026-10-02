/** Observe actual producer locals through V8, without changing actor choices. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { Session, type Debugger } from "node:inspector";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import { observerPlace } from "../../src/presentation/observer-world";
import { addDays } from "../../src/simulation/dates";
import {
  createObserverDayButton,
  openWatchedWorld,
  saveAndReopen,
} from "../dev-lab/world-aging";

const seed = process.argv[2] ?? "team2-numbering-month-20260930";
const output =
  process.argv[3] ?? "test-results/governance-proof/congress-intake-trace.json";
const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
if (execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim())
  throw new Error(
    "Publish a clean candidate before tracing the actual intake.",
  );
const session = new Session();
session.connect();
const post = <T>(method: string, params: Record<string, unknown> = {}) =>
  new Promise<T>((resolve, reject) =>
    session.post(method, params, (error, result) =>
      error ? reject(error) : resolve(result as T),
    ),
  );
let scriptId: string | null = null;
session.on(
  "Debugger.scriptParsed",
  ({ params }: { params: Debugger.ScriptParsedEventDataType }) => {
    if (params.url.endsWith("/src/simulation/governing/congress-lawmaking.ts"))
      scriptId = params.scriptId;
  },
);
await post("Debugger.enable");
if (!scriptId)
  throw new Error("The actual Congress producer script was not found.");
const { scriptSource } = await post<{ scriptSource: string }>(
  "Debugger.getScriptSource",
  { scriptId },
);
const stages = [
  {
    name: "entry",
    needle: "const seated=seatedCongressChamber(world,input.chamberKey)",
    expression: `({date:world.currentDate,chamber:input.chamberKey,intakeKey:input.intakeKey,seatedMembers:seatedCongressChamber(world,input.chamberKey)?.body.members.filter(m=>m.personId).length??0,alreadyFiledIds:(world.history.legislativeMeasures??[]).filter(m=>m.stableKey.startsWith(CONGRESS_LAWMAKING_VERSION+":")&&m.stableKey.endsWith(":"+input.intakeKey+":"+input.chamberKey)).map(m=>m.id)})`,
  },
  {
    name: "selection",
    needle: "if(!selected)return next",
    expression: `({date:next.currentDate,chamber:input.chamberKey,intakeKey:input.intakeKey,members:members.length,caucusMembers:caucus.length,caucusParty:caucus[0]?.partyKey??null,admittedQuestions:questions.map(q=>({id:q.propositionId,key:next.policyCatalog.propositions[q.propositionId].stableKey,issueKey:q.issueKey})),proposals:proposals.map(p=>({sponsorId:p.sponsor.personId,questionId:p.proposal.question.propositionId,questionKey:next.policyCatalog.propositions[p.proposal.question.propositionId].stableKey,answer:p.proposal.answer,pressure:p.pressure,score:p.proposal.principleScore,principleRecordIds:p.proposal.principleRecordIds,caucusBackers:caucus.filter(m=>m.personId!==player&&(p.proposal.answer==="yes"?principledLeaning(next,m.personId,p.proposal.question.propositionId).score:-principledLeaning(next,m.personId,p.proposal.question.propositionId).score)>0).length,chamberBackers:members.filter(m=>m.personId!==player&&(p.proposal.answer==="yes"?principledLeaning(next,m.personId,p.proposal.question.propositionId).score:-principledLeaning(next,m.personId,p.proposal.question.propositionId).score)>0).length})),selected:selected?{sponsorId:selected.sponsor.personId,questionId:selected.proposal.question.propositionId,answer:selected.proposal.answer,caucusBackers:selected.caucusBackers,chamberBackers:selected.chamberBackers}:null,questionDirections:questions.flatMap(q=>["yes","no"].map(answer=>({questionId:q.propositionId,questionKey:next.policyCatalog.propositions[q.propositionId].stableKey,answer,lawAnswer:statuteAnswer(lawInForce(next,NATIONAL_ELECTION_JURISDICTION.id,q.propositionId)),pending:pendingFederalBillOn(next,q.propositionId),senateRevenueExcluded:input.chamberKey==="senate"&&subjectClassFor(q.issueKey)==="revenue",caucusBackerIds:caucus.filter(m=>m.personId!==player&&(answer==="yes"?principledLeaning(next,m.personId,q.propositionId).score:-principledLeaning(next,m.personId,q.propositionId).score)>0).map(m=>m.personId),chamberBackerIds:members.filter(m=>m.personId!==player&&(answer==="yes"?principledLeaning(next,m.personId,q.propositionId).score:-principledLeaning(next,m.personId,q.propositionId).score)>0).map(m=>m.personId)})))})`,
  },
  {
    name: "mapped-compilation",
    needle: "if(!introduced)return world",
    expression: `({date:next.currentDate,chamber:input.chamberKey,questionId:question.propositionId,answer,compiled:introduced!==null,measureId:introduced?.measureId??null})`,
  },
  {
    name: "filed",
    needle: "return scheduleInstitutionStep(next,measure.id)",
    expression: `({date:next.currentDate,chamber:input.chamberKey,measureId:measure.id,designation:measure.designation,introducedAt:measure.introducedAt,actions:(next.history.legislativeActions??[]).filter(a=>a.measureId===measure.id).map(a=>({id:a.id,kind:a.kind}))})`,
  },
];
const installed = new Map<string, (typeof stages)[number]>();
const captures: { stage: string; snapshot: unknown }[] = [];
const captureErrors: string[] = [];
session.on(
  "Debugger.paused",
  ({ params }: { params: Debugger.PausedEventDataType }) => {
    const stage = params.hitBreakpoints
      ?.map((id) => installed.get(id))
      .find(Boolean);
    if (!stage) {
      session.post("Debugger.resume");
      return;
    }
    session.post(
      "Debugger.evaluateOnCallFrame",
      {
        callFrameId: params.callFrames[0]!.callFrameId,
        expression: stage.expression,
        returnByValue: true,
      },
      (error, result) => {
        const observed = result as
          Debugger.EvaluateOnCallFrameReturnType | undefined;
        if (error || !observed || observed.exceptionDetails)
          captureErrors.push(
            `${stage.name}: ${error?.message ?? observed?.exceptionDetails?.text ?? "No debugger result"}`,
          );
        else
          captures.push({
            stage: stage.name,
            snapshot: observed.result.value as unknown,
          });
        session.post("Debugger.resume");
      },
    );
  },
);
const locations: { stage: string; actualLocation: Debugger.Location }[] = [];
for (const stage of stages) {
  const at = scriptSource.indexOf(
    stage.needle,
    scriptSource.indexOf("function fileCongressBill("),
  );
  if (at < 0)
    throw new Error(`Actual producer boundary not found: ${stage.name}`);
  const preceding = scriptSource.slice(0, at);
  const location = {
    scriptId,
    lineNumber: preceding.split("\n").length - 1,
    columnNumber: preceding.length - preceding.lastIndexOf("\n") - 1,
  };
  const installedPoint = await post<{
    breakpointId: string;
    actualLocation: Debugger.Location;
  }>("Debugger.setBreakpoint", { location });
  installed.set(installedPoint.breakpointId, stage);
  locations.push({
    stage: stage.name,
    actualLocation: installedPoint.actualLocation,
  });
}
const started = performance.now();
const place = observerPlace(seed);
const watched = openWatchedWorld(seed, place.key);
const button = createObserverDayButton(watched.world);
const target = addDays(watched.world.currentDate, 60);
let days = 0;
let problem: string | null = null;
console.log(
  JSON.stringify({
    status: "opening",
    sourceHead,
    seed,
    place: place.displayName,
    target,
    locations,
  }),
);
while (button.world.currentDate < target) {
  if (performance.now() - started > 10 * 60_000) {
    problem = "Ten-minute trace bound reached.";
    break;
  }
  const step = button.press();
  if (step.status !== "moved") {
    problem = step.problem;
    break;
  }
  days += 1;
}
session.disconnect();
if (captureErrors.length) problem ??= "A producer-local observation failed.";
if (!captures.some((row) => row.stage === "selection"))
  problem ??= "No actual selection boundary captured.";
const save = await saveAndReopen(button.world);
if (!save.reopenedMatches) problem ??= "Save/Continue mismatch.";
if (
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() !==
    sourceHead ||
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()
)
  throw new Error("Runtime source changed during tracing.");
const receipt = {
  sourceHead,
  sourceDirty: false,
  seed,
  place: place.displayName,
  placeKey: place.key,
  from: watched.world.currentDate,
  through: button.world.currentDate,
  target,
  days,
  status:
    !problem && button.world.currentDate >= target
      ? "completed-trace-window"
      : "incomplete",
  generatedProducerSha256: createHash("sha256")
    .update(scriptSource)
    .digest("hex"),
  locations,
  captures,
  captureErrors,
  save: {
    reopenedMatches: save.reopenedMatches,
    saveMs: save.saveMs,
    reopenMs: save.reopenMs,
  },
  elapsedMs: performance.now() - started,
  problem,
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(receipt, null, 2));
console.log(
  JSON.stringify({
    status: receipt.status,
    days,
    through: receipt.through,
    captureStages: captures.map((row) => row.stage),
    captureErrors,
    output,
    problem,
  }),
);
process.exit(problem ? 1 : 0);
