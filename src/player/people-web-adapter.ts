/**
 * PEOPLE-WEB17 mount for PT3.
 *
 * Graph and card files live here. PlayerGame should keep owning navigation,
 * conversation, and the shell frame. Wire:
 *
 * - People surface → `PeopleWorkspace` (already exports the web-first view)
 * - Room inspect / pin / name → `PersonCard` via `QuickDossier` / `FullDossier`
 *
 * Frozen head is this branch. Do not copy the card into a second X-stack.
 */
export { PersonCard } from "./PersonCard";
export { PeopleRelationshipWeb } from "./PeopleRelationshipWeb";
export { QuickDossier, FullDossier } from "./ShellDossier";
export { PeopleWorkspace } from "./ShellWorkspaces";
export {
  projectRelationshipWeb,
  layoutRelationshipWeb,
} from "../presentation/relationship-web";
