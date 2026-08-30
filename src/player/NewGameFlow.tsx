import { useMemo, useState } from "react";

import {
  LIFE_START_PLACES,
  type LifeStartAge,
  type LifeStartApproachKey,
  type LifeStartBackground,
  type LifeStartInput,
  type LifeStartPartyAffiliation,
  type LifeStartPlaceKey,
  type LifeStartValueKey,
} from "../simulation";

export type NewLifeDraft = Omit<LifeStartInput, "seed">;

interface NewGameFlowProps {
  readonly isStarting: boolean;
  readonly error: string | null;
  readonly onCancel: () => void;
  readonly onBegin: (draft: NewLifeDraft) => void;
}

const AGES: readonly {
  key: LifeStartAge;
  label: string;
  description: string;
}[] = [
  {
    key: 25,
    label: "Age 25",
    description: "Young adult beginning a career and local civic awareness.",
  },
  {
    key: 32,
    label: "Age 32",
    description:
      "Established professional with neighborhood ties and community roots.",
  },
  {
    key: 40,
    label: "Age 40",
    description:
      "Experienced leader with substantive career and community background.",
  },
  {
    key: 48,
    label: "Age 48",
    description:
      "Seasoned resident with deep local relationships and civic history.",
  },
];

const AFFILIATIONS: readonly {
  key: LifeStartPartyAffiliation;
  label: string;
  description: string;
}[] = [
  {
    key: "independent",
    label: "Independent / Unaffiliated",
    description:
      "Pragmatic, nonpartisan approach focused on local neighborhood priorities.",
  },
  {
    key: "democratic",
    label: "Democratic",
    description:
      "Focused on community investments, public services, and neighborhood equity.",
  },
  {
    key: "republican",
    label: "Republican",
    description:
      "Focused on fiscal responsibility, economic vitality, and local stewardship.",
  },
];

const BACKGROUNDS: readonly {
  key: LifeStartBackground;
  label: string;
  description: string;
}[] = [
  {
    key: "neighborhood-advocate",
    label: "Neighborhood Advocate",
    description:
      "Active in local association meetings, zoning discussions, and community concerns.",
  },
  {
    key: "civic-organizer",
    label: "Civic & Nonprofit Organizer",
    description:
      "Coordinates local volunteer efforts, public programs, and community initiatives.",
  },
  {
    key: "local-business",
    label: "Local Business Owner",
    description:
      "Manages a small enterprise in Fayette County and values vibrant local commerce.",
  },
  {
    key: "public-service",
    label: "Public Service Specialist",
    description:
      "Background in municipal programs, policy analysis, and community operations.",
  },
];

const VALUES: readonly {
  key: LifeStartValueKey;
  label: string;
  description: string;
}[] = [
  {
    key: "service",
    label: "Public Service",
    description: "Show up when neighbors and community members need help.",
  },
  {
    key: "fairness",
    label: "Fairness & Integrity",
    description:
      "Care about transparent rules, honest process, and equal respect.",
  },
  {
    key: "family",
    label: "Family & Community",
    description: "Protect loved ones and build long-term local stability.",
  },
  {
    key: "achievement",
    label: "Achievement & Results",
    description:
      "Deliver practical improvements and earned, tangible progress.",
  },
];

