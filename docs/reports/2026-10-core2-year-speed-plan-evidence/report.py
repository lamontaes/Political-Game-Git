import json
from pathlib import Path
from statistics import median

root = Path(__file__).resolve().parent
receipts = [json.loads((root / f'{i}-receipt.json').read_text()) for i in range(3)]
analyses = [json.loads((root / f'{i}-analysis.json').read_text()) for i in range(3)]
names = [r['place']['name'] for r in receipts]
seconds = [r['elapsedMilliseconds'] / 1000 for r in receipts]
steps = [dict((row['name'], row['seconds']) for row in a['steps']) for a in analyses]
head = 'b2d5bd34ab8e42afa2000db5676a7f7048d6df29'
evidence = '2026-10-core2-year-speed-plan-evidence'
def source(path, line):
    return f'[{path}:{line}](https://github.com/lamontaes/Political-Game-Git/blob/{head}/src/core2/{path}#L{line})'
def cost(index, keys):
    return sum(steps[index].get(key, 0) for key in keys)
guards = ['Read recording', 'Read-log validation', 'Copying and freezing']
options = [
    ('Compact admitted read sets and shared immutable evidence', guards, .50, .80,
     f'{source("finance-plan.ts",171)} records reads; {source("finance-plan.ts",328)} replays them. Replace repeated payload traversal and detached validator views with typed fields and owner-admitted immutable handles. Keep descriptor, owner, Source, drift, and callback-boundary checks.'),
    ('Reduce temporary allocation and repeated deep copies', ['Garbage collection'], .40, .70,
     f'{source("work-attendance.ts",254)} detaches evidence. Reuse sealed results and small staged patches. GC saving overlaps the first option; the profile does not identify which allocations caused collection.'),
    ('Resolve and reuse one payroll-period context', ['Pay-period calculations','Payroll remainder'], .30, .60,
     f'{source("work-pay-period.ts",789)} resolves accrual; {source("work-payroll-cash.ts",1912)} rebuilds payroll Sources. Reuse revision-bound employer, worker, period, and source context through settlement, retaining rounding, arrears, ended-job debt, and changed-witness rejection.'),
    ('Use one attendance patch and validator view per occurrence', ['Attendance remainder'], .30, .60,
     f'{source("work-attendance.ts",547)} records attendance. Batch typed changes under the existing atomic writer and reuse the admitted preimage. This estimate excludes reads, copying, and period calculations already counted above.'),
    ('Reuse offers and scores only while their witnesses remain unchanged', ['Offer enumeration','Choice scoring'], .30, .60,
     f'{source("life.ts",197)} enumerates offers; {source("choice.ts",75)} scores them. Cache static affordance candidates and immutable trait inputs by revision. Invalidate on changed needs, relationships, law, occupied time, and offers; never reuse a stale decision.'),
    ('Carry compact postings and authority through one commit', ['Finance planning and authority','Journal posting and checks'], .20, .40,
     f'{source("journal-state.ts",1634)} completes a Source. Carry typed postings and resolved ownership instead of repeating preparation. Preserve finite funding, public authority, conservation, sequence, and final Source checks.'),
]
ranked = []
for title, keys, low, high, description in options:
    limits = [cost(i, keys) for i in range(3)]
    ranked.append((median(limits) * high,title,keys,low,high,description,limits))
ranked.sort(reverse=True)
lines = [
    '# A town year needs far more than a smaller read guard',
    '',
    f'Measured: Three town years took {min(seconds):.1f} to {max(seconds):.1f} seconds, against a 120-second target. Attendance, payroll, and garbage collection dominate. Read recording, validation, and copying account for about 48% of sampled time. Their complete removal would still leave every measured year over budget. \n\nProposed: Following the earlier debt map, prototype shared transaction context and reduced allocation first, then measure another full year.',
    '',
    '## Three completed years',
    '',
    'Measured: Each existing unattended clock advanced from January 1, 2021, to January 1, 2022: 365 days. These are full-year results, rather than a month multiplied by twelve. Initialization and advancement are timed; generation and profile serialization are outside that window.',
    '',
    '| Place | Generation seed | Year seconds | Advancement seconds | Times the two-minute target | Seconds to remove | Required reduction | Peak RSS MiB |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
]
for i,r in enumerate(receipts):
    s=seconds[i]
    lines.append(f'| {names[i]} | `{r["selected"]["seed"]}` | {s:.2f} | {r["advanceMilliseconds"]/1000:.2f} | {s/120:.2f}× | {s-120:.2f} | {(1-120/s)*100:.1f}% | {r["peakRssMiB"]:.1f} |')
