# Measure watched-world years

The command advances the real observer clock in 30-day steps, stopping at exact yearly anniversaries. Each row prints simulation seconds and SHA-256 of the real saved payload. Annual saving and hashing happen outside the year timer. The default scenario is South Fork, Pennsylvania (`4272168`), seed `b18-f375512c`.

Run only after the coordinator grants an exclusive host window. `--exclusive` records that assertion; it does not stop another application or establish exclusivity by itself. Use the repository storage wrapper for these heavy jobs. Team 1 currently owns `package.json`, so the npm entry is pending its merge. The direct candidate route is:

```sh
npm run storage -- run test -- node --max-old-space-size=4096 --import tsx scripts/speed-years/run.ts --seed b18-f375512c --years 10 --place 4272168 --exclusive --out test-results/speed/main.json --checkpoint test-results/speed/year8.json --checkpoint-year 8
```

A baseline may include this timing tool on top of main. The receipt records the actual checkout head and separately records `sourceMain` only when all tracked and untracked files under `src` and `data` match current `origin/main`. A changed source cannot claim that baseline identity. Preserve both references in the handback.

For the required year-nine CPU profile, resume the baseline's saved eighth year on the same simulation source. Saving and hash work appear in the profile but are excluded from the year timer:

```sh
npm run storage -- run test -- node --cpu-prof --cpu-prof-dir=test-results/speed --cpu-prof-name=year9.cpuprofile --max-old-space-size=4096 --import tsx scripts/speed-years/run.ts --seed b18-f375512c --place 4272168 --years 9 --from test-results/speed/year8.json --exclusive --out test-results/speed/profile-year9.json
node scripts/speed-years/profile.mjs test-results/speed/year9.cpuprofile
```

The summarizer aggregates repeated call frames by function and source location and prints the 25 functions with greatest inclusive time and the 25 with greatest self time. Inclusive time includes samples in descendants, counting a recursive function once per sample. Frame locations use V8's source locations; no heap snapshot is created.

The latest owner-approved speed proof advances one watched month in less than 15 seconds. Coordinate the timing window with the root before launching: Team 1 and Team 3 full simulations must acknowledge their reversible pauses. Focused tests, changed-file type checks and lint need no queue.

```sh
npm run storage -- run test -- node --max-old-space-size=4096 --import tsx scripts/speed-years/month.ts --out test-results/speed/candidate-month.json --before test-results/speed/baseline-month.json --limit 15
```

The comparator hashes every complete person in person order, every decision packet and evaluation, and every recorded event. Only `sequence` and `historySequenceExclusive` are removed from decision/event hashes. Changed people, choice facts or event results fail. The comparison file lists each changed decision sequence/cutoff with its unchanged choice. Full saved-world fingerprints are also retained. History-write order differences are accepted only under the owner's explicit batch exception and must be disclosed in the PR. The older two-year proof is superseded for this priority repair.

The month tool accepts `--root` so a preserved copy can capture the baseline from an exact old source head in this same registered workspace. Never edit simulation files under a live run. Preserve the branch checkpoint before switching; do not create another source copy.

The normal local gate accepts a separate three-year main receipt and the exact focused test paths. It checks changed-file formatting, lint and TypeScript dependencies, release declarations, zero dice, focused tests and the three-year speed budget. It runs neither the full unit suite nor browser suites. A semantic change may deliberately change fingerprints; this batch repair requires the explicit month comparison above.

```sh
npm run storage -- run test -- node scripts/local-gate.mjs --baseline test-results/speed/main-three-years.json --tests scripts/speed-years/compare.test.ts
```

Keep receipts and CPU profiles outside tracked evidence. A checkpoint holds a full save payload and can be large. Its metadata is written next to it as `<checkpoint>.meta.json`; keep both files together. No cleanup is automatic in this tool.
