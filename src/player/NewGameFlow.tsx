import { useMemo, useState } from "react";

import {
  LIFE_START_MAX_AGE,
  LIFE_START_MIN_AGE,
  LIFE_START_PLACES,
  LIFE_START_POLICY_QUESTIONS,
  type LifeStartDepth,
  type LifeStartFriendAnswer,
  type LifeStartHistoryAnchor,
  type LifeStartHouseholdKind,
  type LifeStartHousingKind,
  type LifeStartInput,
  type LifeStartPlaceKey,
  type LifeStartPolicyAnswer,
  type LifeStartPolicyKey,
  type LifeStartRiskAnswer,
} from "../simulation";

export type NewLifeDraft = Omit<LifeStartInput, "seed">;

interface NewGameFlowProps {
  readonly isStarting: boolean;
  readonly error: string | null;
  readonly onCancel: () => void;
  readonly onBegin: (draft: NewLifeDraft) => void;
}

const PAGE_KEYS = [
  "identity",
  "places",
  "circumstances",
  "history",
  "questions",
  "review",
] as const;

const POLICY_ANSWERS: readonly {
  value: LifeStartPolicyAnswer;
  label: string;
}[] = [
  { value: "support", label: "Support" },
  { value: "oppose", label: "Oppose" },
  { value: "uncertain", label: "Uncertain" },
  { value: "skip", label: "Skip" },
];