const APPROACHES: readonly {
  key: LifeStartApproachKey;
  label: string;
  description: string;
}[] = [
  {
    key: "cautious",
    label: "Deliberate & Careful",
    description:
      "Prepare thoroughly, listen closely, and protect what you have.",
  },
  {
    key: "risk-seeking",
    label: "Proactive & Bold",
    description:
      "Embrace worthwhile opportunities and act decisively under uncertainty.",
  },
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
  const [startAge, setStartAge] = useState<LifeStartAge>(32);
  const [partyAffiliation, setPartyAffiliation] =
    useState<LifeStartPartyAffiliation>("independent");
  const [background, setBackground] = useState<LifeStartBackground>(
    "neighborhood-advocate",
  );
  const [declaredValue, setDeclaredValue] =
    useState<LifeStartValueKey>("service");
  const [declaredApproach, setDeclaredApproach] =
    useState<LifeStartApproachKey>("cautious");

  const steps = useMemo(
    () => ["identity", "background", "outlook", "review"],
    [],
  );
  const page = steps[step] ?? "review";
  const canContinue =
    givenName.trim().length > 0 && familyName.trim().length > 0;

  function makeDraft(): NewLifeDraft {
    return {
      givenName: givenName.trim(),
      familyName: familyName.trim(),
      startAge,
      partyAffiliation,
      background,
      birthplace: "lexington-fayette" as LifeStartPlaceKey,
      hometown: "lexington-fayette" as LifeStartPlaceKey,
      currentResidence: "lexington-fayette" as LifeStartPlaceKey,
      declaredValue,
      declaredApproach,
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
          <h1>
            {page === "review" ? "Your beginning" : "Shape your character"}
          </h1>
        </div>
        <p
          className="new-life__progress"
          aria-label={`Step ${step + 1} of ${steps.length}`}
        >
          {step + 1} / {steps.length}
        </p>
      </header>

      <section className="new-life__body">
        {page === "identity" ? (
          <>
            <fieldset className="life-choice-group">
              <legend>Name & Identity</legend>
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
              <legend>Starting Age</legend>
              <div className="life-choice-grid life-choice-grid--four">
                {AGES.map((item) => (
                  <label
                    className="life-choice-card life-choice-card--compact"
                    data-selected={startAge === item.key}
                    key={item.key}
                  >
                    <input
                      type="radio"
                      name="age"
                      value={item.key}
                      checked={startAge === item.key}
                      onChange={() => setStartAge(item.key)}
                    />
                    <span className="life-choice-card__title">
                      {item.label}
                    </span>
                    <span>{item.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="life-choice-group">
              <legend>Starting Scenario</legend>
              <div className="life-place-grid">
                <label>
                  Location
                  <span>Where active life begins</span>
                  <select value="lexington-fayette" disabled>
                    {LIFE_START_PLACES.map((place) => (
                      <option key={place.key} value={place.key}>
                        {place.jurisdiction.name},{" "}
                        {place.jurisdiction.parentName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </fieldset>
          </>
        ) : null}

        {page === "background" ? (
          <>
            <fieldset className="life-choice-group">
              <legend>Background & Occupation</legend>
              <div className="life-choice-grid life-choice-grid--two">
                {BACKGROUNDS.map((item) => (
                  <label
                    className="life-choice-card"
                    data-selected={background === item.key}
                    key={item.key}
                  >
                    <input
                      type="radio"
                      name="background"
                      value={item.key}
                      checked={background === item.key}
                      onChange={() => setBackground(item.key)}
                    />
                    <span className="life-choice-card__title">
                      {item.label}
                    </span>
                    <span>{item.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ) : null}

        {page === "outlook" ? (
          <>
            <fieldset className="life-choice-group">
              <legend>Political Affiliation & Perspective</legend>
              <div className="life-choice-grid life-choice-grid--three">
                {AFFILIATIONS.map((item) => (
                  <label
                    className="life-choice-card"
                    data-selected={partyAffiliation === item.key}
                    key={item.key}
                  >
                    <input
                      type="radio"
                      name="affiliation"
                      value={item.key}
                      checked={partyAffiliation === item.key}
                      onChange={() => setPartyAffiliation(item.key)}
                    />
                    <span className="life-choice-card__title">
                      {item.label}
                    </span>
                    <span>{item.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="life-choice-group">
              <legend>Guiding Value</legend>
              <div className="life-choice-grid life-choice-grid--four">
                {VALUES.map((item) => (
                  <label
                    className="life-choice-card life-choice-card--compact"
                    data-selected={declaredValue === item.key}
                    key={item.key}
                  >
                    <input
                      type="radio"
                      name="value"
                      value={item.key}
                      checked={declaredValue === item.key}
                      onChange={() => setDeclaredValue(item.key)}
                    />
                    <span className="life-choice-card__title">
                      {item.label}
                    </span>
                    <span>{item.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="life-choice-group">
              <legend>Approach to Decision-Making</legend>
              <div className="life-choice-grid life-choice-grid--two">
                {APPROACHES.map((item) => (
                  <label
                    className="life-choice-card"
                    data-selected={declaredApproach === item.key}
                    key={item.key}
                  >
                    <input
                      type="radio"
                      name="approach"
                      value={item.key}
                      checked={declaredApproach === item.key}
                      onChange={() => setDeclaredApproach(item.key)}
                    />
                    <span className="life-choice-card__title">
                      {item.label}
                    </span>
                    <span>{item.description}</span>
                  </label>
                ))}
              </div>
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
              <p>Age {startAge} · Lexington, Kentucky</p>
            </div>
            <dl>
              <div>
                <dt>Location</dt>
                <dd>Lexington-Fayette, Kentucky</dd>
              </div>
              <div>
                <dt>Background</dt>
                <dd>{BACKGROUNDS.find((b) => b.key === background)?.label}</dd>
              </div>
              <div>
                <dt>Political Outlook</dt>
                <dd>
                  {AFFILIATIONS.find((a) => a.key === partyAffiliation)?.label}
                </dd>
              </div>
              <div>
                <dt>Core Value</dt>
                <dd>{VALUES.find((v) => v.key === declaredValue)?.label}</dd>
              </div>
              <div>
                <dt>Approach</dt>
                <dd>
                  {APPROACHES.find((a) => a.key === declaredApproach)?.label}
                </dd>
              </div>
            </dl>
            <p className="life-review__note">
              Your residence, occupation, local ties, and initial community
              connections will be established in Lexington.
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
              setStep((value) => Math.min(steps.length - 1, value + 1))
            }
          >
            Continue
          </button>
        )}
      </footer>
    </main>
  );
}
