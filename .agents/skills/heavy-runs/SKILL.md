---
name: heavy-runs
description: >
  How to run Our Civic Duty's long, memory-heavy runs in a cloud container
  (path-check, incumbency totals, speed:year over several years, the
  every-place replay) so that a run is not lost to memory, a restart or a moved
  branch: one heavy run at a time, the heap size, logs on stderr, the exit code
  in a file, and a result line that names its commit. Use before starting any
  run expected to take over ten minutes or 3 GB, and when a run seems to hang.
  Not for making a year faster (speed-work) or for what a proof must show
  (played-world-proof).
---

# Heavy runs

Learned by the path-check runners A and B and the speed lead, Oct 29 to Nov 1, and by the nightly 20-year game on Nov 10. The habits hold on any tool; the commands are plain shell. A path-check on a town of about 6,000 voters takes 1,200 to 3,700 seconds and holds 4 to 8 GB.

## Before the run

- **Cost a daily step before you add one** (`cadence-and-summaries`): a long run's growth is mostly what runs every day and what is never folded, and the daily register says which steps and tables those are.
- **One heavy run at a time** on a 15 to 16 GB container. A second one, or a long save beside it, gets killed for memory.
- **Give node 8,000 MB:** `NODE_OPTIONS=--max-old-space-size=8000` (or 8192). At 6,500, two of the three heaviest rows died with exit 134 (heap out of memory).
- **The heavy lock serializes heavy runs only.** Start no light test run, matrix regeneration or typecheck in another copy while an 8 GB run holds it: on Nov 1 the lenders test was killed with "Worker exited unexpectedly" and no heap message while such runs shared the container.
- **Two Montpelier-size worlds are the limit, with nothing beside them (Nov 9).** Two 5 to 7 GB worlds ran together; adding a `npm run typecheck` or one vitest file got one of them killed three times in a morning. Put every world through one queue (a folder of job scripts run in name order by one runner), and run tests or the typecheck only while at most one world runs.
- **A test keeps one world in memory at a time.** A helper that returns a world (`api`, `core`) keeps it alive while the next one plays; return the values the caller reads instead. On Nov 1 the public-finance test held two worlds at once and ran past node's default heap on 5 of 7 seeds once the medical bills added rows.
- **The nightly 20-year game (Nov 10).** `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" npm run long-game -- --years 20` plays a place drawn from all 56 and prints a table row a year (seconds, heap after a collection, records kept, the sense checks); a failed check, a crash or the time limit ends it with one `FAILED place=… key=… world-seed=… year N: …` line. It is one heavy world (8,000 MB heap), so queue it like any other.
- **Replay a red night by place and world seed:** `npm run long-game -- --place <key> --world-seed <seed> --years <the failing year>`, with both values from the `FAILED` line (the job summary shows them); the world seed there is `buildBenchWorld`'s own seed, not the run seed.
- **Pull the branch before every row,** and put `git log --oneline -1` in each result line. Branches moved under a run three times on Oct 30 to 31.

## During the run

- **Write the exit code to a file:** `node … > row.out 2> row.err; echo "$? $SECONDS" > row.done`. A bare `&` loses the exit code, and a killed run leaves none.
- **Log progress to stderr as it happens** (`LOG …` lines), with stdout and stderr in separate files per row. A run that dies with nothing printed tells you nothing.
- **Silence is not a hang.** Before calling a run stuck, read its memory (RSS) and when stderr last changed. Ringwood, New Jersey's race 2 (Nov 1) was one call living 22 months (to a petition due date) while the heap climbed from 567 MB to the 8 GB cap and the collector thrashed. That's memory, not a loop.
- **A container or worker restart kills every background run and its watcher.** After any restart, check `ps` and the `.done` files before starting anything new.
- **Do not resume a world from a snapshot to reproduce a crash.** `snapshotWorld` after a few simulated months is over 100 MB, past a year it is over `JSON.stringify`'s string limit (`RangeError: Invalid string length`), and a restored world is not the same world: the first day after a restore failed with "A drive act requires the actor's recorded drive" (Nov 1, Superior, Colorado). To reproduce a crash in year 3, rerun from the start and expect restarts to cost you a run; start the run right after one.

- **A memory gate checks only at the start.** A gate that waits for free memory before a run still lets the run grow beside another one. The container's memory limit then kills the biggest process: vitest says "Worker exited unexpectedly", a script exits 137, and `dmesg` shows an oom-kill. On Nov 1 a test file running two workers next to a 5 GB replay lost a worker, and a low-priority replay was killed twice in an evening while workflows tested. Rerun the killed file alone with `--maxWorkers=1`, and rerun long replays when the machine is quiet.
- **To swap a queue mid-run,** kill only the wrapper script by the PID you stored; let the node child finish, and have the replacement wait on that PID. Never `pkill -f <name>`: it matches your own shell (exit 144).
- **Wait on a run by its literal PID.** Record each run's PID when you start it and wait with `tail --pid=<pid> -f /dev/null`. A waiter that builds its list with `pgrep -f <script>` also matches its own shell, whose command line holds the same text, and then waits on itself until the background timeout: on Nov 4 a waiter sat an hour after both totals runs had finished. Check the `.exit` files before trusting a quiet waiter.
- **List a run's inputs by exact name.** A loop over `$F/chunk-*` also took the logs written beside the chunks (`chunk-00.r2.log`) as seed lists on the next run, and spent three chunks on junk seeds (Nov 2). Write logs to their own folder, or list the inputs (`chunk-0[2-8]`).

