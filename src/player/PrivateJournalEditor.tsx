import { useState } from "react";
import type { EntityId } from "../simulation";
import type {
  JournalNote,
  PrivateJournal,
} from "../presentation/shell-navigation";

/** No World writer: this is private writing in the existing interface store. */
export function PrivateJournalEditor({
  journal,
  onChange,
  people,
  events,
  onOpenPerson,
}: {
  readonly journal: PrivateJournal;
  readonly onChange: (journal: PrivateJournal) => void;
  readonly people: readonly { personId: EntityId; name: string }[];
  readonly events: readonly { key: string; sentence: string }[];
  readonly onOpenPerson: (id: EntityId) => void;
}) {
  const [group, setGroup] = useState("");
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const edit = (id: string, patch: Partial<JournalNote>) =>
    onChange({
      ...journal,
      notes: journal.notes.map((note) =>
        note.id === id ? { ...note, ...patch } : note,
      ),
    });
  const groups = [
    ...new Set(journal.notes.map((note) => note.group).filter(Boolean)),
  ];
  return (
    <section aria-label="Private notebook">
      <h3>Your private notebook</h3>
      <p>
        These are your notes and intentions. They do not change what happened or
        tell anyone in the world what you plan.
      </p>
      <label>
        My intentions
        <textarea
          value={journal.ambition}
          onChange={(event) =>
            onChange({ ...journal, ambition: event.target.value })
          }
        />
      </label>
      <label>
        Show group
        <select
          value={group}
          onChange={(event) => setGroup(event.target.value)}
        >
          <option value="">All notes</option>
          {groups.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() =>
          onChange({
            ...journal,
            notes: [
              ...journal.notes,
              {
                id: crypto.randomUUID(),
                title: "",
                body: "",
                group,
                personId: null,
                eventKey: null,
              },
            ],
          })
        }
      >
        Add private note
      </button>
      {journal.notes
        .filter(
          (note) => !group || note.group === group || note.id === editingGroup,
        )
        .map((note, index) => {
          const person = people.find(
            (entry) => entry.personId === note.personId,
          );
          const event = events.find((entry) => entry.key === note.eventKey);
          return (
            <fieldset key={note.id} data-testid="private-note">
              <legend>Note {index + 1}</legend>
              <label>
                Title
                <input
                  value={note.title}
                  onChange={(event) =>
                    edit(note.id, { title: event.target.value })
                  }
                />
              </label>
              <label>
                Note
                <textarea
                  value={note.body}
                  onChange={(event) =>
                    edit(note.id, { body: event.target.value })
                  }
                />
              </label>
              <label>
                Group
                <input
                  value={note.group}
                  onFocus={() => setEditingGroup(note.id)}
                  onBlur={() => setEditingGroup(null)}
                  onChange={(event) =>
                    edit(note.id, { group: event.target.value })
                  }
                />
              </label>
              <label>
                Linked person
                <select
                  value={note.personId ?? ""}
                  onChange={(event) =>
                    edit(note.id, {
                      personId:
                        people.find(
                          (person) => person.personId === event.target.value,
                        )?.personId ?? null,
                    })
                  }
                >
                  <option value="">No person</option>
                  {people.map((person) => (
                    <option key={person.personId} value={person.personId}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
              {person ? (
                <button
                  type="button"
                  onClick={() => onOpenPerson(person.personId)}
                >
                  Open {person.name}
                </button>
              ) : null}
              <label>
                History bookmark
                <select
                  value={note.eventKey ?? ""}
                  onChange={(event) =>
                    edit(note.id, { eventKey: event.target.value || null })
                  }
                >
                  <option value="">No bookmark</option>
                  {events.map((event) => (
                    <option key={event.key} value={event.key}>
                      {event.sentence}
                    </option>
                  ))}
                </select>
              </label>
              {event ? (
                <a href={`#journal-entry-${encodeURIComponent(event.key)}`}>
                  Read bookmarked history
                </a>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...journal,
                    notes: journal.notes.filter(
                      (entry) => entry.id !== note.id,
                    ),
                  })
                }
              >
                Delete note
              </button>
            </fieldset>
          );
        })}
    </section>
  );
}
