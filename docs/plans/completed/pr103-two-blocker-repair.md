# PR #103 two-blocker repair

Completed implementation: 2026-09-06. Independent post-repair audit and owner
visual acceptance remain required; this is not merge acceptance.

Authority: Section H of `01_CURRENT_IMPLEMENTATION_PROMPTS — 2026-09-05`,
Drive document `1mnN8JXMsenaDMOXBr59FIqJlYGW5fpSlK1kOsNGm8Qo`.
Starting head: `e8a9569d71aa50103e84fcc9f188ed277cc83745`.

1. Preserve explicit working-document ownership; measure text is a fallback,
   never an inferred identity link. Regress unrelated filed measures.
2. Co-register office paper and transparent semantic target from one authored
   slot. Remove duplicate paper, preserve other controls and access contracts.
3. Verify focused/full tests, browser geometry and actual pointer/keyboard
   activation, representative screenshots and art gates. Push the existing
   PR branch; retain draft/open/unmerged status and independent audit gate.

LEARN: geometry containment inside a camera does not prove object identity.
Encode exact surface/target equality and separation from the briefing in the
browser regression rather than adding process prompts.

## Result and validation

The open document now retains `document-body` beside an unrelated filed,
unlinked measure (including a matching-title non-identity regression). All
other measure facts and empty states remain identical. No stable links are
invented. The desk slot owns both paper and transparent target geometry; its
paint order replaces the former paper button's layer. The target retains its
accessible name and activation and no longer inherits a global minimum height
or moves independently on hover/focus. The briefing remains untouched.

- Focused projection/binding/registry/visual-integration tests: 52 passed.
- Full `npm run validate`: 118 files, 1,858 tests passed, plus every other gate.
- Full Chromium browser confirmation: 249 passed (8.3 minutes), including 48
  new exact co-registration/separation and pointer/keyboard cases (16 viewport
  sizes × DPR 1, 1.25, 2). Dedicated identified strict-port 4173 server with
  reuse disabled; this preserves the existing touch test's hard-coded URL.
- `inventory:art` and `qa:art` passed; no art output included in the repair.
- Visual inspection: 1024×768, 1280×800, 1440×900, 1600×900, including DPR
  1/1.25/2. Paper stays clear of the briefing. Existing line truncation remains;
  full text is available through the accessible workspace. Screenshot capture
  now waits for plate decode so a loading frame cannot become visual evidence.
- `git diff --check`: clean.

Earlier attempts exposed two five-second timeouts under concurrent load, a
local report-path lint issue, the inherited button minimum-height mismatch,
the obsolete duplicate-title assertion, and a touch test's fixed port. These
were resolved and the complete confirmation above passed without retries.

Architecture/scope review: no simulation, data, art release, campaign,
bargaining, authored narrative, access ladder, binder-state, or measure-vote
projection changes. No other slot or existing briefing/person geometry changed.
The source checkout and its pre-existing evidence edits were not modified.
