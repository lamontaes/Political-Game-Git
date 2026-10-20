/**
 * Resting stress as a monthly read of each full person's own situation (see
 * `restingStress`): once a month, and on the first day played, the level a
 * person's stress returns to is recomputed from their cash against their
 * living costs, their work, age, traits and health. Their stress so far is
 * carried to today at the old resting level first, so the change only bends
 * the decay from here on. Counted people read the same function when their
 * group decides (`initialPersonState`), so nothing here is special to full
 * people.
 */
import { affectAt } from "../emotion";
import { careNeedOf } from "./health";
import { restingStress } from "../resting-stress";
import { parameter, parameterValues } from "../parameters";
import type { ModuleRow } from "../module-data";
import type { CoreModule, CoreState } from "../types";

export const RESTING_STRESS_MODULE_ID = "core2-resting-stress-v1";

export const RESTING_STRESS_MODULE: CoreModule = {
  id: RESTING_STRESS_MODULE_ID,
  state: { schemaVersion: 1, tables: { months: {} } },
  onDay(api) {
    const core = api.state as CoreState;
    const month = core.date.slice(
      parameter("zero", core.data.parameters),
      parameter("isoMonthCharacters", core.data.parameters),
    );
    const months = api.moduleState(RESTING_STRESS_MODULE_ID).table("months");
    if (months.get("last")?.month === month) return undefined;
    months.put({ id: "last", month } as unknown as ModuleRow);
    for (const person of core.people.values()) {
      if (!person.alive) continue;
      const baseline = restingStress(core, person, careNeedOf(core, person.id));
      if (baseline === person.affect.stressBaseline) continue;
      api.updatePerson(person.id, {
        affect: {
          ...affectAt(
            person.affect,
            core.date,
            parameterValues(core.data.parameters),
          ),
          stressBaseline: baseline,
        },
      });
    }
    return undefined;
  },
};
