---
name: crew-coordinator
description: >
  How one session runs a builder crew for Our Civic Duty from a work list on a
  crew issue: one session per lane and a watcher, the loop of light and full
  checks, relaying lines between lanes, reading the checks on every pull request
  posted ready, sending reds back, keeping lanes from stopping, and the hourly
  status with one merge list for the CTO; also a lead session that owns one
  family's matrix. Use when started as a coordinator or a lead, or told to run
  lanes from a crew line. Not for merging (merger) or ruling (cto); a
  coordinator never merges, rules or writes player lines.
---

# Coordinating a builder crew

First used Nov 16, 2026, on crew line #9747: six lanes and a watcher, 20 pull requests in the first 90 minutes. The coordinator builds nothing in the game. Its work is that every lane has work, every line reaches the session it is for, and the CTO gets one honest list.

## Opening the crew

- Read the whole work list first. Give each lane its section word for word, the rules, its branch prefix (`claude/<lane>-<topic>`), the order inside its section, and where lanes meet (who owns the screen files; who posts "for Screens" before pushing to one).
- One session per lane, on the model the list names; say on the line which model you chose where the list is silent, and how to change it.
- Post the roster on the crew line: lane, section, model, session id.
- Open a watcher on the smallest model. Every 10 minutes it reads the crew line and, for a new line that starts "CTO:", messages the coordinator and each lane the line names. It keeps the highest comment id it has seen in a file and schedules its own next tick.
- **Have the watcher relay lane-to-lane lines too.** Give it the map of lane names to sessions and three rules: a "CTO:" line goes to the coordinator and every lane it names; a line of the form "<name>: for <lane>:" goes to that lane; a "CTO:" line with "every lane" or "folded" goes to all. It passes on the comment's id and first lines, never a summary, and reads every thread the crew uses. Until it does this, a line from one lane to another reaches nobody unless the coordinator relays it.

## The loop

- **Light check, about every 10 minutes:** watch the crew's branches and main with `git ls-remote` in one bounded wait. A push means a lane is alive. Main moving means the CTO merged something: read what (`git log`, `git diff --stat`) and tell the lanes it touches the same minute.
- **Full check, about every 20 to 30 minutes:** a small helper reads the crew line's new comments (ids above the last one read), saves them to a file, and returns one line per comment plus the whole body of any "CTO:", "for the owner", "for the CTO" or "for the Coordinator" line. The same helper lists the crew's open pull requests with their heads and check counts.
- **Sessions list, with the full check:** a lane that is idle with nothing scheduled has stopped. Read its last message and wake it with its next item.
- Keep a running notes file: each read's last comment id, each ready pull request with its full head, each open question and who holds it.

## What goes wrong, and the fix

