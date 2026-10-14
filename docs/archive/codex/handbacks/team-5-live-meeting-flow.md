# Starting a public meeting opens the room

Starting a posted public meeting now opens the room before attendance is completed. The player can read the roster and agenda, speak, and choose when to finish. Three normal player routes reached open meetings in three places. The screen shows existing recorded ballots where they exist. Those ballots are not newly timed decisions, and the player's comment did not cause them. Meetings without a roll-call record say so.

## 1. Why-chain

On the checked main, Today could complete a public meeting without showing the room. Why? Its venue action used the ordinary attendance-completion path. Why? Opening the meeting was handled in a different calendar path. Why? That path entered the canonical meeting but could leave the calendar workspace visible. Why? Updating the world did not navigate back to the existing scene. Why? Arrival and completion shared an action name without a consistent entry boundary.

The terminal finding is that no player-visible meeting happened on that route. The repair separates actual arrival from explicit completion and uses the existing presence writer. The player selects speech from an offered action, and that writer records the selected words. Reading people, agenda, or ballots changes no world record.

The vote chain ends at existing generated legislative records. The ordinary agenda is an authored scenario about an extra evening in the public meeting room. Existing local vote decisions may already have occurred before player entry. This repair does not make those decisions occur in sequence during the meeting. It omits unscripted discussion, amendments, and a player comment changing members' votes.

## 2. Research

This is an observed player-route repair. It introduces no behavioral coefficient, empirical claim, new legal authority, or universal travel rate. The recorded schedule supplies the meeting start, end, and journey departure. The recorded serving government and actual sitting officers supply eligible people; residence outside the locality does not exclude a serving county officer.

The three-place walk does not certify county, town, or tribal authority over the agenda. Existing law traces remain separate. No hours or funding proposal is attached to this authored agenda, and the screen says that.

## 3. Revisions

Arrival opens the active scene. Only the explicit stay action completes attendance. Repeating entry leaves time unchanged. The in-room label identifies the remaining meeting duration rather than calling it travel.

Until needed reads an existing same-day departure before advancing past the meeting. Its stop names come from recorded activities or due-item transition names. Today removes a completed calendar item from Waiting on you and reads an actual current location, active chair, or next scheduled item for Now.

No new effects link or size was introduced. Per-world ranges are therefore not applicable to this display and action repair. Recorded journey durations remain the schedule's values.

## 4. What gets built

1. Keep one entry rule across Today, calendar, attendance commands, and the separate journey action. Arrival opens the existing meeting panel.
2. Keep an explicit finish command, ordered agenda reader, recorded-ballot reader, actual chair words, and the existing player-speech writer.
3. Keep same-day departure stops, in-room duration wording, and removal of completed waiting notes and filler.
4. Leave newly timed vote decisions and missing return-home endpoints for their canonical producers. Do not manufacture records in the screen.

## 5. Simulated, records, world pieces, checks

SIMULATED: the player chooses to attend and selects exact offered speech. Existing local members' recorded decisions remain unchanged. The player has no new voting authority.

RECORDS: journey arrival, prospective meeting presence, player speech, and explicit completion use existing canonical writers. Ballots are read from the matching recorded event date and actual present people.

WORLD PIECES: the existing resolver, meeting scene, calendar, Today, action runner, and meeting presence writer all exist on the source base. No recorded vote produces a plain absence message. No recorded home endpoint disables departure with its actual reason. No actual eligible officer produces no invented chair. Other resolver and compiler writers remain untouched.

CHECKS: normal pointer and keyboard entry, actual roster, four ordered agenda items, player speech, save, explicit completion, repeat-entry time, same-day departure stop, and disappearance of stale waiting copy. Three-place source tests also check that reading preserves serialized world bytes. These are action and record checks, not estimates of real-world outcomes.

## 6. Proof run

MERGED: this new repair has not been merged. Its source base is main 6bfc6f42719d36fdc74ca04c22004f8cba88a6bd. The previous day mount and morning-location repairs are already landed.

WHAT EMERGED: HARDWIRED, the entry and completion dispatch now use separate paths in venue-activity.ts, calendar-time-control.ts, and time-command.ts. DECIDED, each browser player selected the offered question: "What hours are proposed, and how would the extra evening be funded?" The existing speech writer stored that selection. No new person-money effect emerged.

