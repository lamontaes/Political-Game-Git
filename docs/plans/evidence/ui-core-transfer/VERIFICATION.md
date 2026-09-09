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