lines += ['', 'Measured: Each year is one fresh, profiled process. There are no warmups or repeated annual medians. Sampling overhead is unmeasured, so these durations are profiled observations. Peak RSS includes imports, generation, input census, initialization, advancement, and profile capture.', '', '## Module time', '', 'Measured: Each retained sample belongs to exactly one row below. Garbage collection is separate because its samples do not identify the allocating module. These are weighted sampled seconds, not summed CPU time across processor threads.', '', '| Module or clock step | '+ ' | '.join(names) +' |', '| --- | ---: | ---: | ---: |']
module_names=sorted(set(row['name'] for a in analyses for row in a['modules']), key=lambda name:-median([next((row['seconds'] for row in a['modules'] if row['name']==name),0) for a in analyses]))
for name in module_names:
    values=[next((row['seconds'] for row in a['modules'] if row['name']==name),0) for a in analyses]
    lines.append('| '+name+' | '+' | '.join(f'{v:.2f}' for v in values)+' |')
lines += ['', '## Step time', '', 'Measured: This is a second partition of the same samples, not additional time. The deepest matching read, validation, copying, or collection frame takes priority. The nearest remaining operation supplies the broader step. The retained analyzer defines the assignments.', '', '| Step | '+ ' | '.join(names) +' |', '| --- | ---: | ---: | ---: |']
step_names=sorted(set(name for s in steps for name in s),key=lambda name:-median([s.get(name,0) for s in steps]))
for name in step_names:
    lines.append('| '+name+' | '+' | '.join(f'{s.get(name,0):.2f}' for s in steps)+' |')
lines += ['', 'Measured: Read recording, read-log validation, and copying together consume '+', '.join(f'{cost(i,guards):.1f} seconds ({cost(i,guards)/analyses[i]["totalSeconds"]*100:.1f}%) in {names[i]}' for i in range(3))+'.', '', 'Inferred: This supports the priorities in the [earlier speed debt map](2026-10-speed-debt-map.md). That map compared two sources over one month in another town. These annual samples use a later source and different worlds; the difference between those reports is not a measured regression or a causal improvement.', '', '## Monthly time and memory', '', 'Measured: The checkpoint columns below are advancement seconds / end-of-interval RSS MiB. The peak RSS figures above use the operating system high-water mark, which can exceed any checkpoint. Memory growth here does not establish a leak or identify an allocation source.', '', '| Through date | '+ ' | '.join(names) +' |', '| --- | ---: | ---: | ---: |']
for month in range(12):
    lines.append('| '+receipts[0]['months'][month]['throughDate']+' | '+' | '.join(f'{r["months"][month]["milliseconds"]/1000:.2f} / {r["months"][month]["rssMiB"]:.0f}' for r in receipts)+' |')
lines += ['', '## Ranked options and their limits', '', 'Estimated: No implementation was changed, so no saving below has been measured. The ranges apply explicit planning reductions to measured, exclusive buckets. They are sensitivity assumptions, not confidence intervals or validated forecasts. Ranking uses the median upper saving across the three towns; the table retains each town’s range.', '', '| Rank | Option | Measured buckets used for estimate | Assumed reduction of its buckets | '+ ' | '.join(names) +' |', '| ---: | --- | --- | ---: | ---: | ---: | ---: |']
for rank,(_,title,keys,low,high,description,limits) in enumerate(ranked,1):
    lines.append(f'| {rank} | {title} | {" + ".join(keys)} | {low*100:.0f}–{high*100:.0f}% | '+' | '.join(f'{v*low:.1f}–{v*high:.1f} s' for v in limits)+' |')
