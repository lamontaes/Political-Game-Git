import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import type { EntityId, IsoDate, World } from "../../src/simulation";
import { recordFamilyAddition } from "../../src/simulation/people-family";

/**
 * An ordinary opened life with one adult child on record, for proving
 * "Continue as" end to end. Generated openings record no children of the
 * player, so the child is added through the supported, dated family-addition
 * command — the same record a birth in play writes — dated `childAge` years
 * before the opening date.
 */
export function openedLifeWithAdultChild(
  seed = "people-heir-fixture",
  startAge = 58,
  childAge = 30,
): {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly childPersonId: EntityId;
} {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge }),
  ).game!;
  const opened = openOrdinaryLife(game.world, game.playerPersonId);
  const [y, m, d] = opened.currentDate.split("-");
  const born =
    `${Number(y) - childAge}-${m}-${m === "02" && d === "29" ? "28" : d}` as IsoDate;
  const added = recordFamilyAddition(opened, {
    kind: "birth",
    stableKey: `fixture:${seed}:adult-child`,
    occurredAt: born,
    parentPersonIds: [game.playerPersonId],
  });
  return {
    world: added.world,
    playerPersonId: game.playerPersonId,
    childPersonId: added.childPersonId,
  };
}
