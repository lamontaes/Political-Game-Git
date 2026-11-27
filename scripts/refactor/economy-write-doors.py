#!/usr/bin/env python3
"""Economy goal item 3: the cross-engine writes in Economy's files go through
the owners' write doors (Core's #10752 pattern).
- The people engine's file person-state.ts holds three writes on a person's row:
  `clearEndedJob`, `dropWorkGoal` and `recordActChosen`.
- job-lifecycle.ts (the jobs engine's writer) calls them in `endRecordedJob`, and
  gains `endClosedEmployerJob`: the block finance-state.ts ran for each job of a
  closing employer, moved here verbatim (it ends the job today even after a
  worked shift, never throws and refreshes staff before clearing the job, so it
  is not `endRecordedJob`).
- finance-state.ts calls it; work-attendance.ts records an act through
  `recordActChosen`.
Re-runnable: each edit prints applied, already or MISSED; a miss exits 1
without writing that file."""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
missed = []

def edit(path, pairs, imports=()):
    p = ROOT / path
    out = p.read_text()
    bad = False
    for n, (old, new) in enumerate(pairs, 1):
        if old in out:
            out = out.replace(old, new, 1)
            print(f"applied  {path} edit {n}")
        elif new == "" or new in out:
            print(f"already  {path} edit {n}")
        else:
            print(f"MISSED   {path} edit {n}")
            missed.append((path, n))
            bad = True
    if bad:
        return
    for line in imports:
        if line not in out:
            ms = list(re.finditer(r"^import [^;]*?;\n", out, re.M | re.S))
            at = ms[-1].end() if ms else 0
            out = out[:at] + line + "\n" + out[at:]
            print(f"applied  {path} import {line[:60]}")
    p.write_text(out)

# The closure's block, as finance-state.ts has it.
fs = (ROOT / "src/core2/finance-state.ts").read_text()
start = "  for (const jobId of endedJobIds) {\n    const job = core.jobs.get(jobId)!;\n    job.endsAt = core.date;\n"
if start in fs:
    i = fs.index(start)
    j = fs.index("\n  }\n", i) + len("\n  }\n")
    block = fs[i:j]
    inner = block[len("  for (const jobId of endedJobIds) {\n"):-len("  }\n")]
    inner = inner.replace("    if (actor.jobId === jobId) delete actor.jobId;\n", "    clearEndedJob(actor, jobId);\n")
    inner = inner.replace("      actor.goals.delete(`work:${commitment.id}`);\n", "      dropWorkGoal(actor, commitment.id);\n")
    inner = inner.replace("sourceId: sourceReceiptId,", "sourceId,")
    body = "\n".join(l[2:] if l.startswith("  ") else l for l in inner.split("\n"))
    door = f'''
/**
 * An employer closes and one of its jobs ends today (finance-state.ts's
 * closure). Not `endRecordedJob`: a closure ends the job today even after a
 * shift worked, never throws, ends every commitment of the job as it stands
 * and refreshes the office staff before the person's job is cleared.
 */
export function endClosedEmployerJob(
  core: CoreState,
  api: CoreAPI,
  jobId: string,
  sourceId: string,
): void {{
{body}}}
'''
    new_call = "  for (const jobId of endedJobIds)\n    endClosedEmployerJob(core, api, jobId, sourceReceiptId);\n"
    edit("src/core2/finance-state.ts", [(block, new_call)])
    # the door goes at the end of job-lifecycle.ts
    jl = ROOT / "src/core2/job-lifecycle.ts"
    t = jl.read_text()
    if "export function endClosedEmployerJob" not in t:
        jl.write_text(t.rstrip("\n") + "\n" + door)
        print("applied  src/core2/job-lifecycle.ts the closure door")
else:
    print("already  src/core2/finance-state.ts closure block")

edit("src/core2/finance-state.ts", [
    ('import { refreshOfficeStaff } from "./modules/campaigns";\n', ""),
], imports=['import { endClosedEmployerJob } from "./job-lifecycle";'])
edit("src/core2/job-lifecycle.ts", [
    ("  if (actor.jobId === jobId) delete actor.jobId;\n  refreshOfficeStaff(core, job.organizationId);\n  for (const commitmentId of core.work.commitmentsByPerson.get(actor.id) ??\n    []) {\n    const commitment = core.work.commitments.get(commitmentId)!;\n    if (commitment.jobId !== jobId || commitment.endsAt !== undefined) continue;",
     "  clearEndedJob(actor, jobId);\n  refreshOfficeStaff(core, job.organizationId);\n  for (const commitmentId of core.work.commitmentsByPerson.get(actor.id) ??\n    []) {\n    const commitment = core.work.commitments.get(commitmentId)!;\n    if (commitment.jobId !== jobId || commitment.endsAt !== undefined) continue;"),
    ("    actor.goals.delete(`work:${commitment.id}`);\n  }\n  api.observe(actor.id, {\n    key: `job:${jobId}:status`,\n    value: \"ended\",\n    learnedAt: core.date,\n    sourceId,\n    access: \"self\",\n  });\n}\n",
     "    dropWorkGoal(actor, commitment.id);\n  }\n  api.observe(actor.id, {\n    key: `job:${jobId}:status`,\n    value: \"ended\",\n    learnedAt: core.date,\n    sourceId,\n    access: \"self\",\n  });\n}\n"),
], imports=['import { clearEndedJob, dropWorkGoal } from "./person-state";'])
edit("src/core2/work-attendance.ts", [
    ("  nextActor.lastChoice = selectedId;\n  nextActor.lastReason = input.reasonKey;\n  nextActor.actCount = after;\n", ""),
    ("  nextActor.actsByKind = kinds;\n", "  recordActChosen(nextActor, {\n    lastChoice: selectedId,\n    lastReason: input.reasonKey,\n    actCount: after,\n    actsByKind: kinds,\n  });\n"),
], imports=['import { recordActChosen } from "./person-state";'])
if missed:
    print(f"{len(missed)} edit(s) missed; nothing written in those files.")
    sys.exit(1)