export function NewGameFlow({
  isStarting,
  error,
  onCancel,
  onBegin,
}: NewGameFlowProps) {
  const [step, setStep] = useState(0);
  const [givenName, setGivenName] = useState("Jordan");
  const [familyName, setFamilyName] = useState("Reed");
  const [startAge, setStartAge] = useState(16);
  const [birthplace, setBirthplace] =
    useState<LifeStartPlaceKey>("lexington-kentucky");
  const [hometown, setHometown] =
    useState<LifeStartPlaceKey>("lexington-kentucky");
  const [currentResidence, setCurrentResidence] =
    useState<LifeStartPlaceKey>("lexington-kentucky");
  const [householdKind, setHouseholdKind] =
    useState<LifeStartHouseholdKind>("family");
  const [housingKind, setHousingKind] =
    useState<LifeStartHousingKind>("unknown");
  const [fundsText, setFundsText] = useState("");
  const [depth, setDepth] = useState<LifeStartDepth>("play-from-here");
  const [historyAnchors, setHistoryAnchors] = useState<
    readonly LifeStartHistoryAnchor[]
  >([
    { date: "", summary: "" },
    { date: "", summary: "" },
  ]);
  const [friendAnswer, setFriendAnswer] =
    useState<LifeStartFriendAnswer>("skip");
  const [riskAnswer, setRiskAnswer] = useState<LifeStartRiskAnswer>("skip");
  const [includePolitics, setIncludePolitics] = useState(false);
  const [policyAnswers, setPolicyAnswers] = useState<
    Readonly<Record<LifeStartPolicyKey, LifeStartPolicyAnswer>>
  >({
    "collective-bargaining": "skip",
    "clean-electricity": "skip",
  });

  const page = PAGE_KEYS[step] ?? "review";
  const canContinue =
    givenName.trim().length > 0 && familyName.trim().length > 0;
  const chosenResidence = useMemo(
    () =>
      LIFE_START_PLACES.find((place) => place.key === currentResidence) ??
      LIFE_START_PLACES[0],
    [currentResidence],
  );

  function setAge(value: number) {
    const age = Math.max(
      LIFE_START_MIN_AGE,
      Math.min(LIFE_START_MAX_AGE, Math.floor(value)),
    );
    setStartAge(age);
    if (age < 18 && householdKind === "alone") setHouseholdKind("family");
  }

  function setAnchor(
    index: number,
    field: keyof LifeStartHistoryAnchor,
    value: string,
  ) {
    setHistoryAnchors((current) =>
      current.map((anchor, anchorIndex) =>
        anchorIndex === index ? { ...anchor, [field]: value } : anchor,
      ),
    );
  }

  function makeDraft(): NewLifeDraft {
    const startingFundsUsd =
      fundsText.trim().length === 0 ? null : Number(fundsText);
    return {
      givenName: givenName.trim(),
      familyName: familyName.trim(),
      startAge,
      depth,
      birthplace,
      hometown,
      currentResidence,
      householdKind,
      housingKind,
      startingFundsUsd,
      historyAnchors: depth === "build-my-history" ? historyAnchors : [],
      friendAnswer,
      riskAnswer,
      policyAnswers: includePolitics ? policyAnswers : {},
    };
  }

  return (
    <main className="new-life" data-testid="new-game-flow">
      <header className="new-life__header">
        <button type="button" className="life-text-button" onClick={onCancel}>
          Return to title
        </button>
        <div>
          <p className="life-kicker">Create a life</p>
          <h1>{page === "review" ? "Your beginning" : "Begin as a person"}</h1>
        </div>
        <p
          className="new-life__progress"
          aria-label={`Step ${step + 1} of ${PAGE_KEYS.length}`}
        >
          {step + 1} / {PAGE_KEYS.length}
        </p>
      </header>

      <section className="new-life__body">
        {page === "identity" ? (
          <>
            <fieldset className="life-choice-group">
              <legend>Name</legend>
              <div className="life-form-row">
                <label>
                  First name
                  <input
                    value={givenName}
                    maxLength={32}
                    onChange={(event) => setGivenName(event.target.value)}
                    autoComplete="given-name"
                  />
                </label>
                <label>
                  Last name
                  <input
                    value={familyName}
                    maxLength={32}
                    onChange={(event) => setFamilyName(event.target.value)}
                    autoComplete="family-name"
                  />
                </label>
              </div>
            </fieldset>
            <fieldset className="life-choice-group">
              <legend>Starting age</legend>
              <p className="life-choice-group__intro">
                Start in childhood, the teenage years, or adulthood.
              </p>
              <div className="life-age-control">
                <input
                  aria-label="Starting age"
                  data-testid="starting-age"
                  type="range"
                  min={LIFE_START_MIN_AGE}
                  max={LIFE_START_MAX_AGE}
                  value={startAge}
                  onChange={(event) => setAge(Number(event.target.value))}
                />
                <label>
                  Age
                  <input
                    aria-label="Starting age in years"
                    type="number"
                    min={LIFE_START_MIN_AGE}
                    max={LIFE_START_MAX_AGE}
                    value={startAge}
                    onChange={(event) => setAge(Number(event.target.value))}
                  />
                </label>
              </div>
              <p>
                You will begin at age <strong>{startAge}</strong>.
              </p>
            </fieldset>
          </>
        ) : null}

        {page === "places" ? (
          <fieldset className="life-choice-group">
            <legend>Your places</legend>
            <p className="life-choice-group__intro">
              These can be different. Choosing a real place does not claim that
              every local rule is already available there.
            </p>
            <div className="life-place-grid">
              <PlaceSelect
                label="Birthplace"
                value={birthplace}
                onChange={setBirthplace}
              />
              <PlaceSelect
                label="Hometown"
                value={hometown}
                onChange={setHometown}
              />
              <PlaceSelect
                label="Current residence"
                value={currentResidence}
                onChange={setCurrentResidence}
              />
            </div>
            <p className="life-place-note">{chosenResidence?.description}</p>
          </fieldset>
        ) : null}

        {page === "circumstances" ? (
          <>
            <fieldset className="life-choice-group">
              <legend>Household</legend>
              <div className="life-choice-grid life-choice-grid--three">
                <Choice
                  name="household"
                  value="family"
                  checked={householdKind === "family"}
                  title="Family household"
                  description="You live in a family household. No unchosen relatives are invented."
                  onChange={() => setHouseholdKind("family")}
                />
                <Choice
                  name="household"
                  value="shared"
                  checked={householdKind === "shared"}
                  title="Shared household"
                  description="You share a household. Other people remain unknown until established."
                  onChange={() => setHouseholdKind("shared")}
                />
                {startAge >= 18 ? (
                  <Choice
                    name="household"
                    value="alone"
                    checked={householdKind === "alone"}
                    title="Own household"
                    description="You begin in a one-person household."
                    onChange={() => setHouseholdKind("alone")}
                  />
                ) : null}
              </div>
            </fieldset>
            <fieldset className="life-choice-group">
              <legend>Housing and resources</legend>
              <div className="life-form-row">
                <label>
                  Housing
                  <select
                    aria-label="Housing"
                    value={housingKind}
                    onChange={(event) =>
                      setHousingKind(event.target.value as LifeStartHousingKind)
                    }
                  >
                    <option value="unknown">Leave unknown</option>
                    <option value="family-home">Family home</option>
                    <option value="renting">Renting</option>
                    <option value="owning">Owned by the household</option>
                    <option value="hosted">Hosted by someone else</option>
                  </select>
                </label>
                <label>
                  Available funds in dollars (optional)
                  <input
                    aria-label="Available funds in dollars"
                    type="number"
                    min="0"
                    max="100000000"
                    step="1"
                    value={fundsText}
                    onChange={(event) => setFundsText(event.target.value)}
                    placeholder="Leave blank if unknown"
                  />
                </label>
              </div>
              <p className="life-choice-group__intro">
                Exact money is recorded only when you enter it. Wealth does not
                define intelligence, morality, ideology, or personality.
              </p>
            </fieldset>
          </>
        ) : null}

        {page === "history" ? (
          <>
            <fieldset className="life-choice-group">
              <legend>How much history?</legend>
              <div className="life-choice-grid life-choice-grid--two">
                <Choice
                  name="depth"
                  value="play-from-here"
                  checked={depth === "play-from-here"}
                  title="Play From Here"
                  description="Begin at your chosen age. Anything you did not establish can remain unknown."
                  onChange={() => setDepth("play-from-here")}
                />
                <Choice
                  name="depth"
                  value="build-my-history"
                  checked={depth === "build-my-history"}
                  title="Build My History"
                  description="Add important facts from earlier in your life before play begins."
                  onChange={() => setDepth("build-my-history")}
                />
              </div>
            </fieldset>
            {depth === "build-my-history" ? (
              <fieldset className="life-choice-group">
                <legend>Important moments</legend>
                <p className="life-choice-group__intro">
                  Add only what you want to make true. Dates and descriptions
                  become part of your history.
                </p>
                {historyAnchors.map((anchor, index) => (
                  <div className="life-history-anchor" key={index}>
                    <label>
                      Date
                      <input
                        aria-label={`History date ${index + 1}`}
                        type="date"
                        max="2026-01-05"
                        value={anchor.date}
                        onChange={(event) =>
                          setAnchor(index, "date", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      What happened
                      <input
                        aria-label={`History description ${index + 1}`}
                        maxLength={180}
                        value={anchor.summary}
                        onChange={(event) =>
                          setAnchor(index, "summary", event.target.value)
                        }
                        placeholder="Leave blank to skip this moment"
                      />
                    </label>
                  </div>
                ))}
              </fieldset>
            ) : null}
          </>
        ) : null}

        {page === "questions" ? (
          <>
            <fieldset className="life-choice-group">
              <legend>A couple of situations</legend>
              <p className="life-choice-group__intro">
                These answers are only a first impression. Your choices during
                play can change who you become.
              </p>
              <label>
                A friend is in trouble. What matters most right now?
                <select
                  aria-label="Friend in trouble"
                  value={friendAnswer}
                  onChange={(event) =>
                    setFriendAnswer(event.target.value as LifeStartFriendAnswer)
                  }
                >
                  <option value="skip">Skip</option>
                  <option value="truth">Tell the truth</option>
                  <option value="loyalty">Stand by the friend</option>
                  <option value="stay-out">Stay out of it</option>
                </select>
              </label>
              <label>
                A safe path is available, but another path could offer more.
                <select
                  aria-label="Safe path or risky upside"
                  value={riskAnswer}
                  onChange={(event) =>
                    setRiskAnswer(event.target.value as LifeStartRiskAnswer)
                  }
                >
                  <option value="skip">Skip</option>
                  <option value="safe">Take the safer path</option>
                  <option value="risk">Take the chance</option>
                  <option value="learn-more">Gather more information</option>
                </select>
              </label>
            </fieldset>
            <fieldset className="life-choice-group">
              <legend>Political views (optional)</legend>
              <label className="life-settings-check">
                <input
                  type="checkbox"
                  checked={includePolitics}
                  onChange={(event) => setIncludePolitics(event.target.checked)}
                />
                <span>
                  <strong>Answer direct policy questions</strong>
                  <small>
                    No party is selected or inferred. You can skip every
                    question.
                  </small>
                </span>
              </label>
              {includePolitics
                ? LIFE_START_POLICY_QUESTIONS.map((question) => (
                    <label key={question.key}>
                      {question.question}
                      <select
                        aria-label={question.question}
                        value={policyAnswers[question.key]}
                        onChange={(event) =>
                          setPolicyAnswers((current) => ({
                            ...current,
                            [question.key]: event.target
                              .value as LifeStartPolicyAnswer,
                          }))
                        }
                      >
                        {POLICY_ANSWERS.map((answer) => (
                          <option key={answer.value} value={answer.value}>
                            {answer.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))
                : null}
            </fieldset>
          </>
        ) : null}

        {page === "review" ? (
          <div className="life-review" data-testid="life-start-review">
            <div className="life-review__identity">
              <p className="life-kicker">Ready to begin</p>
              <h2>
                {givenName.trim()} {familyName.trim()}
              </h2>
              <p>
                Age {startAge} · {chosenResidence?.displayName}
              </p>
            </div>
            <dl>
              <div>
                <dt>Birthplace</dt>
                <dd>{placeLabel(birthplace)}</dd>
              </div>
              <div>
                <dt>Hometown</dt>
                <dd>{placeLabel(hometown)}</dd>
              </div>
              <div>
                <dt>Residence</dt>
                <dd>{placeLabel(currentResidence)}</dd>
              </div>
              <div>
                <dt>History</dt>
                <dd>
                  {depth === "play-from-here"
                    ? "Play From Here"
                    : "Build My History"}
                </dd>
              </div>
              <div>
                <dt>Politics</dt>
                <dd>
                  {includePolitics ? "Direct answers only" : "Skipped for now"}
                </dd>
              </div>
            </dl>
            <p className="life-review__note">
              Unknown work, education, family details, and past events will
              remain unknown. They will not be filled in for you.
            </p>
            {error ? (
              <p className="life-message life-message--error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <footer className="new-life__footer">
        <button
          type="button"
          className="life-button life-button--quiet"
          onClick={() =>
            step === 0 ? onCancel() : setStep((value) => Math.max(0, value - 1))
          }
        >
          Back
        </button>
        {page === "review" ? (
          <button
            type="button"
            className="life-button life-button--primary"
            disabled={isStarting || !canContinue}
            onClick={() => onBegin(makeDraft())}
          >
            {isStarting ? "Beginning…" : "Begin Life"}
          </button>
        ) : (
          <button
            type="button"
            className="life-button life-button--primary"
            disabled={!canContinue}
            onClick={() =>
              setStep((value) => Math.min(PAGE_KEYS.length - 1, value + 1))
            }
          >
            Continue
          </button>
        )}
      </footer>
    </main>
  );
}

function PlaceSelect({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: LifeStartPlaceKey;
  readonly onChange: (value: LifeStartPlaceKey) => void;
}) {
  return (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as LifeStartPlaceKey)}
      >
        {LIFE_START_PLACES.map((place) => (
          <option key={place.key} value={place.key}>
            {place.displayName}
          </option>
        ))}
      </select>
    </label>
  );
}

function Choice({
  name,
  value,
  checked,
  title,
  description,
  onChange,
}: {
  readonly name: string;
  readonly value: string;
  readonly checked: boolean;
  readonly title: string;
  readonly description: string;
  readonly onChange: () => void;
}) {
  return (
    <label className="life-choice-card" data-selected={checked}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      <span className="life-choice-card__title">{title}</span>
      <span>{description}</span>
    </label>
  );
}

function placeLabel(key: LifeStartPlaceKey): string {
  return (
    LIFE_START_PLACES.find((place) => place.key === key)?.displayName ??
    "Unknown"
  );
}
