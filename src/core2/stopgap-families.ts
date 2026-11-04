// The stopgap register, one file per id family (SG-<FAMILY>-...), so two
// pull requests that each register a stopgap touch different files
// (tooling-stopgaps-register-per-family). An entry goes in the file named by
// its family; a new family is a new file plus one line in this file, which the
// register test checks against the folder.

import f_bench from "./data/stopgaps/bench.json" with { type: "json" };
import f_campaign from "./data/stopgaps/campaign.json" with { type: "json" };
import f_core from "./data/stopgaps/core.json" with { type: "json" };
import f_dir from "./data/stopgaps/dir.json" with { type: "json" };
import f_director from "./data/stopgaps/director.json" with { type: "json" };
import f_effect from "./data/stopgaps/effect.json" with { type: "json" };
import f_ew from "./data/stopgaps/ew.json" with { type: "json" };
import f_family from "./data/stopgaps/family.json" with { type: "json" };
import f_fixer from "./data/stopgaps/fixer.json" with { type: "json" };
import f_gov from "./data/stopgaps/gov.json" with { type: "json" };
import f_gq from "./data/stopgaps/gq.json" with { type: "json" };
import f_health from "./data/stopgaps/health.json" with { type: "json" };
import f_hist from "./data/stopgaps/hist.json" with { type: "json" };
import f_justice from "./data/stopgaps/justice.json" with { type: "json" };
import f_labor from "./data/stopgaps/labor.json" with { type: "json" };
import f_law from "./data/stopgaps/law.json" with { type: "json" };
import f_laws from "./data/stopgaps/laws.json" with { type: "json" };
import f_legislature from "./data/stopgaps/legislature.json" with { type: "json" };
import f_lives from "./data/stopgaps/lives.json" with { type: "json" };
import f_living from "./data/stopgaps/living.json" with { type: "json" };
import f_loc from "./data/stopgaps/loc.json" with { type: "json" };
import f_m1 from "./data/stopgaps/m1.json" with { type: "json" };
import f_meetings from "./data/stopgaps/meetings.json" with { type: "json" };
import f_office from "./data/stopgaps/office.json" with { type: "json" };
import f_officials from "./data/stopgaps/officials.json" with { type: "json" };
import f_p10 from "./data/stopgaps/p10.json" with { type: "json" };
import f_p15 from "./data/stopgaps/p15.json" with { type: "json" };
import f_p8 from "./data/stopgaps/p8.json" with { type: "json" };
import f_people from "./data/stopgaps/people.json" with { type: "json" };
import f_play from "./data/stopgaps/play.json" with { type: "json" };
import f_pool from "./data/stopgaps/pool.json" with { type: "json" };
import f_pw3 from "./data/stopgaps/pw3.json" with { type: "json" };
import f_pw8 from "./data/stopgaps/pw8.json" with { type: "json" };
import f_school from "./data/stopgaps/school.json" with { type: "json" };
import f_screens from "./data/stopgaps/screens.json" with { type: "json" };
import f_state from "./data/stopgaps/state.json" with { type: "json" };
import f_traits from "./data/stopgaps/traits.json" with { type: "json" };
import f_web from "./data/stopgaps/web.json" with { type: "json" };
import f_wire from "./data/stopgaps/wire.json" with { type: "json" };
import f_words from "./data/stopgaps/words.json" with { type: "json" };
import f_world from "./data/stopgaps/world.json" with { type: "json" };

/** Every family file, by file name. */
export const STOPGAP_FAMILIES: Record<string, readonly unknown[]> = {
  "bench.json": f_bench,
  "campaign.json": f_campaign,
  "core.json": f_core,
  "dir.json": f_dir,
  "director.json": f_director,
  "effect.json": f_effect,
  "ew.json": f_ew,
  "family.json": f_family,
  "fixer.json": f_fixer,
  "gov.json": f_gov,
  "gq.json": f_gq,
  "health.json": f_health,
  "hist.json": f_hist,
  "justice.json": f_justice,
  "labor.json": f_labor,
  "law.json": f_law,
  "laws.json": f_laws,
  "legislature.json": f_legislature,
  "lives.json": f_lives,
  "living.json": f_living,
  "loc.json": f_loc,
  "m1.json": f_m1,
  "meetings.json": f_meetings,
  "office.json": f_office,
  "officials.json": f_officials,
  "p10.json": f_p10,
  "p15.json": f_p15,
  "p8.json": f_p8,
  "people.json": f_people,
  "play.json": f_play,
  "pool.json": f_pool,
  "pw3.json": f_pw3,
  "pw8.json": f_pw8,
  "school.json": f_school,
  "screens.json": f_screens,
  "state.json": f_state,
  "traits.json": f_traits,
  "web.json": f_web,
  "wire.json": f_wire,
  "words.json": f_words,
  "world.json": f_world,
};