- **A lane posts "ready" before GitHub's checks finish.** On Nov 16, thirteen pull requests were listed ready and none was green. Rule for the crew: a pull request is ready only when its checks have finished green, or each red is named in its stamp as red on main too. The coordinator reads the checks itself before it puts a pull request on the merge list, and posts a correction the minute a list was wrong.
- **One red on many pull requests is usually main.** Five `guards` reds were one British spelling in a skill merged an hour earlier. Read one failing log before sending five lanes to look; then tell every lane the commit on main that fixes it.
- **A message to a lane in the middle of a long turn waits until the turn ends.** Three top-model lanes sat on red pull requests for 45 minutes because the message that named the red was queued behind their work. A message sent to join the running turn (`next`) did not land either. Send anything red with the priority that interrupts the turn (`now`), say in it that the interrupt is on purpose and that background runs are untouched, and check ten minutes later that the head moved. Two of three heads moved within four minutes. Ask each lane to end its turn at every natural break so the next message can reach it.
- **The crew's own pushes back up GitHub's checks.** With 28 pull requests open, none had finished its checks two hours in. Lanes push once per unit, and never to a pull request whose checks are running unless the push fixes a red. Make one lane the checker: every 20 minutes it reads every crew pull request's checks, keeps one green list on the crew line for the CTO, and sends each red to its lane with the failing line.
- **Reds that are on main too turn every pull request red.** Open a lane whose only job is main's own reds, early. Give it the reported places, seeds and jobs, and have the checker send such reds to it, not to the lane whose pull request shows them.
- **A fold changes files other open pull requests touch.** After each "folded" line, each lane tests its open branches against the train without changing anything (`git merge-tree --write-tree origin/<train> <branch>`; a non-zero exit is a conflict) and merges the train in only where that shows a conflict, since every push restarts the checks. Have the watcher send every "folded" line to all lanes.
- **A stacked pair can fold apart.** When a fix takes a road away and its replacement is a second pull request, say on the line, before any fold, that the train must not go to main with one and not the other, and send the lane to the second one first.
- **One lane gets more than it can finish.** Ask each lane for one honest line per family or item: in a pull request, building with a time, or cannot reach. Move what it cannot reach the same hour, and let a top-model lane run up to two helpers, each in its own container on its own unit.
- **A smaller-model lane ends its turn after each pull request.** After every ready line from one, check that it went on, and send the next item with "do not stop between items".
- **A lane asks the owner something he already answered.** Read the lane's own reading line: on Nov 16 it quoted the ruling that answered its question. Have the lane withdraw the question on the line, cite the ruling, and build it.
- **A lane misreads a short owner answer.** "Take every count off the screens" was about signature counts; the lane listed 41 count labels. Send the lane to the full text in `OWNER-DECISIONS.md` before anyone acts on its list.
- **A fix takes a road away.** A cause fix that removes what the player relied on (offers that came unasked) is held, on the line, until the replacing road (an Apply control) is ready, and the two are listed to merge together.
- **Many lanes touch one file.** Name the owner of the file in the roster. The others post their file and lines before they push. After each merge into main, every lane with an open pull request on that file merges main the same hour and posts the new head.
- **A handoff table lands.** Deal its rows to lanes by message, each with the order it takes behind the lane's own section, and have the table's writer post the close list as "for the CTO" and the words list as "for Story": those two read the line by prefix, not by table.
- **Clock times written from memory drift.** Take every time from `date -u` before writing it.
- **A model's weekly limit stops every session on that model at once.** Nov 17, 05:25Z: seven lanes on one model stopped mid-work, two of them holding commits they never pushed, and no new session can recover those. Lanes push after every commit, not at the end of a unit. Read the account's `rate_limit_event` rows (a helper on `list_events`) every hour, work out the rate per hour, and pick the threshold (about 93%) at which every session gets "push everything, post what is left".
- **Only the owner can change a running session's model** (`/model` in that session). To move a lane to a cheaper model, have it post a handoff on the crew line at its next ready point, written for someone who has read nothing that night (branches with heads, pull requests with states, what is left in order with the comment ids and rulings), and open the new session with that comment as its brief. The same post is what another account picks the lane up from if this one stops.
- **A new session may refuse to post or push on another session's word** and wait for the owner's own. Give every brief the basis it can check for itself (the crew issue's body, the CTO lines that name the lane, the guide's rule that the CTO's word is the owner's). If it still waits, take its findings onto the crew line yourself and give the lane to another session; check every new session about five minutes after opening it.

## The hourly status

One comment on the crew line, starting "Coordinator:". In order: what is ready with finished green checks, as one table in the order to merge, each with what the owner would see and anything that must merge with it; what waits on the CTO; what waits on Story; what each lane is doing now; what is not solved. Count nothing as done: merged is the CTO's word and done is a second session's (`seen-in-game`).

## Before the account runs out

Tell every lane to push its work and post what is left, then post the coordinator's own last status with every open pull request, its head and its state.

## More in this folder

Read each file here when its moment comes:

- `references/lead-session.md`: when started with a lead prompt or a work order under docs/work-orders/.
