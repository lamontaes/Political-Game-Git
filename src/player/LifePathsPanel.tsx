import { SocialInvitationPanel } from "../presentation/SocialInvitationPanel";
import { proseDate } from "../presentation/prose-dates";
import { formatMinute } from "../presentation/player-calendar";
import { useState } from "react";
import { CareerPathsPanel } from "./CareerPathsPanel";
import { JobListingsPanel } from "./JobListingsPanel";
import { EducationOptionsPanel } from "./EducationOptionsPanel";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  World,
} from "../simulation/types";
import { LIFE_PATHS2_CATALOG } from "../simulation/life-paths2-catalog";
import {
  acceptLifePathCounteroffer,
  activateLifePathRecruit,
  changeLifePathStatus,
  delegateLifePathWork,
  departLifePathRecruit,
  enterLifePath,
  knownLifePathPeople,
  LIFE_PATHS2_HANDLERS,
  lifePathEntryReason,
  pathForRelationship,
  performLifePathSession,
  performLifePathWork,
  progressLifePathWork,
  recruitLifePathPerson,
  scheduleLifePathSession,
  settleStudyTuition,
  hasLifePathStudyHistory,
} from "../simulation/life-paths2";
import type { LifePathResult } from "../simulation/life-paths2";
import {
  educationEnrollmentStateAt,
  workStatusAt,
  workRoleAt,
} from "../simulation/life-queries";
import { resourceFlowTermsAt } from "../simulation/resource-queries";
import { scheduledActivityState, workItemState } from "../simulation/time-work";
import { InlineDayControl } from "./controls/InlineDayControl";
import { composeFutureTransitionHandlerRegistries } from "../simulation/future-transitions";
import {
  studyUsesPeriodModel,
  periodizedStudyPath,
  studyTuitionStatus,
  routineWeeklyLoad,
} from "../simulation/education-study-progression";
import { DEFAULT_AUTHORED_TUITION_GRACE_DAYS } from "../simulation/education-study-terms";
import {
  studyEnrollmentProgressLabel,
  studyProgramCostLabel,
  studyUsesPeriodUi,
} from "./education-study-display";
import { GameSelect } from "./controls/GameSelect";

