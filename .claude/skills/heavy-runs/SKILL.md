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

Learned by the path-check runners A and B and the speed lead, Oct 29 to Nov 1. A path-check on a town of about 6,000 voters takes 1,200 to 3,700 seconds and holds 4 to 8 GB.

## Before the run

- **One heavy run at a time** on a 15 to 16 GB container. A second one, or a long save beside it, gets killed for memory.
- **Give node 8,000 MB:** `NODE_OPTIONS=--max-old-space-size=8000` (or 8192). At 6,500, two of the three heaviest rows died with exit 134 (heap out of memory).
- **Pull the branch before every row,** and put `git log --oneline -1` in each result line. Branches moved under a run three times on Oct 30 to 31.

## During the run

- **Write the exit code to a file:** `node … > row.out 2> row.err; echo "$? $SECONDS" > row.done`. A bare `&` loses the exit code, and a killed run leaves none.
- **Log progress to stderr as it happens** (`LOG …` lines), with stdout and stderr in separate files per row. A run that dies with nothing printed tells you nothing.
- **Silence is not a hang.** Before calling a run stuck, read its memory (RSS) and when stderr last changed. Ringwood, New Jersey's race 2 (Nov 1) was one call living 22 months (to a petition due date) while the heap climbed from 567 MB to the 8 GB cap and the collector thrashed. That's memory, not a loop.
- **A container or worker restart kills every background run and its watcher.** After any restart, check `ps` and the `.done` files before starting anything new.
- **To swap a queue mid-run,** kill only the wrapper script by the PID you stored; let the node child finish, and have the replacement wait on that PID. Never `pkill -f <name>`: it matches your own shell (exit 144).

## After the run

- **Compare only like with like:** the same place, seed and key on both heads. Diff the outputs line by line first. Two heads that give identical output for a place (Salida on m5 and m6) mean the change did nothing there, so don't spend an hour reading them.
- **A crash in a measurement line** (m4's `b.appeal` of undefined): read the first stack frame in stderr and send `file:line` to the lead at once. The run's earlier `LOG` lines still carry the evidence.

## Stop condition

Done when every row has its `.done` file with an exit code and seconds, its result line names the commit, and any failure is reported with the stack frame or the memory reading that explains it.
