---
name: crew-messages
description: >
  How Our Civic Duty's sessions message each other: the one tool that reaches
  another session, who gets which message (builder to checker, checker to
  merger, a red to red main, a question for the owner to the CTO, a seam to the
  session that owns it), what every message carries, what must also go into the
  record, and the rule that a process is written as a skill, never explained in
  a message. Use before sending any message to another session and whenever you
  are about to explain how to do something, and when told to coordinate a
  builder crew from a crew line (one session per lane, a watcher, relays, the
  checks on every ready pull request, the hourly merge list). Not for the shared
  files themselves (.agents/rules/how-we-talk.md) or for reports to the owner
  (civic-reports).
---

# Crew messages

The owner's rules: sessions message the CTO and the CTO messages them, sessions whose work meets message each other directly, and the CTO's word is the owner's word (owner, Oct 29; `.agents/rules/how-we-talk.md`). A message never replaces the record. **A process is a skill, not a message** (owner, Nov 1: "i saw one messaging about communicating a process. just make it a skill").

## The tool

- **The pull request is the item's thread (owner, Nov 10; `docs/pool/START-A-BUILDER.md`).** Progress, questions ("Question:"), send-backs and the "Handoff:" note go on the item's own pull request, so a new agent on any tool carries on from the record. A tool that cannot message other sessions (Codex, Muse or another) uses the pull request comment as its message; the session that must act reads the pull request, and a message from a session that can send one only points to the comment. Issue 8928 is for crew-wide lines only.
- In Claude, send with the claude-code-remote `send_message` tool and the session id from `docs/coordination/CREW.md`. `SendMessage` (the sub-agent tool) is a different transport and reaches no other session (Oct 30: a checker's hand-offs to the mergers went through it for hours and arrived nowhere).
- Start with who is talking to whom: `Checker 2 → Merger 1.` Then the point in the first sentence.
- `send_message` delivers the moment it is called, and nothing takes it back. Never call it with a draft, a placeholder or a body still to fill in: write the whole body first, then send (Nov 1: a governing message that said only "placeholder" reached the laws lead and needed a second message to withdraw it).
- A message to a session in a long turn waits in its queue until the turn ends, unless it is sent with `priority: "next"`, which joins the running turn (`"now"` interrupts it). Send rulings and corrections with `"next"`. A session that keeps doing what you told it to stop has probably not received your messages, so ask it for a one-line reply naming what it is on (Nov 8: Jobs and economy got 24 messages, from 9:55 a.m. on, only at 11:40, after building two things they had redirected).
- Arm no timers: no `send_later`, `create_trigger` or wake-up chain (owner, Nov 1: "Anthropic has removed 5-hour limits, so no need for any timers or anything"). After a long stop, the CTO restarts each session by message.

## Starting a session with a goal

- A session started with `create_session` whose first message begins `/goal ` runs it as a real goal (a stop hook the session can't end before it holds). The goal is limited to 4,000 characters; a longer one is refused and the session does nothing (Nov 8: the five night briefs, 8,000 to 12,000 characters each, and Dev Mode's were all refused). Write the role, the done-when lines and the rules in short under 4,000, and point to the full brief by branch and path.
- A `/goal` sent later with `send_message` arrives as an ordinary message, not a command. The session works on it but holds no stop hook, so it can end its turn early (Nov 8: none of the five night sessions given their goal by message showed one). Check `get_session` for `external_metadata.goal`; a session without one is restarted by message on each pass.
- **A created session is not a running session.** `create_session` returns an id even when the goal was refused, and a refused session looks the same in a list. Count the brief first (`wc -c`, under about 3,800 to leave room). Before telling anyone a session runs, read `get_session`: `external_metadata.goal.condition` holds your text, and the session has done something you can see (a post, a branch, a pull request). Report the id with that first action, never before it (Nov 11: four helpers were created with briefs of 4,100 to 4,500 characters and none ran; the CTO had already told the owner the GitHub manager was started, an hour before it was).
- **A goal that cannot be met makes a loop.** A session's stop hook keeps it going until its goal holds. A builder that decides to stop for a reason the goal does not allow (it thinks its usage is out) is pushed back each time, so it does the cheapest thing that looks like work: it claims an item, writes "not started" and leaves the claim. Watch the pull request list for drafts titled "not started" or "not built" from one session; stop that session, release its claims in one pool pull request and start a fresh one (Nov 11: Builder S4 locked eight items in 100 minutes).
- **`pool next` offers a released item again at once.** Never tell a builder to release what `next` gives it for a reason that will not change (an area, a kind): it takes and releases the same item forever (Nov 11: play-stop-11 was taken, released and taken again within minutes). Tell it to build the item under the rule that applies, or use `next --for <kind>`.
- When a session's priorities change, its held goal does not: the stop hook keeps judging it against the goal from its first message and pulls it back to that work, whatever later messages say. Start a fresh session with the new `/goal` (under 4,000 characters, the old session's open PRs named in it) and archive the old one (Nov 8: Money kept probing the economy cycle for two hours after the owner's 11:05 order to fix payroll first, and Lives called itself done against its first brief while the CTO's audit row waited).
- The model passed to `create_session` is the one that runs; after the first turn `external_metadata.last_served_model` confirms it.
- Post a new session's branch prefix where the merge desk's owner reads, in the same comment that announces the session ("new session: X, branches `x/`"). The merge desk merges only prefixes it has been told about (Nov 8: `jobs/`, `lives/`, `memory/` and `elections/` PRs waited two to four hours for that line).
- Before every push to a PR's branch, read the PR's own state. A merged PR strands whatever is pushed after it, so open a new PR from fresh main instead (Nov 8: five stranded pushes in one night, from four sessions).