lines += ['', 'Inferred: GC benefits overlap allocation and representation changes. Function witnesses such as payroll Source completion also overlap the read, period, and copying buckets. Do not add their inclusive costs, or add the GC estimate to another estimate as though its cause were independent.', '']
for rank,(_,title,keys,low,high,description,limits) in enumerate(ranked,1):
    lines.append(f'Proposed {rank}: **{title}.** {description}')
    lines.append('')
lines += ['Measured: The actor-due scan is small in these profiles. Removing all of its sampled time would save '+', '.join(f'{next((row["seconds"] for row in a["modules"] if row["name"]=="Clock / due actors"),0):.2f} seconds' for a in analyses)+'. It is not the leading annual speed target.', '', '## What would have to close the gap', '', 'Estimated upper bound: Even deleting whole categories of necessary work leaves the following times. These are impossible-removal ceilings on savings, not proposed changes. They show why smaller read guards alone cannot meet the target.', '', '| Hypothetical remaining seconds | '+ ' | '.join(names) +' |', '| --- | ---: | ---: | ---: |']
for label,keys in [('Delete all read recording, validation, and copying',guards),('Also delete all garbage collection',guards+['Garbage collection']),('Also delete all period calculations',guards+['Garbage collection','Pay-period calculations'])]:
    lines.append('| '+label+' | '+' | '.join(f'{seconds[i]-cost(i,keys):.1f}' for i in range(3))+' |')
stretch=[]
for i in range(3):
    g=cost(i,guards);gc=cost(i,['Garbage collection']);remainder=seconds[i]-g-gc
    stretch.append(.10*g+.20*gc+.15*remainder)
lines += ['', 'Conditional planning scenario: A portfolio that removes 90% of read/validation/copy time, 80% of GC time, and 85% of all remaining time would leave '+', '.join(f'{stretch[i]:.1f} seconds in {names[i]}' for i in range(3))+'. This is a closure budget, not evidence that these reductions are achievable. It assumes additive elapsed savings and unchanged outcomes; profiler overhead remains embedded.', '', 'Proposed: Prototype shared owner-admitted immutable evidence and compact typed transaction patches first. Then reuse one revision-bound period and payroll Source context across attendance and settlement. Measure each against this pinned source before extending it to a batch under the same writer. Keep final mutation checks and callback invalidation.', '', 'Proposed: Repeat the full year after each substantial improvement. Preserve the Source-tampering, grouped-job, partial-payment, retry, ended-job-debt, chronology, rounding, and conservation cases. A matched M0 month comparison must enforce the existing 1.20 ratio; a month improvement alone cannot establish the annual target.', '', 'Unmeasured: No current option is proved to close the gap. The conditional portfolio needs prototypes to establish both savings and financial equivalence. Keep political playability and the money-year acceptance decision with their existing owners.', '', '## Method, guard, and resources', '', f'Measured: The fetched core head is `{head}`. The collection checkout is `{receipts[0]["revision"]}`; its additional commit contains documentation and tools only. All three receipts record the same source tree, `{receipts[0]["sourceTree"]}`. The collector rejects modified game source.', '', 'Measured: M0 guard files are retained byte-for-byte from `31cc98bb0b2c4d72cd1ef7243919232217ecb713`, under the evidence `guard/` directory. The collector calls its `prepareWorld` and the core’s unchanged opening-input budget checker. Annual advancement extends the guard’s month horizon without changing game code or guard policy.', '', '| Place | Residents | Opening MiB | Bytes per resident | Conservative Source share | Existing opening guard |', '| --- | ---: | ---: | ---: | ---: | --- |']
for i,r in enumerate(receipts):
    o=r['opening'];lines.append(f'| {names[i]} | {o["residents"]:,} | {o["bytes"]/1048576:.2f} | {o["bytes"]/o["residents"]:.0f} | {o["sourceShare"]*100:.2f}% | {"PASS" if o["budget"]["passed"] else "FAIL: "+"; ".join(o["budget"]["violations"])} |')
