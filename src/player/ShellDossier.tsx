import { useState } from "react";

import type { PersonDossier } from "../presentation/person-dossier";
import type { ShellRef } from "../presentation/shell-navigation";
import type { EntityId, World } from "../simulation";
import { PersonCard, type PersonCardAnchor } from "./PersonCard";

/**
 * Compatibility mounts for the unified person card.
 *
 * Quick inspect and the full record are the same card. Expanding happens in
 * place; choosing another person replaces it. PT3 can keep these names.
 */

export function QuickDossier({
  world,
  playerId,
  dossier,
  pinned,
  onClose,
  onTogglePin,
  onOpenLink,
  onOpenPerson,
  onTalk,
  onMeet,
  onTravel,
  onFullRecord,
  presentPersonIds,
  talkUnavailable,
  anchor = null,
}: {
  readonly world: World;
  readonly playerId: EntityId;
  readonly dossier: PersonDossier;
  readonly pinned: boolean;
  readonly anchor?: PersonCardAnchor | null;
  readonly onClose: () => void;
  readonly onTogglePin: () => void;
  readonly onOpenLink: (ref: ShellRef) => void;
  readonly onOpenPerson?: (personId: EntityId) => void;
  readonly onTalk?: () => void;
  readonly onMeet?: () => void;
  readonly onTravel?: () => void;
  readonly onFullRecord?: () => void;
  readonly presentPersonIds?: readonly EntityId[];
  readonly talkUnavailable?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <PersonCard
      world={world}
      playerId={playerId}
      dossier={dossier}
      pinned={pinned}
      expanded={expanded}
      mode="overlay"
      anchor={anchor}
      onClose={onClose}
      onExpand={() => setExpanded(true)}
      onTogglePin={onTogglePin}
      onOpenPerson={(personId) => onOpenPerson?.(personId)}
      onTalk={onTalk}
      onMeet={onMeet}
      onTravel={onTravel}
      onFullRecord={onFullRecord}
      presentPersonIds={presentPersonIds}
      talkUnavailable={talkUnavailable ?? null}
      onOpenLink={onOpenLink}
    />
  );
}

export function FullDossier({
  world,
  playerId,
  dossier,
  pinned,
  onTogglePin,
  onTalk,
  onMeet,
  talkUnavailable,
  onOpenLink,
  onOpenPerson,
}: {
  readonly world: World;
  readonly playerId: EntityId;
  readonly dossier: PersonDossier;
  readonly pinned: boolean;
  readonly onTogglePin: () => void;
  readonly onTalk: () => void;
  readonly onMeet?: () => void;
  readonly talkUnavailable: string | null;
  readonly onOpenLink: (ref: ShellRef) => void;
  readonly onOpenPerson?: (personId: EntityId) => void;
}) {
  return (
    <PersonCard
      world={world}
      playerId={playerId}
      dossier={dossier}
      pinned={pinned}
      expanded
      mode="workspace"
      onTogglePin={onTogglePin}
      onOpenPerson={(personId) => onOpenPerson?.(personId)}
      onTalk={onTalk}
      onMeet={onMeet}
      talkUnavailable={talkUnavailable}
      onOpenLink={onOpenLink}
    />
  );
}