- **CI's heap is the default, about 2.2 GB.** Reproduce a CI out-of-memory with `env -u NODE_OPTIONS`. The container has no `/usr/bin/time`, so record a run's peak by polling its process tree's memory every two seconds: walk `pgrep -P` from the run's PID and sum `ps -o rss=`. On Nov 1, law-wiring-housing.test.ts died at the default heap on main and ran to the end on the closed-race fold.
- **Never switch branches in a copy that a run or an agent is reading.** The pool CLI checks out a temporary branch in the copy it runs in, so run pool commands from an idle copy.
- **A cloud copy is shallow, so `git fetch origin main` can pull hundreds of thousands of objects** (Nov 3: 385,472 objects, the pack grew to 4.1 GB, three minutes). Every `npm run pool` claim, `next` or status runs that fetch (`next` is the builder's way to take work, `docs/pool/START-A-BUILDER.md`). Batch pool edits into one commit on a branch made at `origin/main` (or the scratch-index method in `cto`) instead of one command per item, and start no browser or heavy run in that copy while a pool command runs.
- **The storage guard refuses the bench without the override** once free disk drops under its 25 GiB reserve: `[storage-guard] Refused test: needs 1.0 GiB, but only 0 B is usable`. Every command that starts the bench, including a `setsid nohup npm run bench` restart, carries `OCD_STORAGE_OVERRIDE`.
- **A "does it load" check of a probe is a world too.** Any script that imports the bench builds a whole world before its first line of output, so `timeout 60 node --import tsx probe.ts` beside a 20-year run and a probe was a third world, and the kernel killed the 20-year run at year 10 (Nov 10). Two worlds already running means no third, not even for a minute: check a new probe with `npx tsc --noEmit` or `eslint`, or start it only when a slot frees. The guards, `new-game-check` and any vitest that builds a world count the same (the same day, the guards beside two worlds killed both).
- **A watch on a log stays silent if any stage of its pipe buffers.** `tail -F log | grep --line-buffered X | cut -c1-200` delivered nothing for 30 minutes while the run wrote its year lines (Nov 10): `cut` holds its output until its buffer fills. Keep `grep --line-buffered` as the last stage (or put `stdbuf -oL` in front of every later stage), and when a watch is silent longer than one step of the run, read the log directly before assuming the run hung.
- **A push to main can lose a race.** Fetch, rebase and push again, and stay on the branch until the push lands. Switching away first loses the commit, which happened twice on Nov 1.

- **A long run beside helpers is killed without a word.** A 20-year game that reaches 2 GB by its last years died at year 11 (exit 137) with five helpers running tests on the same 16 GB machine, after 15 minutes of work (Nov 10). Start the long run when the helpers are done, or tell each helper to check `free -m` and wait under 3.5 GB available, and write the run's exit code to its output file so a kill is not read as a hang.

- **In a Claude cloud container, `free -g` does not show the limit that kills a run (Nov 12).** The limit that counts is the shared bash memory group, about 14.3 GB for every shell and helper together: read its use at `/sys/fs/cgroup/memory/process_api/*/claude-code-bash/memory.usage_in_bytes` and its limit at `memory.limit_in_bytes` beside it, and wait before a heavy run while less than 5 GB of that limit is free. A vitest worker that ends with "Worker exited unexpectedly" can have been killed for memory, but that message is generic (a SIGTERM or a crash prints it too): call it a memory kill only when `dmesg` shows a matching `oom-kill` line naming `oom_memcg=/process_api/.../claude-code-bash` at that time. Without that record, read the worker's exit and stderr and leave the failure unresolved. A confirmed memory kill is neither a test failure nor a pass: rerun the file alone when the group has room.

## After the run

- **Compare only like with like:** the same place, seed and key on both heads. Diff the outputs line by line first. Two heads that give identical output for a place (Salida on m5 and m6) mean the change did nothing there, so don't spend an hour reading them.
- **A crash in a measurement line** (m4's `b.appeal` of undefined): read the first stack frame in stderr and send `file:line` to the lead at once. The run's earlier `LOG` lines still carry the evidence.

## Stop condition

Done when every row has its `.done` file with an exit code and seconds, its result line names the commit, and any failure is reported with the stack frame or the memory reading that explains it.
