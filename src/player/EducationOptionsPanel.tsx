import { acceptedEducationPath } from "../simulation/education-study-terms";
import {
  parseEducationTerms,
  DEFAULT_AUTHORED_TUITION_GRACE_DAYS,
} from "../simulation/education-study-terms";
import { loadEducationCatalog } from "../education/catalog-load";
import { preferredAcademicYear } from "../education/vintage";
import { useEffect, useMemo, useState } from "react";
import type { World } from "../simulation/types";
import type { EducationInstitution } from "../education/types";
import { projectRelevantEducationDirectory } from "../presentation/practical-opportunities";
import { searchInstitutions } from "../education/catalog";
import {
  applyForEducation,
  educationOptionReason,
  pendingEducationOffers,
  respondToEducationOffer,
  studyDefinition,
} from "../education/study-provider";
import { pathForRelationship } from "../simulation/life-paths2";
import {
  studyEnrollmentProgressLabel,
  studyProgramCostLabel,
} from "./education-study-display";
import { GameSelect } from "./controls/GameSelect";
export interface EducationOptionsPanelProps {
  world: World;
  onWorldChange: (world: World) => void;
}
export function EducationOptionsPanel({
  world,
  onWorldChange,
}: EducationOptionsPanelProps) {
  const [catalog, setCatalog] = useState<readonly EducationInstitution[]>([]),
    [query, setQuery] = useState(""),
    [wide, setWide] = useState(false),
    [kind, setKind] = useState("postsecondary"),
    [offset, setOffset] = useState(0),
    [selected, setSelected] = useState<string | null>(null),
    [compare, setCompare] = useState<string[]>([]),
    [message, setMessage] = useState("Loading institution directory…");
  useEffect(() => {
    let cancelled = false;
    setCatalog([]);
    setMessage("Loading institution directory…");
    void (async () => {
      try {
        const rows = await loadEducationCatalog(kind);
        if (!cancelled) {
          setCatalog(rows);
          setMessage("");
        }
      } catch (e) {
        if (!cancelled)
          setMessage(e instanceof Error ? e.message : "Directory unavailable");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);
  const availableCatalog = useMemo(() => {
    // One row per institution, from the newest directory vintage that has
    // already begun at this save's date. Which vintages exist is the shipped
    // catalog's business, not this panel's.
    const expected = preferredAcademicYear(
      catalog.map((r) => r.sourceYear),
      world.currentDate,
    );
    const byId = new Map<string, EducationInstitution>();
    for (const r of catalog) {
      const prior = byId.get(r.id);
      if (!prior || r.sourceYear === expected) byId.set(r.id, r);
    }
    return [...byId.values()];
  }, [catalog, world.currentDate]);
  const result = useMemo(() => {
    if (wide || world.control.kind !== "person")
      return searchInstitutions(availableCatalog, query, kind, offset);
    const nearby = projectRelevantEducationDirectory(
      world,
      world.control.personId,
      availableCatalog,
      query,
      kind,
      offset,
    );
    return { ...nearby, rows: nearby.rows.map((row) => row.institution) };
  }, [availableCatalog, query, kind, offset, wide, world]);
  const institution = availableCatalog.find((r) => r.id === selected);
  const [grace, setGrace] = useState<Record<string, string>>({});
  const act = (result: { ok: boolean; world: World; message: string }) => {
    setMessage(result.message);
    if (result.ok) onWorldChange(result.world);
  };
  return (
    <section aria-label="Real education options">
      <h3>Find a school or college</h3>
      {world.control.kind === "person" &&
        world.history.educationEnrollments
          .filter(
            (e) =>
              world.control.kind === "person" &&
              e.personId === world.control.personId &&
              e.programKind.startsWith("postsecondary:edu-path7-"),
          )
          .map((e) => {
            const path = pathForRelationship(world, e.id);
            if (!path) return null;
            return (
              <p key={e.id}>
                {path.title}: {studyEnrollmentProgressLabel(world, e.id, path)}
              </p>
            );
          })}
      {world.history.educationEnrollments
        .filter(
          (e) =>
            world.control.kind === "person" &&
            e.personId === world.control.personId &&
            e.programKind.startsWith("postsecondary:edu-path7-") &&
            !acceptedEducationPath(world, e.id),
        )
        .map((e) => (
          <p key={e.id}>
            Saved study {e.programKind}: accepted terms unavailable or
            unsupported. Enrollment history is preserved; progression is
            unavailable.
          </p>
        ))}
      <p>
        NCES school (2024–25) and college (2024–25 / 2025–26) directories and
        reported offerings. A listing establishes neither attendance nor
        admission. Study fees and schedules shown below are game-authored.
      </p>
      <label>
        Search institutions{" "}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOffset(0);
          }}
        />
      </label>
      <label>
        Institution type{" "}
        <GameSelect
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setOffset(0);
          }}
        >
          <option value="">All institutions</option>
          <option value="postsecondary">Colleges</option>
          <option value="school">Public schools</option>
          <option value="district">School districts</option>
        </GameSelect>
      </label>
      <p>
        {result.total.toLocaleString("en-US")} matching institutions
        {!wide && !query.trim()
          ? " in your home state or district"
          : " across the directory"}
        .
      </p>
      <button
        type="button"
        className="ui-action"
        onClick={() => {
          setWide(!wide);
          setOffset(0);
        }}
      >
        {wide ? "Start near home" : "Browse the full directory"}
      </button>
      <ul>
        {result.rows.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => setSelected(r.id)}>
              {r.name} — {r.city}, {r.state}
            </button>
            <label>
              <input
                type="checkbox"
                checked={compare.includes(r.id)}
                onChange={(e) =>
                  setCompare(
                    e.target.checked
                      ? [...compare, r.id]
                      : compare.filter((id) => id !== r.id),
                  )
                }
              />
              Compare
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={offset === 0}
        onClick={() => setOffset(Math.max(0, offset - 30))}
      >
        Previous institutions
      </button>
      <button
        type="button"
        disabled={offset + 30 >= result.total}
        onClick={() => setOffset(offset + 30)}
      >
        More institutions
      </button>
      {compare.length > 0 && (
        <table>
          <caption>Compare reported institution facts</caption>
          <thead>
            <tr>
              <th>Institution</th>
              <th>Reported status</th>
              <th>Offered capabilities</th>
            </tr>
          </thead>
          <tbody>
            {availableCatalog
              .filter((r) => compare.includes(r.id))
              .map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.statusLabel}</td>
                  <td>
                    {r.capabilities
                      .filter((c) => c.state === "offered")
                      .map((c) => c.label)
                      .join(", ")}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
      {institution && (
        <section aria-label="Institution details">
          <h4>{institution.name}</h4>
          <p>{institution.statusLabel}</p>
          {/*
            The record id, the release stage and the county GEOID belonged to
            whoever compiled the directory. What a prospective student needs to
            know is that the listing does not go as far as prices and entry
            requirements, which is said as a person would say it.
          */}
          <p>
            The directory doesn&apos;t list tuition or entry requirements.
            You&apos;d have to ask them.
          </p>
          <ul>
            {institution.capabilities
              .filter((c) => c.state === "offered")
              .map((c) => (
                <li key={c.code}>
                  {c.label}
                  {c.kind === "noncredit" ? (
                    <>
                      <p>
                        {educationOptionReason(world, institution, c) ??
                          `Game-authored option: ${studyProgramCostLabel(studyDefinition(institution, c))} Completion records noncredit study, never a degree or license.`}
                      </p>
                      <button
                        type="button"
                        disabled={
                          !!educationOptionReason(world, institution, c)
                        }
                        onClick={() =>
                          act(applyForEducation(world, institution, c.code))
                        }
                      >
                        Request {c.label.trim()} study offer
                      </button>
                    </>
                  ) : (
                    <p>Listed here, but not something you can apply for.</p>
                  )}
                </li>
              ))}
          </ul>
        </section>
      )}
      {pendingEducationOffers(world).map((offer) => {
        const terms = parseEducationTerms(offer.description);
        return (
          <section key={offer.id} aria-label="Study offer">
            <h4>Review noncredit study offer</h4>
            <p>
              {terms ? (
                <>
                  Offered by {terms.path.organizationName}:{" "}
                  {studyProgramCostLabel(terms.path)} Completion leads to{" "}
                  {terms.path.credential}. Tuition is due at period end from
                  available personal cash. No automatic loan or free tuition.{" "}
                  {terms.version === 1
                    ? "Legacy offer: accept today or request current terms."
                    : "These saved terms remain available until accepted or declined; applications need no written response."}
                </>
              ) : (
                "Saved offer terms are unavailable; do not substitute today's catalog."
              )}
            </p>
            {terms?.version === 2 ? (
              <>
                <label>
                  Tuition grace days for offer from{" "}
                  {terms.path.organizationName}{" "}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      grace[offer.id] ??
                      String(
                        terms.path.tuitionGraceDays ??
                          DEFAULT_AUTHORED_TUITION_GRACE_DAYS,
                      )
                    }
                    onChange={(e) =>
                      setGrace({ ...grace, [offer.id]: e.target.value })
                    }
                  />
                </label>
                <p>
                  This editable, game-authored grace starts if tuition cannot be
                  funded at period end. At the disclosed deadline, only study
                  pauses; work and the World continue. Accepting freezes these
                  terms for this enrollment.
                </p>
              </>
            ) : null}
            <button
              type="button"
              disabled={!terms}
              onClick={() =>
                act(
                  respondToEducationOffer(world, offer.id, true, {
                    tuitionGraceDays:
                      grace[offer.id] === undefined
                        ? terms?.path.tuitionGraceDays
                        : (grace[offer.id] ?? "").trim() === ""
                          ? NaN
                          : Number(grace[offer.id]),
                  }),
                )
              }
            >
              Accept study offer
            </button>
            <button
              type="button"
              onClick={() =>
                act(respondToEducationOffer(world, offer.id, false))
              }
            >
              Decline study offer
            </button>
          </section>
        );
      })}
      <p role="status">{message}</p>
    </section>
  );
}
