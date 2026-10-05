# The clerk can explain recorded filing requirements

The clerk conversation now uses the shared scene family and conversation path. It requires an active recorded clerk job and an actual encounter at that clerk's recorded office. A job alone, a home encounter, or an ended clerk job does not admit the conversation. This adapter is ready for integration review; the player visit flow and election proof remain open.

## What is implemented

Measured: five tests across two files passed. The tests cover office presence, home rejection, ended employment, shared conversation commits, retained English parts, save continuation, and recorded speaker traits. Evidence: `docs/codex/evidence/session13-2026-10-05/clerk-adapter/tests.txt`.

The public adapter is `bindElectionClerkConversation(world, playerPersonId, clerkPersonId)` in `src/presentation/election-clerk-conversation.ts`. It records a dated scene binding after checking current recorded presence. The reader `electionClerksForPerson` supplies actual job and presence references. `electionClerkOffices` reads the existing qualification and calendar readers; `fileThroughElectionClerk` rechecks eligibility and delegates to the existing filing writers.

The additive family uses `scene-election-clerk` and the existing `isContextualSceneProgress` dispatch. No additions to the closed subject or progress unions were needed. The only conversation response hook appends the composed clerk's retained English parts tag for this family. Recorder and commit implementations are unchanged. Evidence: the additive changes in `src/presentation/contextual-scenes.ts` and `src/presentation/contextual-scene-families.ts`.

The speaker-traits helper and its test were received exactly from Session 4's published tree at `e3092642a6e9060e508466b13eefd454c3a6614f`. Clerk replies use `GroundedEnglishPacket` and `composeGroundedLine`. The assembled requirements reply passed the grounding command and independent grounding review. This was an authored unit fixture; it is not real-game visual evidence.

## What remains open

The player visit entry point, conversational district selection, turnout, election-night reporting, and the two-place election proof remain open. There is no READY claim. The original full-proof memory failure receipt remains in the draft pull request.

## Method and limits

Focused tests ran against the current working adapter. Typecheck still reports the four existing opening-preparation fixture errors; it reports no clerk errors. The requirements fixture used recorded office presence and an actual dated qualification snapshot. The prose artifacts are `docs/codex/evidence/session13-2026-10-05/clerk-adapter/grounding-packet.txt` and `docs/codex/evidence/session13-2026-10-05/clerk-adapter/grounding-output.txt`.
