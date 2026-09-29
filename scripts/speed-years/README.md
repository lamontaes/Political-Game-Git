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

The latest owner-approved priority proof starts again from the opening. Both year 1 and year 2 saved-world fingerprints must equal the preserved baseline, and year 1 must take less than 60 seconds. `--coordinated` records the authorized shared timing window without claiming an empty host. Up to two other authorized heavy jobs may coexist with this run:

```sh
npm run storage -- run test -- node --max-old-space-size=4096 --import tsx scripts/speed-years/run.ts --seed b18-f375512c --place 4272168 --years 2 --coordinated --out test-results/speed/candidate.json --baseline test-results/speed/main-fresh-stopped-two-years.json --identical --target
```

The normal local gate accepts a separate three-year main receipt and the exact focused test paths. It checks changed-file formatting, lint and TypeScript dependencies, release declarations, zero dice, focused tests and the three-year speed budget. It runs neither the full unit suite nor browser suites. A semantic change may deliberately change fingerprints; the speed repair requires `--identical` separately.

```sh
npm run storage -- run test -- node scripts/local-gate.mjs --baseline test-results/speed/main-three-years.json --tests scripts/speed-years/compare.test.ts
```

Keep receipts and CPU profiles outside tracked evidence. A checkpoint holds a full save payload and can be large. Its metadata is written next to it as `<checkpoint>.meta.json`; keep both files together. No cleanup is automatic in this tool.
