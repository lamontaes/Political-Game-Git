# P3 / glossary underlines / draft #2228

Unapplied one-file click/touch candidate; no production source edits. Source main 0d7453f9de2f3dcf14ca75ee24eb4510cf6fa87a extracted read-only. GuideHighlighter.tsx and GuideTerm.tsx match the existing branch baseline; candidate passes git apply --check against both the branch and extracted main.

Existing GuideTerm is a keyboard/pointer control. GuideHighlighter uses CSS-highlight ranges, paints a tiny underline and opens hover previews; its onMove excludes touch and it has no click handler. Candidate adds one document click listener using existing rangeUnder, excluding SKIP_SELECTOR controls and non-primary/prevented clicks. It clears hover timers then invokes existing help.openGuide with the matched semantic key. No alternate glossary, knowledge writer, clock or scene engine.

Learned-state reducer, stored shell state encode/read and filters are existing code. Current focused baseline command: npx vitest run src/player/GuideSurfaces.test.tsx src/presentation/guide-preferences.test.ts. Result: 2 files PASS, 18 tests PASS, 20.10 seconds. This ran on #2228 baseline 049b8c797, not an applied patch. Those are markup/persistence tests, NOT browser click/touch/save-reload proof. Current main has only a removed legacy journal assertion difference in this test pair; this report does not claim tests executed on main.

Remaining proof after explicit implementation release: real new game random place; actual underline click and touch open the matched Guide entry; marking learned removes all occurrences; save/reload keeps them absent; explicit keyboard controls still work; no navigation from unrelated/action words; capture actual game screenshots. Existing candidate source is not READY.

Radial remains pending owner's column-versus-fan selection. P0 intro owner proof gates any new scene-side merge. No P1/P2 work claimed; request exact ownership from CTO before overlap. Production release decision routes to CTO: does P3 glossary's one-file repair have implementation release independently of pending radial pick? Until that is resolved this is a concrete reviewable candidate, not an applied behavior.

Formatting: prettier-terminal.txt contains the exact repository check across every branch-added path and this receipt; unsupported binary/Python/patch/text formats explicitly supplied and skipped by --ignore-unknown. No extra full suite.
