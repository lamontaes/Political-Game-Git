import { coreAPI } from "../../core2/state";
import {
  causeDamagingDisaster,
  causeDisaster,
  DISASTERS_MODULE_ID,
  hazardOfIncident,
  townDisasters,
  type Hazard,
} from "../../core2/modules/national-events";
import type { DevView } from "../dev-views";

/**
 * Dev mode's town disasters: the county's exposure to each hazard (what has built up and how many
 * have happened), every disaster the town's county has made, and a control that causes the next
 * one through the game's own calls (`causeDisaster`), so its begin, declaration, aid and damaged
 * homes can be advanced to and read (owner, Nov 14: every effect can be triggered in dev mode and
 * traced). `hazard` is flood, storm or wildfire; without one the next that damages the town.
 */
const view: DevView = {
  name: "town-disasters",
  routes: {
    "GET town-disasters": ({ mode }) => {
      const api = coreAPI(mode.core);
      const exposure = api.state.modules.has(DISASTERS_MODULE_ID)
        ? (api
            .moduleState(DISASTERS_MODULE_ID)
            .table("exposure")
            .rows() as unknown as {
            id: string;
            hazard: string;
            expected: number;
            fired: number;
          }[])
        : [];
      return {
        exposure: exposure.map((row) => ({
          id: row.id,
          hazard: row.hazard,
          builtUp: row.expected,
          happened: row.fired,
        })),
        disasters: townDisasters(api).map((row) => ({
          number: row.number,
          recorded: row.recorded ?? null,
          title: row.title,
          type: row.type,
          hazard: hazardOfIncident(row.type) ?? null,
          begins: row.begins,
          declared: row.declared,
        })),
      };
    },
    "POST town-disasters/cause": ({ mode, input }) => {
      const api = coreAPI(mode.core);
      const hazard = input.hazard;
      const made =
        hazard === "flood" || hazard === "storm" || hazard === "wildfire"
          ? (causeDisaster(api, hazard as Hazard, "damaging") ??
            causeDisaster(api, hazard as Hazard))
          : causeDamagingDisaster(api);
      return made
        ? {
            number: made.number,
            recorded: made.recorded ?? null,
            begins: made.begins,
            declared: made.declared,
          }
        : { number: null };
    },
  },
};

export default view;
