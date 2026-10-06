# Session 127

Current item: b24-p1-s1. Branch: codex/session127-b24-p1-s1.
Base: ae27b4da00da3d9391a9d4c34776f1ef28f436cc on main.

Read main standing rules, POOL, AGENTS.md, INTERFACES.md and applicable local-gate
instructions. Claim delivered to #2424 in comment 6018789180; Session 11 boundary
question and Session 10 acknowledgment delivered in comment 6018831691.

The independent native-PNG measurement harness is built. Production assemble.ts
and source art are unchanged: the supplied checked-in front cells reproduce no
near-white rim. Direct measurement of both presentations, average build, casual
outfit, standing and seated gave 0 edge-ring pixels at thresholds 215, 225 and
235 over RGB(12,12,12). These are measured results, not visual approval.

Executed full new test: 4 passed / 4 failed. The failures are all requested
three-quarter cells falling back to front. The checked-in manifest's two
three-quarter entries have empty faces/hair arrays, no outfits and no seated
bodies. No complete immutable private pack is supplied in this environment.
PEOPLE_PACK_ROOT selects its directory when available; native dimensions are
checked. The harness refuses to count fallback output as turned-view evidence.

The npm install and network-enabled agent preflight completed. The first default
sandbox preflight could not spawn git; repeating with network-enabled execution
resolved it. No READY, rim fix, private-art QA, installed runtime, merge or Steam
action is claimed. Exact inputs were requested on #2424 in comment 6018953167.

Next: obtain the complete pack, reproduce the fringe, repair only the composite
rim, and run the full eight-cell test. Continue the independent queue meanwhile,
checking each id for an open cloud-task PR and preserving one writer per region.

Exact next command (from /workspace/game, with subprocess execution enabled):

```sh
OCD_STORAGE_STATE_DIR=/workspace/session127-storage npm run storage -- run test -- npx vitest run src/presentation/appearance-engine/composite-rim.test.ts
```

To run the same harness against supplied immutable inputs, prefix the command
with PEOPLE_PACK_ROOT set to the directory containing their manifest.json and
native PNGs. Terminal receipts are /tmp/session127-rim-test.log and
/tmp/session127-install.log; baseline native previews are /tmp/session127-before-*.
