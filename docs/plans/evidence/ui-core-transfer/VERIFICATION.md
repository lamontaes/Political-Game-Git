# UI transfer verification

Logs and identified browser manifests are retained in `/private/tmp/ui-core-transfer-recovery`. Evidence below describes the tested checkpoint; future adapter merges require renewed combined-tree proof.

| Run                                            | Actual result                                                                                                                                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| initial typecheck                              | Invalid/failed: source dependency symlink write restriction and source edits during compile.                                                                                      |
| integrated typecheck, typecheck02, typecheck03 | Passed. Latest covers PEOPLE, shared handlers, save correction and ENV root gating.                                                                                               |
| initial shell startup                          | Failed before tests due protected-source Vite temporary write. Recipient dependencies copied into its own worktree.                                                               |
| shell tests local                              | 42 passed, before added privacy/portrait cases.                                                                                                                                   |
| focused03                                      | 47 passed, five files: shell-navigation, shell-projections, browser-shell-state, ui-core-person-visual, venue-activity.                                                           |
| browser01                                      | 22/24 passed; creator text-comparison mismatch and real pin-save ordering failure.                                                                                                |
| browser02                                      | Both reruns failed: test edit defect and reload before Save completion.                                                                                                           |
| browser03                                      | Both corrected creator/pin cases passed.                                                                                                                                          |
| adapters01 /02                                 | LIFE generic-calendar case passed; JUD label locator failed, corrected JUD Work/save case passed. Generic calendar proof later strengthened.                                      |
| mixed01                                        | Browser server denied sandbox bind; no tests executed.                                                                                                                            |
| mixed02                                        | Person/commitment/measure sizing, keyboard ordering, five-width close hit-testing and reload passed.                                                                              |
| adapters03                                     | Invalid overall source identity: art generators changed tracked reports during browser run. Two study-pin locator failures; one JUD case completed. Not combined acceptance.      |
| adapters04                                     | One failed exact-session assertion exposed an existing commitment conflict; one JUD passed, mixed interrupted, ENV not run.                                                       |
| adapters05                                     | Four passed (26.3s): LIFE exact study session after actual conflict resolution, JUD Work/save, all three pin types, ENV normal completion and stale-household suppression/reload. |
| env06                                          | One passed (9.0s): keyboard activity completion, actual civic-community-meeting-room backdrop/plate, 1440/960 screenshots and same-instant save/reload.                           |
| validate01                                     | Failed at imported recovery Markdown formatting; corrected. No full suite success claimed.                                                                                        |
| validate:art, inventory:art, qa:art            | Passed; 331 inventory items and generated QA report/contact sheet.                                                                                                                |

Visual inspection: mixed rail at960/1440 and venue aftermath inspected. Workspace close controls remain reachable; inherited dark hint text corrected. These checks are not human visual acceptance.

Outstanding proof: combined OPENING/MUNI/LEG adapters; final exact-head full validation/source/replay/build/demo; final combined browser smoke and title/opening/scene/dossier/Personal/Calendar/Work visual acceptance. No release activation or self-merge.

## Subsequent frozen LEG and transition proof

LEG80801a9 is integrated in merge8959726. Conflicts preserved both LIFE and LEG canonical source-availability checks, both stylesheet imports and the UI-owned root shell. Docket callbacks carry the actual selected bill; the pin control uses its exact measure ID. No physical travel or venue attendance is inferred from document/floor navigation.

- leg07 passed (6.9s): normal Custom office → Work → file document → saved selection/reload.
- leg08 passed (12.5s): additionally preserves the selected document's exact measure pin through reload.
- creator09 passed two tests (9.6s): named draft and next question survive Back; actual keyboard Begin crosses a once-guarded presentation fade before generation. Title screenshots at1440/960 inspected.
- typecheck-leg04/05 passed. Source validation passed (with pre-existing data warnings); source replay regenerates all tracked artifacts byte-identically. Production build passed with chunk-size warnings. Headless validation-seed demo passed.
- Combined corpus generated with1884 templates, zero hard errors; latest live scanner60021 literals/415files and1914 inventoried sentences. Existing anchor bindings/issuance files unchanged. Review warnings and unclassified prose are not editorial acceptance.

Selected screenshots and source/browser provenance are retained in `browser/`; full logs/traces remain in the identified temporary evidence root. These are screenshots of existing released art and canonical test lives, not new production assets or human acceptance.

OPENING and MUNI immutable checkpoints, final combined full-suite/browser proof and human acceptance remain outstanding. Historical raster error/placeholder findings remain explicitly unresolved under UI ownership.

## UI-CONNECT2

