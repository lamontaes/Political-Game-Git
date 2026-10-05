# Literal pin receiving audit and action-cluster retirement proposal

Read-only feature audit at main `d0da6a7830d107f3f04948074dcbe08d930b8741`. Label checkpoint: `5fe0c69ac6dfccef552e13065ab51915c06255d1`, PR #2160. No feature or action files were edited. No live UI or saves were read or changed.

## Literal pin inventory

Five remaining visible action buttons bypass the shared control:

| Source at inspected main | Visible text            | Existing writer / receiving owner                           |
| ------------------------ | ----------------------- | ----------------------------------------------------------- |
| PlayerGame.tsx:4384      | Pin/Unpin measure       | togglePin({kind: "measure", id}); T8                        |
| PlayerGame.tsx:4411      | Pin/Unpin assigned bill | same existing togglePin; T8                                 |
| ShellPinRail.tsx:326     | Unpin                   | dispatch({type: "unpin", key: pin.key}); shared shell owner |
| OfficeScene.tsx:143      | Pin person              | pin-person then dismiss-overlay; feature owner              |
| PinRail.tsx:110          | Unpin                   | unpin-person with personId/pinId; legacy rail owner         |

Accessible Pin/Unpin action names must remain. The two measure toggles can reuse PinToggle without a new writer. The rail removal buttons must retain menuitem role and their distinct existing unpin writers; do not replace them with an unrelated toggle action. OfficeScene's action does not currently receive pinned state: do not invent aria-pressed or swap its Run A writer for the shell writer. Forward these rows to their current owners for narrow presentation changes. Existing shared PinToggle callers require no visible-word edits.

## Exact T8 receiving hunks — candidate, NOT applied

Reuse PinIcon and the shared pg-pin-toggle hover/focus styles. Both measure callbacks, IDs, data-measure-id instrumentation and pressed-state reads are retained; the existing visible action expression moves to aria-label, and the item name becomes data-pin-label. These are receiving hunks only; T8 verifies composition and focused feature checks before applying. Category symbols are independent: owner approved distinct place/government symbols, but no exact selected asset pair was supplied with this packet; no new theme assets are authored here.

```diff
--- a/src/player/PlayerGame.tsx
+++ b/src/player/PlayerGame.tsx
@@ -88,7 +88,7 @@
 import { PublicServicePanel } from "./politics/PublicServicePanel";
 import { NewsDesk } from "./news/NewsDesk";
 import "./controls/controls.css";
-import { PinToggle } from "./controls/PinToggle";
+import { PinIcon, PinToggle } from "./controls/PinToggle";
 import { PlaceConditionsPanel } from "./PlaceConditions";
 import { MoneyLawsPanel } from "./MoneyLaws";
 import { PoliticsTabs, type PoliticsTab } from "./politics/PoliticsTabs";
@@ -4369,7 +4369,7 @@
             {workingBill && (
               <button
                 type="button"
-                className="ui-action"
+                className="ui-action pg-pin-toggle"
                 data-testid="pin-docket-measure"
                 data-measure-id={workingBill.measureId}
                 aria-pressed={pinnedRef({
@@ -4379,10 +4379,12 @@
                 onClick={() =>
                   togglePin({ kind: "measure", id: workingBill.measureId })
                 }
-              >
-                {pinnedRef({ kind: "measure", id: workingBill.measureId })
+                aria-label={pinnedRef({ kind: "measure", id: workingBill.measureId })
                   ? `Unpin ${workingName ?? "the measure you are working on"}`
                   : `Pin ${workingName ?? "the measure you are working on"}`}
+                data-pin-label={workingName ?? "the measure you are working on"}
+              >
+                <PinIcon />
               </button>
             )}
             {assignment ? (
@@ -4397,7 +4399,7 @@
                 </button>
                 <button
                   type="button"
-                  className="ui-action ui-action--rail"
+                  className="ui-action ui-action--rail pg-pin-toggle"
                   aria-pressed={pinnedRef({
                     kind: "measure",
                     id: assignment.measureId,
@@ -4406,10 +4408,12 @@
                   onClick={() =>
                     togglePin({ kind: "measure", id: assignment.measureId })
                   }
-                >
-                  {pinnedRef({ kind: "measure", id: assignment.measureId })
+                  aria-label={pinnedRef({ kind: "measure", id: assignment.measureId })
                     ? `Unpin ${assignmentName ?? "this bill"}`
                     : `Pin ${assignmentName ?? "this bill"}`}
+                  data-pin-label={assignmentName ?? "this bill"}
+                >
+                  <PinIcon />
                 </button>
                 {floorNote ? (
                   <p data-testid="floor-withheld">{floorNote}</p>
```

## Start now / Use your time — smallest safe receiving scope, NOT implementation

Measured routes:

- VenueActivityPanel.tsx:44 calls performVenueActivity(world, personId, activity.id); line 60 displays Start now for non-travel and goLabel for travel. It exposes refusal/timing and saves through onWorldChange.
- Its line 75 calls abandonUnperformableCommitment for entries admitted by venueActivities(...).abandonable. The writer records the choice, cancels the commitment and associated scheduled journeys, and spends no time or money (scheduled-activity-choice.ts:319–379).
- PlayerGame.tsx:5225–5232 mounts the entire Use your time cluster in Today. A second VenueActivityPanel mount at 4872 appears in StoryView only when completedActivityHere exists; removing only Today would leave Start now reachable after completion.
- CalendarWorkspaceSurface in ShellWorkspaces.tsx has the existing selected-event action group CalendarEventActions (1152). Its Attend/Stay through meeting route uses the existing runner and time-command writer (1313–1348), with campaign handling preserved. Calendar Decline (1390–1402) calls declineCalendarActivity.
- CommitmentSurface (1408) is read-only. PlayerGame's commitment-detail mount (3509) passes no mutation callback. Open event record therefore does NOT already offer perform/cancel.
- declineCalendarActivity (calendar-time-control.ts:236–280) has specific contact/campaign cancellation paths but rejects other confirmed commitments. It is not equivalent to abandoning an unperformable confirmed commitment.

Smallest safe removal is a coordinated receiving change in three UI files, preserving the existing presentation/time writers:

1. ShellWorkspaces.tsx: let the existing commitment detail reuse the existing selected-event action group with the same canonical runner/report/apply callbacks. Add the existing abandonable gate and abandonUnperformableCommitment callback for the selected unperformable commitment. Preserve refusal/timing, campaign routes and cancellation of associated journeys; no unconditional cancel or generic fabricated action.
2. PlayerGame.tsx (T8): pass the existing world/save callback and existing time preferences to commitment detail; remove only the Today Use your time section once that event route is reachable. Keep the existing pending-paper commitment links and calendar entry route.
3. VenueActivityPanel.tsx: remove the legacy actionable rows/Start now button only after the replacement event-detail route is admitted and checked. Retain completed-activity feedback for StoryView, or extract that existing feedback without a new layout. Retire imports only when unused.

Before deletion, focused proof must cover a performable commitment using the same time boundary; an unperformable confirmed blocking commitment with a reachable Give up action, recorded cancellation and related-journey release with unchanged clock/cash; save/reload; and absence of both legacy labels/mounts. Calendar Decline alone cannot satisfy this proof. No action changes or replacement layout are authorized by this read-only proposal, and none are implemented. No runtime check rerun for documentation-only inspection.