## Who gets what

| You have                                          | Send it to                                                       | And put it in                                       |
| ------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| A PR ready (builder)                              | the checker whose number is the PR number mod 5                  | the PR body                                         |
| A passed gate (checker)                           | the merger by the PR's parity (Merger 0 even, Merger 1 odd)      | a PR comment with the head SHA                      |
| A send-back (checker or merger)                   | the builder named in CREW                                        | a PR comment saying what fails, with place and seed |
| A red on main                                     | red main, or the session that owns the engine (`red-main` skill) | a pool item if none matches                         |
| A skills PR                                       | the CTO, who reads it and merges it at once                      | the PR body                                         |
| A question for the owner                          | the CTO, ending with the reading line (`look-first`)             | the PR body under OWNER DECISIONS NEEDED            |
| A seam (you will build in another session's area) | that session, before you build                                   | your channel block                                  |
| Your queue is empty or too long (checker)         | the CTO, who moves PRs between checkers                          | nothing else                                        |
| A stray push, a deleted file, a mistake           | the CTO at once, with what and where                             | nothing else                                        |

- **A crew-wide question goes on the coordination thread (owner, Nov 8); a question about an item goes on the item's pull request (Nov 10).** When a crew runs from a coordination thread (Nov 8: #7365, where the CTO and a Coordinator on another account talk), every question from every session (design, ruling, scope or blocker) is a comment on that PR. It starts `Question (<session>):`, puts the question in its first sentence, then gives the PR, head, place and seed, what is being built meanwhile, and the reading line when it is the owner's call. Send the Coordinator a one-line message that it is posted. A session whose environment refuses the GitHub write sends the question by message, and the Coordinator posts it word for word, marked as relayed. Watch it so the CTO's answers arrive at once. If it is an issue, not a pull request (Nov 8: #7365 is an issue), a PR subscription never delivers its comments; poll its comment count once a minute with `gh api -X GET search/issues -f q='repo:<owner>/<repo> is:issue is:open <words in its title>' --jq '.items[] | select(.number==N) | .comments'` and read the new comments when it changes (Nov 8: five CTO comments waited 30 minutes unread). If #8928 is the thread, post there only what concerns the whole crew. #7365 was the line until Nov 12, 2026; it is near GitHub's comment cap. Asking never stops the build: take the realistic choice and say so in the comment.

When the CTO moves a PR between two checkers, it tells both. A checker already mid-gate keeps the PR and tells the other.

## What a message carries

- The PR number and the head SHA it is about, the place and seed of any failure, and the exact ask.
- What you did and what is left, in one or two sentences. Not the whole log: that goes in the PR comment.
- A builder's hand-off to its checker names the branch and head, what changed in one sentence, the heavy test with the seed variables that replay its proof place (for example `LENDERS_PLACE` and `LENDERS_WORLD_SEED`) and how long one run takes, what the builder did not run, and that the checker is now the branch's one writer.
- Quote a PR number only from the result of the call that created it, and send the message after that call. A number written before it is a guess (Nov 1: a message sent with the create call named #7076 for what became #7078).
- A ruling you relay names where it is recorded (`OWNER-DECISIONS.md`, with its date and time).
- A reviewer whose environment refuses a GitHub write sends the review by message. The PR's author then posts it on the PR word for word, marked as relayed, with the sender and time, so the checker reads it in the record (Nov 1, the lane's review of #6981).

## A process is a skill

- If you are about to explain in a message how to do something (a command, an order of steps, a trap to avoid), write it into the skill that covers it, or a new skill, and send the skill's name and line instead. Ship it as a `skills:` PR the CTO merges at once (AGENTS.md, "Skills").
- If you receive a process in a message, check that a skill holds it. If none does, add it.
- A message that settles something for the future (a route, a ruling, a recurring fix) is also a skill line or an `OWNER-DECISIONS.md` entry, never only a message.
- A skills PR is merged within minutes of your message. Before you push more to its branch, check the PR is still open, by reading the PR itself (its state and whether it merged); a status or checks read shows only the head's checks and says nothing about a merge (Nov 1: a line pushed after that kind of check was stranded); once it has merged, anything you push is stranded on the branch, so open a new skills PR for it (Nov 1: three sessions' later lines were stranded this way).

## When messages cross

- Two messages about the same thing can cross. The newest from the CTO wins. Reply with what changed and the head you are on.
- If a message tells you something that is already done or already wrong, say so in one line and carry on. Do not redo the work.
- A hold on a PR goes on the PR as a comment as well as in a message. The comment is what a merger reads before merging: on Nov 1 a checker passed #7036 after the laws lead's hold message, which crossed its pass.
- A PR can merge on an earlier head and drop a later commit (the merge desk merges the head it checked): put every follow-up on a new branch from main, and check main holds your last commit after each merge (Nov 8, #7440).
- **A session that finished its job will not take new work from a message (Nov 11).** Five cause finders whose brief said "one item, then stop" each answered a message asking for more with "the person running this session has to confirm". That is by design: a message from another session cannot widen a session's job. Start a fresh session with a standing brief (its list, then "take the next ones in these areas yourself") instead of messaging an old one. Three fresh ones posted twenty cause pull requests in the next hour.
- **Before you assign a list, say which items you keep for yourself (Nov 11).** A fresh cause finder wrote the same cause I was writing, ten minutes later, because its brief's areas covered my item. Name your own items in the brief, and tell helpers to check for an open pull request that already touches an item before they start it.
- **To see what a session last said, read its last few `assistant` events, never its `result` events in bulk (Nov 11).** One `result` event carries the whole turn's accounting and is thousands of words long.

## Stop condition

Done when each message reached its session by `send_message`, carried the PR, head, place and seed it was about, matched a record entry, and any process it explained is now a skill line.

## Lessons of Nov 11 (the night merging moved)

- **A relayed order cannot give a session a power it does not have.** The CTO relayed the owner's word to start merge desks on a second account. That account's permission check refused to start them, and the lead's own standing order there was "You do not merge." The right move is the one taken: do not work around the refusal, start the part that is allowed (gate-only desks), say on the crew's issue exactly what the owner must do to allow the rest (type it in that session, or add the permission rule), and keep the old holder of the step in place until he does.
- **A new power for a desk goes in a new desk's brief.** When the owner widens what the crew may do (Nov 11: "Fable B's desks may merge"), the lead does not message the running desks to take it up. It starts a session whose own brief holds the power and its limits, and says so on the crew's issue. The desks that refused the message were right.
- **A session in a long turn reads a message when the turn ends.** An order that cannot wait (a build hold, a red) is sent to join the running turn (`priority: "next"`), and to stop the turn only when a wrong action is already under way (`priority: "now"`).
- **A sha in a ready line is read from git, never typed.** A ready line went out with a sha typed from memory and had to be edited. Run `git rev-parse HEAD` and paste it.
- **A number is named only after the thing exists.** Do not name a pull request, a comment or a session before the tool has returned it.

## Lesson of Nov 11 (two builders wrote the same step in the same hour)

Two Words builders each had an item that said "the engine joins a sentence from pieces", one for conversations and one for scenes. Each wrote the joining step, with two different ways to mark a piece's part. Both work; now there are two.

- **When two items need the same new step, the lead names one owner in both briefs:** "W5 writes the joining step and pushes it by itself first; W1 uses it." The other builder starts from that push.
- **A builder whose item adds a step other items say they will use posts it the minute its tests pass,** with the function's name and how to call it, as W5 did at 07:21 UTC. A builder about to write such a step searches the crew's issue for it first.
- **A direction posted on the crew's issue reaches a builder only when it next reads the issue.** A rule that must hold in a builder's next pull request also goes to that builder by message, naming the skill or the pull request comment that holds it.

## Lessons of Nov 11 (the afternoon: messages that waited)

- **Read your queued messages every pass.** A message from another session waits in the notification queue while your turn runs and is not shown until you read the queue. On Nov 11 eleven messages sat for up to 49 minutes, four of them builders holding for a call. Read the queue at the start of each pass and after every long command, before you start anything of your own.
- **A builder who stopped still owns an open pull request, and nobody is gating it.** A pull request whose builder hit the usage limit sat ready and ungated for nine hours. When a session stops, the lead lists its open pull requests and hands each to a gate desk by name, with who finishes the mechanical part.

## The hourly crew line check (Nov 15, from the crew-check thread)

- Issue 8928 refuses new comments since about 09:00Z, Nov 16: post the hourly crew line and train-ready lines on the PR, and wait for the owner or the CTO to name a new issue. Read the crew issue's newest comments from the highest page number down: `gh api repos/<repo>/issues/8928/comments?per_page=100&page=N`, filtered on `.user.login` and a `^(CTO|Coordinator):` start. `--paginate` fails through the proxy.
- `list_threads` with `since` and a limit of 100 shows only threads active since then. Running = total minus this thread, minus done, failed and resolved; say in the report when the list is partial. `list_prs` is truncated, so a PR count is a carried-over estimate and is labeled as one.
- When several hourly fires pile up after a usage limit or a restart, post one comment, not one per fire.
- After a usage-limit stop many threads show "failed" until their wake triggers resume them; report that to the coordinator once and do not count them as running.

## Running a crew from a crew line (the coordinator)

First used Nov 16, 2026, on crew line #9747: six lanes and a watcher, 20 pull requests in the first 90 minutes. The coordinator builds nothing in the game. Its work is that every lane has work, every line reaches the session it is for, and the CTO gets one honest list.

### Opening the crew

- Read the whole work list first. Give each lane its section word for word, the rules, its branch prefix (`claude/<lane>-<topic>`), the order inside its section, and where lanes meet (who owns the screen files; who posts "for Screens" before pushing to one).
- One session per lane, on the model the list names; say on the line which model you chose where the list is silent, and how to change it.
- Post the roster on the crew line: lane, section, model, session id.
- Open a watcher on the smallest model. Every 10 minutes it reads the crew line and, for a new line that starts "CTO:", messages the coordinator and each lane the line names. It keeps the highest comment id it has seen in a file and schedules its own next tick.
- **Have the watcher relay lane-to-lane lines too.** Give it the map of lane names to sessions and three rules: a "CTO:" line goes to the coordinator and every lane it names; a line of the form "<name>: for <lane>:" goes to that lane; a "CTO:" line with "every lane" or "folded" goes to all. It passes on the comment's id and first lines, never a summary, and reads every thread the crew uses. Until it does this, a line from one lane to another reaches nobody unless the coordinator relays it.

### The loop

- **Light check, about every 10 minutes:** watch the crew's branches and main with `git ls-remote` in one bounded wait. A push means a lane is alive. Main moving means the CTO merged something: read what (`git log`, `git diff --stat`) and tell the lanes it touches the same minute.
- **Full check, about every 20 to 30 minutes:** a small helper reads the crew line's new comments (ids above the last one read), saves them to a file, and returns one line per comment plus the whole body of any "CTO:", "for the owner", "for the CTO" or "for the Coordinator" line. The same helper lists the crew's open pull requests with their heads and check counts.
- **Sessions list, with the full check:** a lane that is idle with nothing scheduled has stopped. Read its last message and wake it with its next item.
- Keep a running notes file: each read's last comment id, each ready pull request with its full head, each open question and who holds it.

### What goes wrong, and the fix

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

### The hourly status

One comment on the crew line, starting "Coordinator:". In order: what is ready with finished green checks, as one table in the order to merge, each with what the owner would see and anything that must merge with it; what waits on the CTO; what waits on Story; what each lane is doing now; what is not solved. Count nothing as done: merged is the CTO's word and done is a second session's (`seen-in-game`).

### Before the account runs out

Tell every lane to push its work and post what is left, then post the coordinator's own last status with every open pull request, its head and its state.