Current packet read in full after fetching latest heads. Preserved pre-existing
four-file correction checkpoint as710f6ee; NEWS7829d055 merged at84897bc.
NEWS adds only its frozen canonical publication/history, panel/help, typed person
and existing headline-slot adapters. UI's `publishLegislativeTransition` composes
new completed public legislative actions from explicit Docket/Legislation
callbacks; it never runs on News reads, load, opening an existing docket, or
unrelated public records. The normal route remains `/`.

Staff diagnosis is reproduced, not inferred from CI: unchanged original test
passes at accepted main1eb0b0d (1 selected,32 not selected,8.49s); fails at frozen
LIFE5d142e7 (same0/active/550 assertion,8.87s). Composed2cc6188 full run reproduced
both CI assertions:3473 passed,2 failed,2 skipped. One Collins worker receives
65 available minutes in550→615: earlier brief65, later summary0. By690 both
finish, brief90 plus summary50 equals140 elapsed minutes. LIFE's explicit
cross-assignment test includes unbound work. Runtime allocation is preserved;
only the misleading eligibility comment and compatibility expectations changed.
Corrected focused placement/D-Lite39 tests pass; subsequent NEWS combined run
passes those39 plus NEWS5. The first new publication test correctly found no
person on an institutional referral, so final linked-person proof uses an
actual draft filing with its recorded sponsor, without inventing participation.

Placement bounds use authored usable seat/floor anchors with positive footprint,
not a3/4 runtime cap: test checks real anchor membership, pose kind, canonical
input identity, uniqueness, under-capacity and overflow, and no-art calibration.

Browser evidence: news10 failed wrong focus target and pre-fade helper timing;
news11 ENV passed (including no overlap at960 and reload), News reached sponsor
but Back focus failed; news12 Back passed but second manual Save was absent.
UI fixes retain the existing save method for later saves, guard duplicate clicks,
show Saving before completion, and restore linked-person focus after mount.
news13 passes actual normal filing→publication→News→recorded sponsor→Back/help→
repeat Save→reload with identical saved World bytes after reads (22.2s).
Original assertions, real pointer/keyboard activation and timeouts retained.
Screenshots inspected:960 aftermath clears identity; News readable. Human visual
approval is pending. Browser provenance retains exact head plus dirty source
fingerprint, so these are not misrepresented as clean final-head proofs.

Verified ancestry: frozen P2R2 0f294a8 and P01 54d81be are absent from this UI tree;
origin/main remains1eb0b0d. Campaign repair is pending LAND's explicit delivery,
not claimed repaired. OPENING and MUNI remain owned, unpublished adapters; they
do not block this delivered News connection. No branch merge to main, release
activation, new prototype, interview system, or monitoring occurred.

### Final UI-CONNECT2 gates

Clean tested head24f0a518fcc7c3e5b4044895a1853d2de48fa8e6; expected and served
sourceDigest3f5a2508aed639f21023c013ea3a7ada06f87596b76cf5eca35cc5e0e61d9bdb.
Format/lint/typecheck passed. Full unit run:199 files passed,2 failed;
3476 tests passed,6 failed,2 skipped (465.52s). All six failures were explicit
localhost `listen EPERM`, not assertions or timeouts. Unchanged infrastructure
files rerun with local-server permission:6/6 passed (3.99s). Both original CI
assertions pass. No whole-run-green claim replaces this exact result.

Source validation passed with existing declared-source warnings; source replay
was byte-identical; production build and validation-seed demo passed. Build
retains its chunk-size warning. Art validate/inventory/QA passed,331items.
Clean-head combined browser final14:31/31 passed, no retries, covering creator,
LIFE/JUD, mixed pins, ENV, docket, News, actual person/Talk targets, keyboard,
Back/Escape, pure reads, save/reload and desktop1920/1600/1366/1280/1024.

Logs and hashes are retained in `connect2/`; final browser provenance/screens
in `browser/`. News screenshot is1280x720, reflecting Chromium's project
viewport override; the original temporary filename1440 was misleading and the
future filename now uses the actual viewport width. This artifact-name-only
test change does not alter test behavior or production source.

UI-CONNECT2 is code-complete and locally verified. Outstanding: fresh published
head hosted CI result and human visual acceptance. Separate original-phase
integration remains: LAND's #129/#135 prerequisites, OPENING's canonical opening
adapter, and MUNI's newly received frozen364176be candidate (owner final checks
and PR still pending). MUNI and ENV supplied the exact root venue callback;
no sourcebinding gap is claimed, and normal MUNI registration/proof is still
pending UI integration. Historical raster-error/placeholder findings stay open.
