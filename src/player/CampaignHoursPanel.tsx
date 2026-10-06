import { useMemo, useState } from "react";
import {
  CAMPAIGN_ROUTINE_WORK,
  currentCampaignRoutine,
  describeCampaignRoutine,
  setCampaignRoutine,
  type CampaignRoutineBlock,
  type CampaignRoutineWork,
  type EntityId,
  type World,
} from "../simulation";
import { activeCampaignForCandidate } from "../simulation/campaign-queries";
import { CAMPAIGN_HOURS_TEXT } from "../presentation/campaign-hours-text";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const LENGTHS = [30, 60, 90, 120, 180, 240] as const;
const WORK = [
  "outreach",
  "fundraising",
] as const satisfies readonly CampaignRoutineWork[];

/** Where a row starts before the candidate has ever set hours for it. */
const FRESH: Readonly<
  Record<(typeof WORK)[number], { startMinute: number; minutes: number }>
> = {
  outreach: { startMinute: 18 * 60, minutes: 120 },
  fundraising: { startMinute: 10 * 60, minutes: 60 },
};

interface HoursRow {
  readonly days: readonly number[];
  readonly start: string;
  readonly minutes: number;
}

function clock(minuteOfDay: number): string {
  return `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`;
}

function minuteOf(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function lengthLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = minutes / 60;
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

function rowsFrom(
  blocks: readonly CampaignRoutineBlock[],
): Record<CampaignRoutineWork, HoursRow> {
  const rows = {} as Record<CampaignRoutineWork, HoursRow>;
  for (const work of WORK) {
    const block = blocks.find((candidate) => candidate.work === work);
    rows[work] = block
      ? {
          days: block.weekdays,
          start: clock(block.startMinute),
          minutes: block.minutes,
        }
      : {
          days: [],
          start: clock(FRESH[work].startMinute),
          minutes: FRESH[work].minutes,
        };
  }
  return rows;
}

/**
 * The candidate's standing campaign hours (D-11). They repeat every week until
 * the candidate changes them; the clock does each session when time reaches
 * it, and a session something else takes is lost.
 */
export function CampaignHoursPanel({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const campaign = useMemo(
    () =>
      world.control.kind === "person" && world.control.personId === personId
        ? activeCampaignForCandidate(world, personId)
        : null,
    [world, personId],
  );
  const routine = useMemo(
    () => (campaign ? currentCampaignRoutine(world, campaign.id) : null),
    [world, campaign],
  );
  const [rows, setRows] = useState(() => rowsFrom(routine?.blocks ?? []));
  const [message, setMessage] = useState<string | null>(null);
  if (!campaign) return null;
  const keeping = Boolean(routine && routine.blocks.length > 0);

  function change(work: CampaignRoutineWork, next: Partial<HoursRow>) {
    setRows((current) => ({
      ...current,
      [work]: { ...current[work], ...next },
    }));
  }

  function save(blocks: readonly CampaignRoutineBlock[]) {
    try {
      const next = setCampaignRoutine(world, personId, blocks);
      setMessage(
        next === world
          ? CAMPAIGN_HOURS_TEXT.unchanged
          : blocks.length === 0
            ? CAMPAIGN_HOURS_TEXT.stopped
            : CAMPAIGN_HOURS_TEXT.set,
      );
      if (next !== world) onWorldChange(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  const chosen: CampaignRoutineBlock[] = WORK.filter(
    (work) => rows[work].days.length > 0,
  ).map((work) => ({
    work,
    weekdays: rows[work].days,
    startMinute: minuteOf(rows[work].start),
    minutes: rows[work].minutes,
  }));

  return (
    <section
      className="game-campaign-strategy game-campaign-hours"
      data-testid="campaign-hours"
      aria-labelledby="campaign-hours-title"
    >
      <h3 id="campaign-hours-title">Campaign hours</h3>
      <p data-testid="campaign-hours-current">
        {keeping
          ? describeCampaignRoutine(routine!.blocks)
          : CAMPAIGN_HOURS_TEXT.none}
      </p>
      <p>{CAMPAIGN_HOURS_TEXT.explain}</p>
      {WORK.map((work) => (
        <fieldset key={work} data-testid={`campaign-hours-${work}`}>
          <legend>{CAMPAIGN_ROUTINE_WORK[work].label}</legend>
          <span className="game-campaign-hours-days">
            {DAYS.map((name, day) => (
              <label key={name}>
                <input
                  type="checkbox"
                  checked={rows[work].days.includes(day)}
                  onChange={(event) =>
                    change(work, {
                      days: event.target.checked
                        ? [...rows[work].days, day].sort((a, b) => a - b)
                        : rows[work].days.filter((other) => other !== day),
                    })
                  }
                />
                {name}
              </label>
            ))}
          </span>
          <label>
            Starting at{" "}
            <input
              type="time"
              step={900}
              value={rows[work].start}
              onChange={(event) => change(work, { start: event.target.value })}
            />
          </label>
          <label>
            For{" "}
            <select
              value={rows[work].minutes}
              onChange={(event) =>
                change(work, { minutes: Number(event.target.value) })
              }
            >
              {LENGTHS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {lengthLabel(minutes)}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
      ))}
      <span className="game-campaign-life-actions">
        <button
          type="button"
          className="ui-action ui-action--primary"
          data-testid="campaign-hours-keep"
          disabled={chosen.length === 0}
          onClick={() => save(chosen)}
        >
          Keep these hours
        </button>
        {keeping ? (
          <button
            type="button"
            className="ui-action"
            data-testid="campaign-hours-stop"
            onClick={() => save([])}
          >
            Stop campaign hours
          </button>
        ) : null}
      </span>
      {message ? (
        <p role="status" data-testid="campaign-hours-message">
          {message}
        </p>
      ) : null}
    </section>
  );
}
