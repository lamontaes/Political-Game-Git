import { useState } from "react";

import type { PersonDossier } from "../presentation/person-dossier";
import type { ShellRef } from "../presentation/shell-navigation";
import type { EntityId, World } from "../simulation";
import { PersonCard } from "./PersonCard";

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
  talkUnavailable,
}: {
  readonly world: World;
  readonly playerId: EntityId;
  readonly dossier: PersonDossier;
  readonly pinned: boolean;
  readonly onClose: () => void;
  readonly onTogglePin: () => void;
  readonly onOpenLink: (ref: ShellRef) => void;
  readonly onOpenPerson?: (personId: EntityId) => void;
  readonly onTalk?: () => void;
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
      onClose={onClose}
      onExpand={() => setExpanded(true)}
      onTogglePin={onTogglePin}
      onOpenPerson={(personId) => {
        setExpanded(true);
        onOpenPerson?.(personId);
      }}
      onTalk={onTalk}
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
      talkUnavailable={talkUnavailable}
      onOpenLink={onOpenLink}
    />
  );
}