lines += ['', 'Measured: The unchanged limits are 80,554 bytes per resident and 74.9142% conservative Source share. No before/after source pair was measured, so this report does not claim a relative speed-guard pass. The guard’s paired warmup/three-run protocol and deadline were not used as an annual acceptance test.', '', 'Measured: The draw seed is `speed-plan-all56-2026-10-11-v1`. SHA-256 derives indexes into a sorted pool of all 56 jurisdictions without replacement, then a sorted, unfiltered locality pool. No redraw, population filter, smaller benchmark town, or behavior randomization was used. The generator retains the existing 10,000 minimum residents.', '', 'Measured: The route is the guard’s population, deep-past, civic-input, opening-peer, and actual focus-circle preparation, followed by `createLifeCore(input, {observer:false, scheduledWork:true})`. It advances the ordinary unattended clock in twelve calendar-month intervals. No synthetic speed module, active finance contract, or explicit player controller was installed.', '', 'Inferred from source: Work and life are the installed modules on this route. The population builder supplies employer capital and pay calendars, but no `input.finance` contract book. Customer-contract settlement, national political behavior, interactive choices, and realistic annual financial outcomes are outside this measurement. See '+source('population.ts',1022)+' and '+source('life.ts',95)+'.', '', 'Measured: Inspector samples at 10,000 microseconds around initialization and advancement. Generation, imports, census, and input hashing precede the timer. Tiny monthly checkpoint writes remain inside total elapsed time but outside advancement time. Serialization and gzip follow the timer. Sampled inspector-control stacks are excluded from the primary analysis.', '', 'Measured: The primary analyzer uses `timeDeltas[i]` and counts recursion once for inclusive witnesses. The October 10 summarizer, bucket, and tree tools are retained and used as cross-checks through M0’s profile-summary adapter. Their older next-sample delta convention can give slightly different totals; the primary partitions above use the current-sample delta consistently.', '', f'Measured: The host is `{receipts[0]["host"]["hostname"]}`, Linux x64, {receipts[0]["host"]["node"]}, {receipts[0]["host"]["cpu"]}, with {receipts[0]["host"]["cpuCount"]} visible CPUs, a four-CPU cgroup quota, and 16 GiB cgroup memory. The reused checkout and dependency install served all three processes sequentially. No world processes, tests, or builds overlapped.', '', 'Reproduce the retained draw and run each index sequentially under the storage guard:', '', '```sh', f'node --import tsx docs/reports/{evidence}/collect.mjs --draw', 'for run_index in 0 1 2; do', '  OCD_STORAGE_STATE_DIR=/workspace/.ocd-dev npm run storage -- run test -- \\', '    node --max-old-space-size=8192 --import tsx \\', f'    docs/reports/{evidence}/collect.mjs "$run_index"', 'done', f'node docs/reports/{evidence}/analyze.mjs', '```', '', 'Measured resources: GPT-6 (Codex). The runtime did not expose effort or token usage; no escalation was requested. The first retained setup clock is October 11, 2026, at 04:57:53 UTC. Exact collection windows and total observed elapsed time are recorded in the session receipt. Report review and validation are recorded separately.', '', 'Retained evidence:', '']
for i in range(3):
    lines.append(f'- {names[i]}: [year receipt]({evidence}/{i}-receipt.json), [CPU profile]({evidence}/{i}.cpuprofile.gz), [exclusive analysis]({evidence}/{i}-analysis.json).')
lines += [f'- [Draw]({evidence}/draw.json), [collector]({evidence}/collect.mjs), [analyzer]({evidence}/analyze.mjs), and [session receipt]({evidence}/session.json).', '', 'Measured validation and independent review: recorded in the session receipt and draft PR. Source changes: none. GitHub Project task claiming was denied by the integration; measurement and the single draft PR continued within the authorized scope.', '']
session_path = root / 'session.json'
if session_path.exists():
    session = json.loads(session_path.read_text())
    position = next(i for i, line in enumerate(lines) if line.startswith('Measured resources:'))
    lines[position:position] = [f'Measured time: The three profiled year windows totaled {session["totalProfiledYearSeconds"]:.2f} seconds ({session["totalProfiledYearSeconds"]/60:.2f} minutes). The retained setup-to-handoff preparation window was {session["observedSecondsThroughHandoffPreparation"]/60:.2f} minutes, including collection, analysis, checks, and report review. Earlier environment setup is outside that observed window.', '']
(root.parent/'2026-10-core2-year-speed-plan.md').write_text('\n'.join(lines))