The fresh identified Chromium run passed three cases in 1.6 minutes on exact clean source head 306cf9854da76ecf935c1b2de640dcded6926890. Source identity matched the absolute checkout, branch, head, and clean digest before opening. Seed prefixes are team5-live-meeting with place keys 3220700, 2537385, and 3556810. The normal creator supplied each world. No chair, roster, or world was injected.

Dyer, Nevada reached the room through Today Start now. Lunenburg, Massachusetts opened the calendar entry and activated its action with the keyboard. Picuris Pueblo, New Mexico used the journey action. Every case checked the active roster, four agenda items, recorded-roll-call surface, pointer and keyboard player speech, saving, and explicit completed aftermath.

Native desktop and phone screenshots are preserved under test-results/runs/team5-live-meeting-v2-20260930/results. Exact screenshot directories are:

- team5-live-meeting-flow-li-3df06--normal-route-3220700-today-chromium
- team5-live-meeting-flow-li-2b0c3-rmal-route-2537385-calendar-chromium
- team5-live-meeting-flow-li-73e25-ormal-route-3556810-journey-chromium

Each directory contains its place-key-open-meeting.png and place-key-open-meeting-phone.png. The run includes provenance.json and results.json. Native image review found readable agenda and action text, reachable controls, and no navigation overlay in the repaired phone captures. The panel scrolls; the first desktop view does not show its entire agenda. Existing actor placement and room art were not redesigned or approved by this repair.

The initial browser run failed three cases. Two expected active speech controls after completion, while the actual screen correctly showed completed aftermath. One waited for an absent calendar toggle even though the entry was visible. Those failures and captures remain under team5-live-meeting-20260930. The fresh run corrected those expectations and closed the navigation menu that the save helper leaves open.

The initial new source file passed nine cases. The existing option-adapter file failed in setup before six cases ran; the identical failure was reproduced on clean main. Its fixture assumes home while the recorded opening now places the player at work. The final source file passed nine cases in 131.39 seconds. Strict checking of the changed graph returned zero diagnostics, and changed-file lint and formatting passed. No assertion was removed from that existing test.

VITAL STATISTICS: three normal-player browser cases passed; six native open-meeting screenshots were captured; zero synthetic ballots or new effects rates were added. Full suite, independent helper review, newly timed voting, and public release were NOT RUN. No helper was created because the owner prohibited new teams. A Drive upload was rejected by automatic approval review for unestablished destination authorization; no upload succeeded or alternate upload was attempted.

## 7. Worked example

In Lunenburg, Rebekah Cortez opened the posted meeting through the calendar. Abigail Stanton chaired the room. William Whitfield and Thomas Cross were present. The screen read the existing Select Board record: three yes votes on ORD 1. Rebekah asked what hours were proposed and how the extra evening would be funded. The screen retained her words after saving. Selecting Stay through the meeting then produced the completed attendance outcome.

Dyer's Claire Hill entered through Today. Robert Murphy chaired, with Billy Sims, Eric Powell, Ryan Higgins, and Jared Greer present. No roll-call vote was recorded, so the room said so. Completion reported that discussion ended without a vote. These are generated people and recorded simulated events, not claims about real officeholders.

No dollar or month-by-month outcome follows from this action repair. The practical remaining links are canonical vote timing and missing return-home journey endpoints. Neither is concealed by the entry proof.

## Exact ownership and method

PlayerGame changes only the two Calendar onWorldChange callbacks. ShellWorkspaces changes only the explicit stay preview and submit action. OrdinaryMeetingPanel reads ordered agenda and existing ballots and submits explicit finish. The presentation files are venue-activity, calendar-time-control, time-command, quiet-stretch, ordinary-life, day-overview, day-opening-english, and ordinary-meeting-scene. The simulation hunk is ordinary-meeting-presence serving-officer eligibility and recorded speech. New files are live-meeting-flow.test.tsx and the matching browser spec, plus this handback and the dedicated release declaration. Team8 resolver files, compiler, central claims, setup customization, art, and prior dossier evidence remain preserved.

Feature-walkthrough and civic-reports were applied. The tested browser source commit is explicitly separate from publication bookkeeping. The pull request receipt records the published head, source-tree comparison, final scoped checks, and limits. Approval belongs to the CTO; only Merge may land an exact approved head.