/** Feature-local adapter. UI-CORE owns opening/closing this panel and the World. */
export interface LifePathsPanelProps {
  readonly world: World;
  readonly onWorldChange: (world: World) => void;
  readonly transitionHandlers?: FutureTransitionHandlerRegistry;
  /** False when the surface mounting this already carries the same title. */
  readonly headed?: boolean;
  readonly showTimeControl?: boolean;
}
export function LifePathsPanel({
  world,
  onWorldChange,
  transitionHandlers,
  headed = true,
  showTimeControl = true,
}: LifePathsPanelProps) {
  const [notice, setNotice] = useState("");
  const [browse, setBrowse] = useState<"work" | "study">("work");
  const [person, setPerson] = useState<EntityId | "">("");
  const [role, setRole] = useState("community-volunteer");
  const [pay, setPay] = useState("0");
  const [grace, setGrace] = useState<Record<string, string>>({});
  if (world.control.kind !== "person")
    return <p>Choose a person to pursue education or work.</p>;
  const actor = world.control.personId;
  const handlers = transitionHandlers
    ? composeFutureTransitionHandlerRegistries(
        LIFE_PATHS2_HANDLERS,
        transitionHandlers,
      )
    : LIFE_PATHS2_HANDLERS;
  const act = (result: LifePathResult) => {
    setNotice(result.message);
    if (result.ok) onWorldChange(result.world);
  };
  const mine = [
    ...world.history.educationEnrollments,
    ...world.history.workRelationships,
  ].filter((r) => r.personId === actor && pathForRelationship(world, r.id));
  // An offer or job from the older work list stays in view: folding it away
  // hid the only "Begin accepted work" button a Greenwich life had.
  const olderWorkInPlay = world.history.workRelationships.some(
    (w) =>
      w.personId === actor &&
      ["expected", "active"].includes(
        workStatusAt(world, w.id)?.status ?? "",
      ) &&
      world.history.events.some(
        (e) =>
          e.type === "career-path7.offer" && e.involvedEntityIds.includes(w.id),
      ),
  );
  const offers = world.history.workRelationships.filter(
    (w) =>
      w.personId !== actor &&
      world.history.events.some(
        (e) =>
          e.type === "life-paths2.offer" &&
          e.involvedEntityIds.includes(w.id) &&
          e.involvedEntityIds.includes(actor),
      ),
  );
  const name = (id: EntityId) =>
    world.people[id]?.givenName + " " + world.people[id]?.familyName;
  const weeklyLoad = routineWeeklyLoad(world, actor);
  return (
    <section aria-label="Education and work">
      {/*
        The frame that opens this panel is already titled "Education and work",
        so repeating it here is the duplicated heading the owner reported. The
        proofs that mount this panel on their own still want a heading, and the
        region keeps its accessible name either way.
      */}
      {headed ? <h2>Education and work</h2> : null}
      {/* The clock's own report is several lines; keep them as lines. */}
      <p role="status" aria-live="polite" style={{ whiteSpace: "pre-line" }}>
        {notice}
      </p>
      <div
        role="group"
        aria-label="Browse opportunities"
        className="game-choices"
      >
        <button
          type="button"
          className="ui-action"
          aria-pressed={browse === "work"}
          onClick={() => setBrowse("work")}
        >
          Work
        </button>
        <button
          type="button"
          className="ui-action"
          aria-pressed={browse === "study"}
          onClick={() => setBrowse("study")}
        >
          Study
        </button>
      </div>
      <div hidden={browse !== "work"}>
        <JobListingsPanel world={world} onWorldChange={onWorldChange} />
        {/*
          The three authored jobs every town used to show. Kept, folded away,
          so a life already working one still reaches it; the town's own
          listings above are the Jobs screen now.
        */}
        <details open={olderWorkInPlay}>
          <summary>Other work</summary>
          <CareerPathsPanel
            world={world}
            onWorldChange={onWorldChange}
            transitionHandlers={handlers}
          />
        </details>
      </div>
      <div hidden={browse !== "study"}>
        <EducationOptionsPanel world={world} onWorldChange={onWorldChange} />
      </div>
      <details>
        <summary>Other paths and invitations</summary>
        <SocialInvitationPanel
          world={world}
          personId={actor}
          onWorldChange={onWorldChange}
        />
        <h3>Available paths</h3>
        <p>These opportunities and terms are fictional parts of the game.</p>
        <p>
          Accepted work, care and study: {weeklyLoad.minimumHours}–
          {weeklyLoad.maximumHours} authored hours per week. This is a
          time-demand range, not a measured capacity or penalty.
        </p>
        {weeklyLoad.commitments > 1 ? (
          <p>
            Several commitments share your week. Review their demands before
            adding another. Interrupt or leave a path if the load is too much;
            reading this warning creates no fatigue, dismissal or financial
            penalty.
          </p>
        ) : null}
        {LIFE_PATHS2_CATALOG.filter((p) => p.scope === "personal").map(
          (rawPath) => {
            const path =
              rawPath.kind === "study" ? periodizedStudyPath(rawPath) : rawPath;
            const reason = lifePathEntryReason(world, actor, path);
            return (
              <article key={path.id}>
                <h4>{path.title}</h4>
                <p>{path.organizationName}</p>
                <p>{path.responsibility}</p>
                <p>
                  {path.kind === "study" && studyUsesPeriodModel(path)
                    ? studyProgramCostLabel(path)
                    : path.sessionMinutes > 0
                      ? `${path.sessionMinutes / 60} hours per session. ${
                          path.sessionCostMinor > 0
                            ? `You pay $${path.sessionCostMinor / 100} after each attended session.`
                            : path.sessionPayMinor > 0
                              ? `The employer pays $${path.sessionPayMinor / 100} the day after each completed shift.`
                              : "This is unpaid volunteer work."
                        }`
                      : path.sessionPayMinor > 0
                        ? `The employer pays $${path.sessionPayMinor / 100} the day after each completed shift.`
                        : "This is unpaid volunteer work."}
                </p>
                {path.kind === "study" && path.credential && (
                  <p>Completing leads to: {path.credential}.</p>
                )}
                {path.kind === "study" ? (
                  <>
                    <p>
                      Accepting fixes the price, duration, credential and
                      funding terms for this enrollment. Tuition uses available
                      personal cash at period end. No loan or free tuition is
                      automatic.
                    </p>
                    <label>
                      Tuition grace days for {path.title}{" "}
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          grace[path.id] ??
                          String(DEFAULT_AUTHORED_TUITION_GRACE_DAYS)
                        }
                        onChange={(e) =>
                          setGrace({ ...grace, [path.id]: e.target.value })
                        }
                      />
                    </label>
                    <p>
                      This editable game-authored grace begins when a period
                      cannot be funded. At its disclosed deadline, unfunded
                      study pauses; work, pay and the World continue.
                    </p>
                  </>
                ) : null}
                {reason && <p>{reason}</p>}
                <button
                  disabled={!!reason}
                  onClick={() =>
                    act(
                      enterLifePath(world, path.id, {
                        tuitionGraceDays:
                          grace[path.id] === undefined
                            ? DEFAULT_AUTHORED_TUITION_GRACE_DAYS
                            : (grace[path.id] ?? "").trim() === ""
                              ? NaN
                              : Number(grace[path.id]),
                      }),
                    )
                  }
                >
                  {path.kind === "study" ? "Enroll in" : "Accept"} {path.title}
                </button>
              </article>
            );
          },
        )}
      </details>
      {/*
        One clock. This panel used to call `advanceWorldMinutes(world, 1440)`
        from its own onClick, which skipped the shared command's disclosure,
        its pending state and its stale-World guard. Every current mount — the
        shell's "Jobs and study" and "School" sections, `PersonalRoutinePanel`,
        and the developer proofs `src/ui/LifePaths2Proof.tsx` and
        `src/ui/EducationPathProof.tsx` — now renders inside a time-command
        provider. `InlineDayControl` still states why the day is not offered
        where none is mounted, so a future mount degrades to an honest sentence
        rather than crashing on a missing runner or starting a clock of its own.
      */}
      {showTimeControl ? (
        <div className="game-choices">
          <InlineDayControl
            world={world}
            personId={actor}
            label="Continue one day"
            testid="life-paths-pass-day"
            onOutcome={setNotice}
            unavailableNote="Continuing a day is not offered here: this panel is open outside the play shell, which owns the one clock."
          />
        </div>
      ) : null}
      <h3>Your paths</h3>
      {world.history.educationEnrollments
        .filter(
          (e) =>
            e.personId === actor &&
            hasLifePathStudyHistory(world, e.id) &&
            !pathForRelationship(world, e.id),
        )
        .map((e) => (
          <p key={e.id}>
            Saved study {e.programKind}: accepted terms are unavailable or
            unsupported. Its history is preserved; no current offer replaces it.
          </p>
        ))}
      {mine.map((record) => {
        const path = pathForRelationship(world, record.id)!;
        const status =
          path.kind === "study"
            ? educationEnrollmentStateAt(world, record.id)?.status
            : workStatusAt(world, record.id)?.status;
        const tuition =
          path.kind === "study"
            ? studyTuitionStatus(world, record.id, path)
            : null;
        const sessions = world.history.scheduledActivities.filter(
          (a) =>
            a.sourceEntityIds.includes(record.id) &&
            scheduledActivityState(world, a.id).status === "scheduled",
        );
        return (
          <article key={record.id}>
            <h4>
              {path.kind === "work"
                ? workRoleAt(world, record.id)?.title
                : path.title}
            </h4>
            <p>
              {path.kind === "study"
                ? studyEnrollmentProgressLabel(world, record.id, path)
                : `${status === "temporarily-inactive" ? "Interrupted" : status}.`}
            </p>
            {path.kind === "study" ? (
              <p>
                Accepted terms: {studyProgramCostLabel(path)}{" "}
                Available-personal-cash funding;{" "}
                {path.tuitionGraceDays === undefined
                  ? "legacy terms have no authored grace deadline"
                  : `${path.tuitionGraceDays} simulated-day authored tuition grace`}
                .
              </p>
            ) : null}
            {tuition ? (
              <>
                <p>
                  {tuition.paused
                    ? "Study paused for unfunded tuition. Work and the World continue."
                    : tuition.deadline
                      ? `Tuition remains unfunded; disclosed deadline ${tuition.deadline}. Study only pauses at that deadline.`
                      : "Tuition remains unfunded. Legacy terms have no new grace deadline; completion waits for funding."}{" "}
                  This accepted period requires $
                  {(tuition.amountMinor / 100).toFixed(2)} USD.
                </p>
                <button
                  type="button"
                  onClick={() => act(settleStudyTuition(world, record.id))}
                >
                  Pay accepted tuition from personal funds
                  {tuition.paused ? " and resume study" : ""}
                </button>
              </>
            ) : null}
            {path.kind === "work" && status === "active" && (
              <button
                onClick={() => act(progressLifePathWork(world, record.id))}
              >
                Review progression
              </button>
            )}
            {status === "completed" && (
              <p>{educationEnrollmentStateAt(world, record.id)?.reason}</p>
            )}
            {status === "active" && (
              <>
                {path.kind === "study" ? (
                  studyUsesPeriodUi(world, record.id, path) ? null : (
                    <button
                      onClick={() =>
                        act(scheduleLifePathSession(world, record.id))
                      }
                    >
                      Schedule next session
                    </button>
                  )
                ) : (
                  <button
                    onClick={() =>
                      act(performLifePathWork(world, record.id, handlers))
                    }
                  >
                    Perform work
                  </button>
                )}
                <button
                  onClick={() =>
                    act(changeLifePathStatus(world, record.id, "pause"))
                  }
                >
                  Interrupt
                </button>
              </>
            )}
            {status === "temporarily-inactive" && !tuition?.paused && (
              <button
                onClick={() =>
                  act(changeLifePathStatus(world, record.id, "return"))
                }
              >
                Return
              </button>
            )}
            {(status === "active" || status === "temporarily-inactive") && (
              <button
                onClick={() =>
                  act(changeLifePathStatus(world, record.id, "leave"))
                }
              >
                Leave
              </button>
            )}
            {sessions.map((a) => {
              const state = scheduledActivityState(world, a.id);
              return (
                <div key={a.id}>
                  <p>
                    {proseDate(state.start.date)},{" "}
                    {formatMinute(state.start.minuteOfDay)} —{" "}
                    {path.sessionMinutes / 60} hours. Attending advances the
                    clock to the end of this session.
                  </p>
                  <button
                    onClick={() =>
                      act(performLifePathSession(world, a.id, handlers))
                    }
                  >
                    Attend {path.title}
                  </button>
                </div>
              );
            })}
          </article>
        );
      })}
      <details>
        <summary>Recruit someone you know</summary>
        <p>
          Personal assignments use your own money. Campaign assignments use the
          active campaign’s treasury. Public-office hiring is unavailable until
          its authority and restrictions are established.
        </p>
        <label>
          Person{" "}
          <GameSelect
            value={person}
            onChange={(e) => setPerson(e.target.value as EntityId)}
          >
            <option value="">Choose a person</option>
            {knownLifePathPeople(world, actor).map((id) => (
              <option key={id} value={id}>
                {name(id)}
              </option>
            ))}
          </GameSelect>
        </label>
        <label>
          Work{" "}
          <GameSelect
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPay(
                String(
                  (LIFE_PATHS2_CATALOG.find((p) => p.id === e.target.value)
                    ?.sessionPayMinor ?? 0) / 100,
                ),
              );
            }}
          >
            {LIFE_PATHS2_CATALOG.filter((p) => p.kind === "work").map((p) => (
              <option value={p.id} key={p.id}>
                {p.title} ({p.scope})
              </option>
            ))}
          </GameSelect>
        </label>
        <label>
          Dollars per completed assignment{" "}
          <input
            type="number"
            min="0"
            step="0.01"
            value={pay}
            onChange={(e) => setPay(e.target.value)}
          />
        </label>
        <button
          disabled={!person}
          onClick={() => {
            if (person)
              act(
                recruitLifePathPerson(
                  world,
                  person,
                  role,
                  Math.round(Number(pay) * 100),
                ),
              );
          }}
        >
          Make offer
        </button>
      </details>
      {offers.map((work) => {
        const status = workStatusAt(world, work.id)?.status;
        const negotiated = world.history.events.some(
          (e) =>
            e.type === "life-paths2.offer-negotiated" &&
            e.involvedEntityIds.includes(work.id),
        );
        const accepted = world.history.events.some(
          (e) =>
            e.type === "life-paths2.offer-accepted" &&
            e.involvedEntityIds.includes(work.id),
        );
        const flow = world.history.resourceFlows.find(
          (f) =>
            f.basisReference.kind === "work" &&
            f.basisReference.workRelationshipId === work.id,
        );
        const amount = flow
          ? resourceFlowTermsAt(world, flow.id)?.amount.minorUnits
          : 0;
        return (
          <article key={work.id}>
            <h4>
              {name(work.personId)} — {workRoleAt(world, work.id)?.title}
            </h4>
            <p>
              {status === "ended"
                ? "Engagement ended or offer declined"
                : status === "expected"
                  ? accepted
                    ? "Accepted; awaiting start"
                    : negotiated
                      ? "Counteroffer pending"
                      : "Awaiting response"
                  : "Working"}
              .{" "}
              {amount
                ? `$${amount / 100} per completed assignment.`
                : "Unpaid."}
            </p>
            {negotiated && !accepted && status === "expected" && (
              <>
                <p>
                  They request $
                  {Math.max(
                    amount ?? 0,
                    Math.ceil(
                      pathForRelationship(world, work.id)!.sessionPayMinor *
                        1.25,
                    ),
                  ) / 100}{" "}
                  per completed assignment.
                </p>
                <button
                  onClick={() =>
                    act(acceptLifePathCounteroffer(world, work.id))
                  }
                >
                  Accept revised terms
                </button>
              </>
            )}
            {accepted && status === "expected" && (
              <button
                onClick={() => act(activateLifePathRecruit(world, work.id))}
              >
                Start engagement
              </button>
            )}
            {status === "active" && (
              <>
                <button
                  onClick={() => act(delegateLifePathWork(world, work.id))}
                >
                  Assign work
                </button>
                <button
                  onClick={() => act(departLifePathRecruit(world, work.id))}
                >
                  End engagement
                </button>
              </>
            )}
            {world.history.workItems
              .filter((i) => i.sourceEntityIds.includes(work.id))
              .map((i) => (
                <p key={i.id}>
                  {i.summary} —{" "}
                  {workItemState(world, i.id).status === "ready-for-review"
                    ? "Ready for review"
                    : status === "ended"
                      ? "Stopped"
                      : "In progress"}
                </p>
              ))}
          </article>
        );
      })}
    </section>
  );
}
