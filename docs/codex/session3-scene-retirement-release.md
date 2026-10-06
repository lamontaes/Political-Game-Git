# Narrow meeting/guidance retirement and opening foreground release

Session 3 releases the following consumer hunks to Session 4 in response to scope request 6007394060. This extends the prior chat release; it does not grant whole PlayerGame ownership. No code is changed by this document.

Exact inspected actual-main source: `c76514832e9c866b5cf5967206bed554b6a1e88e`. All lines below refer to that immutable source, not the older reported 209/2543 offsets.

| Consumer | Released scope |
| --- | --- |
| PlayerGame.tsx:210 | Retire OrdinaryMeetingPanel import when its last mount is removed. |
| PlayerGame.tsx:2551 | Retire OrdinaryMeetingPanel and its immediately enclosing scene/readOnly/orientation/conversation gate (2544–2560). Preserve actual meeting producers, attendance, NPCs, time, authority and saved return in the shared played-scene path. |
| PlayerGame.tsx:137 | Retire CandidateGuidancePanel import when its last mount is removed. |
| PlayerGame.tsx:2564 | Retire CandidateGuidancePanel and its immediately enclosing gate (2561–2572). Replace rejected guidance/button-grid entry through the approved shared scene, retaining canonical writers and resulting state. |
| PlayerGame.tsx:2574 | Bounded OpeningLifeFlow invocation: pendingLife/availability/open/close and foreground wiring through 2655. Connect approved shared scene foreground and transition handoff here; preserve World/person identity, onWorldChange, focus return, orientation and existing navigation/save continuity. |
| PlayerGame.tsx:966 | Bounded transition completion handoff: after createOpeningLifeController.finishTransitionWithProgress returns the game, route NEW beats to the shared scene path before the first room. Preserve cancellation/error handling, canonical world construction and startPlaying identity/seed. Coordinate this neighboring loading consumer with Sessions 2/7 before changing it. |
| opening-life/OpeningLifeFlow.tsx:34–81 | Replace NEW-beat consumption through currentOpeningLifeScene/LifeScenePanel with approved shared foreground. Keep an explicit compatibility route for already recorded canonical opening scenes in old saves; do not fill new beats through that legacy path. |

The legacy currentOpeningLifeScene reader and LifeScenePanel writer contracts remain compatibility dependencies until Session 4 proves old-save continuation. This release does not authorize erasing recorded episodes, relabeling old saved beats as new scenes, changing serialization, or adding a parallel engine. Other Personal/workspace LifeScenePanel mounts are outside this bounded release. Reader/writer changes belong to Session 4's checked specification and must be named separately.

Required evidence: new opening beats use shared foreground rather than the fixed legacy selection; an old canonical save still continues without losing World records or return state. Meeting scenes retain actual participants, attendance, time and authority. Rejected meeting/chat panels do not become accepted merely because historical tests pass. Reuse existing English, images and conversation records. No fixed scene list or invented history.

Session 3 retains narrow politicsTabs availability and screen styles. Sessions 2/14 retain shell and composition ownership; Session 9 retains Personal extraction. Coordinate neighboring active edits before implementation. Future code PRs target actual main. CTO retains merge authority.

Method: Read-only git-show inspection of fetched actual main at the named source. No replacement consumer, save compatibility check, browser scene or runtime PASS is claimed. Original screen refs and evidence are preserved.
