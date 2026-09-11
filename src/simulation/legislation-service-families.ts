import {
  authored,
  type ClauseRendering,
  type ClauseTemplate,
  type LegalInstrument,
  type ProgramFamily,
  type ProgramParameterOption,
  type ProgramParameterSpec,
  type ProgramParameterValue,
  type ProgramVariant,
} from "./legislation-content-contracts";

/**
 * Prospective, authored service legislation. The research-utilization inventory
 * maps L06 to education, D03 to health, D04 to environment, D05 to procurement,
 * and D06 to social services, agriculture and veterans. Those rows are domain
 * mappings, not evidence that any clause below is enacted law or that any
 * programme, recipient, award, staffing level or outcome exists in this world.
 *
 * Missing empirical series withhold estimates, not drafts. Every operative
 * choice is authored. These templates create proposed text through the existing
 * drafting/docket writers and create no service, procurement or benefit engine.
 * Commencement remains a typed symbolic choice relative to future enactment.
 * The compiler's startsOn is its filing anchor, not proof that these duties
 * have begun; no enactment-date resolver or realization engine is added here.
 */

function prose(text: string, appliesToLabel: string): ClauseRendering {
  return {
    text,
    beneficiary: { kind: "general-application", appliesToLabel },
    fiscalExposureLabel: null,
    fiscalExposureMinorUnits: null,
  };
}

function option(
  value: string,
  label: string,
  clausePhrase: string,
): ProgramParameterOption {
  return { value, label, clausePhrase };
}

interface ServiceDraft {
  readonly key: string;
  readonly label: string;
  readonly synopsis: string;
  readonly instrument: LegalInstrument;
  readonly reach: string;
  readonly choiceLabel: string;
  /** Complete operative sentences; labels never become operative text. */
  readonly choices: readonly ProgramParameterOption[];
  readonly scopeText: string;
  readonly safeguard: string;
  readonly amendment: string;
  readonly amendmentGround: string;
  readonly limit: string;
  /** Whole-program ceiling only; never an annual or per-recipient amount. */
  readonly funding?: boolean;
}

function serviceVariant(input: ServiceDraft): ProgramVariant {
  const defaults: Record<string, ProgramParameterValue> = {
    "operative-choice": { kind: "enumerated", value: input.choices[0]!.value },
    commencement: { kind: "enumerated", value: "upon-enactment" },
  };
  const parameters: ProgramParameterSpec[] = [
    {
      key: "operative-choice",
      dimension: "oversight",
      kind: "enumerated",
      label: input.choiceLabel,
      options: input.choices,
      evidence: authored(
        `The ${input.label.toLowerCase()} alternatives are proposed fictional policy choices, not sourced requirements or measured conditions.`,
      ),
    },
    {
      key: "commencement",
      dimension: "timing",
      kind: "enumerated",
      label: "When the duty or authorization begins",
      options: [
        option(
          "upon-enactment",
          "Upon enactment",
          "This Act takes effect upon enactment.",
        ),
        option(
          "next-calendar-year",
          "The following calendar year",
          "This Act takes effect on January 1 of the calendar year following its enactment.",
        ),
      ],
      evidence: authored(
        "Authored prospective commencement alternatives; neither choice asserts that enactment has occurred.",
      ),
    },
  ];
  const clauses: ClauseTemplate[] = [
    {
      provisionKey: `${input.key}-scope`,
      dimension: "eligibility-scope",
      heading: "Application",
      parameterKey: null,
      render: () => prose(input.scopeText, input.reach),
    },
    {
      provisionKey: `${input.key}-operative-duty`,
      dimension: "oversight",
      heading: input.choiceLabel,
      parameterKey: "operative-choice",
      render: (resolved) =>
        prose(resolved.choice("operative-choice").clausePhrase, input.reach),
    },
    {
      provisionKey: `${input.key}-safeguard`,
      dimension: "oversight",
      heading: "Limits and safeguards",
      parameterKey: null,
      render: () => prose(input.safeguard, input.reach),
    },
    {
      provisionKey: `${input.key}-commencement`,
      dimension: "timing",
      heading: "Commencement",
      parameterKey: "commencement",
      render: (resolved) =>
        prose(resolved.choice("commencement").clausePhrase, input.reach),
    },
  ];
  if (input.funding) {
    defaults["programme-ceiling"] = {
      kind: "money",
      minorUnits: 600_000_000,
      currency: "USD",
    };
    parameters.push({
      key: "programme-ceiling",
      dimension: "funding-cap",
      kind: "money",
      label: "Total program authorization",
      minMinorUnits: 100_000_000,
      maxMinorUnits: 5_000_000_000,
      currency: "USD",
      evidence: authored(
        "An adjustable fictional whole-program authorization ceiling. These bounds and the default are design choices, not cost estimates or annual amounts.",
      ),
    });
    clauses.push({
      provisionKey: `${input.key}-programme-ceiling`,
      dimension: "funding-cap",
      heading: "Total authorization",
      parameterKey: "programme-ceiling",
      render: (resolved) => {
        const value = resolved.values["programme-ceiling"];
        if (!value || value.kind !== "money")
          throw new Error(
            "A service authorization requires a typed money ceiling.",
          );
        const amount = resolved.money("programme-ceiling");
        return {
          ...prose(
            `There is authorized not more than ${amount} in total for the program established by this Act. This is a single ceiling for the whole program, not a recurring authorization. No money is appropriated by this Act. No award may be paid without a separate appropriation and designation under applicable law of a public body to administer the program.`,
            input.reach,
          ),
          fiscalExposureLabel: `${amount} total program authorization`,
          fiscalExposureMinorUnits: value.minorUnits,
        };
      },
    });
  }
  return {
    variantKey: input.key,
    label: input.label,
    synopsis: input.synopsis,
    instrument: input.instrument,
    shortTitle: input.label,
    subjectClass: "general-policy",
    authorizesAppropriation: input.funding ?? false,
    defaults,
    parameters,
    clauses,
    amendmentInvitation: {
      provisionKey: `${input.key}-amendment`,
      sectionNumber: clauses.length + 1,
      heading: "Additional safeguard",
      beneficiaryLabel: input.reach,
      placeLabel: "the places reached by the proposed Act",
      statedGround: input.amendmentGround,
      segmentKey: `services.${input.key}`,
      requestedMinorUnits: 0,
      cappedMinorUnits: 0,
      render: () => input.amendment,
      evidence: authored(
        "An authored prospective amendment invitation. It asserts no observed hardship, recipient, award, adoption or expenditure.",
      ),
    },
    declaredLimits: [
      input.limit,
      "These clauses take effect only after enactment. Filing does not start the proposed duty or authorization, and no enactment date has been set.",
      "These are fictional proposals. Filing does not enact them or establish that any service has been delivered.",
      input.funding
        ? "The amount is a whole-program permission ceiling, not an appropriation, cost estimate or promised award."
        : "This configuration states no amount and appropriates nothing. Compliance may have costs that have not been estimated.",
    ],
  };
}

function serviceFamily(input: {
  readonly key: string;
  readonly title: string;
  readonly mechanism: string;
  readonly inventoryRow: string;
  readonly outcome: string;
  readonly missing: string;
  readonly variants: readonly ServiceDraft[];
}): ProgramFamily {
  return {
    familyKey: input.key,
    familyVersion: "v2",
    title: input.title,
    mechanism: input.mechanism,
    acceptedDimensions: [
      "eligibility-scope",
      "oversight",
      "timing",
      "funding-cap",
    ],
    structuralProvenance: [
      authored(
        `Research-utilization inventory ${input.inventoryRow} is cited only as the mapping of this subject to a researched domain. It supplies no enacted clause, current law or empirical value here. These prospective mechanisms and every operative choice are authored fiction using existing legislative instruments.`,
      ),
    ],
    intendedOutcome: {
      metricStableKey: `services.${input.key}`,
      baselineSeriesKey: `services:${input.key}`,
      statement: input.outcome,
      evidence: {
        kind: "forecast-claim",
        note: "An intended outcome is not a prediction; drafting this Act records no change to the world.",
        unavailableReason: input.missing,
      },
    },
    variants: input.variants.map(serviceVariant),
  };
}

export const SERVICE_FAMILIES: readonly ProgramFamily[] = [
  serviceFamily({
    key: "education-facilities",
    title: "Education facilities",
    mechanism:
      "Separates permission to support school repairs from the duty to disclose facility condition.",
    inventoryRow: "L06 (education)",
    outcome:
      "The condition and accessibility of public education facilities after any authorized work.",
    missing:
      "No facility-condition baseline, project completion record or defensible effect estimate is available for these proposed clauses.",
    variants: [
      {
        key: "school-repair-authorization",
        label: "School repair authorization",
        synopsis:
          "Authorizes a repair program for public education facilities, with a choice of project priority and a separate appropriation still required.",
        instrument: "programme-authorization",
        funding: true,
        reach: "public bodies operating public education facilities",
        scopeText:
          "A school repair assistance program is established. A public body operating a public education facility in this state may apply for assistance with repair of that facility; new construction is ineligible. Eligibility establishes no right to an award.",
        choiceLabel: "Which eligible repairs take priority",
        choices: [
          option(
            "safe-access",
            "Safe access and accessibility",
            "When ranking eligible applications, the administering body shall give priority to repairs needed for safe entry, exit and physical accessibility, and shall publish its reasons for each ranking.",
          ),
          option(
            "prevent-closure",
            "Preventing loss of use",
            "When ranking eligible applications, the administering body shall give priority to repairs needed to keep teaching spaces usable, and shall publish its reasons for each ranking.",
          ),
        ],
        safeguard:
          "An application shall identify the proposed repair and the evidence supporting its priority. A priority finding under this Act is not a finding that a building complies with any other law. Assistance may not be used for operating salaries.",
        amendment:
          "An applicant shall be allowed to correct an incomplete repair application before a final refusal is issued.",
        amendmentGround:
          "An opportunity to correct an application could preserve access without promising an award.",
        limit:
          "The text creates neither a facility inventory nor proof that any particular school needs repairs.",
      },
      {
        key: "school-condition-inventory",
        label: "School condition inventory",
        synopsis:
          "Requires public education operators to distinguish assessed conditions from unassessed facilities in a public inventory.",
        instrument: "oversight-reporting",
        reach: "public bodies operating public education facilities",
        scopeText:
          "This Act applies to every public body operating a public education facility in this state. It requires an inventory of facilities that body operates and authorizes no construction or repair.",
        choiceLabel: "What the inventory must disclose",
        choices: [
          option(
            "assessments",
            "Assessment date and findings",
            "The body shall publish annually the date and findings of each facility condition assessment it holds. A facility without an assessment shall be listed as unassessed, not sound.",
          ),
          option(
            "repair-plan",
            "Findings and intended repairs",
            "The body shall publish annually the date and findings of each facility condition assessment it holds, together with any proposed repair and whether funding has been authorized and appropriated. Unassessed facilities and unfunded proposals shall be identified explicitly.",
          ),
        ],
        safeguard:
          "The inventory shall omit personal information and details whose disclosure is restricted by applicable law. Omission shall be explained without disclosing protected material. Publication does not certify structural safety.",
        amendment:
          "The inventory shall identify which entries were corrected after publication and retain the date of each correction.",
        amendmentGround:
          "A dated correction record would let readers distinguish a new assessment from a correction to the old inventory.",
        limit:
          "No school record, assessment result or enrollment count is supplied by this configuration.",
      },
    ],
  }),
  serviceFamily({
    key: "health-service-capacity",
    title: "Health service capacity",
    mechanism:
      "Makes publicly operated service availability inspectable and requires continuity planning when a service is withdrawn.",
    inventoryRow: "D03 (health)",
    outcome:
      "The availability of public health services and continuity of access during service changes.",
    missing:
      "Service schedules, referral completion, capacity observations and an effect model are absent; no access improvement can be estimated.",
    variants: [
      {
        key: "service-availability-publication",
        label: "Public service availability notice",
        synopsis:
          "Requires public health facility operators to publish offered services and explicitly identify information they cannot verify.",
        instrument: "oversight-reporting",
        reach: "public bodies operating health facilities",
        scopeText:
          "This Act applies to a public body operating a health facility in this state and only to services that body offers. It creates no treatment entitlement and sets no clinical standard.",
        choiceLabel: "What must be published",
        choices: [
          option(
            "services",
            "Services and contact route",
            "The body shall review and publish annually the services it offers, their scheduled availability and a contact route for confirming access. Unverified availability shall be marked unverified.",
          ),
          option(
            "services-and-interruptions",
            "Services and interruptions",
            "The body shall review and publish annually the services it offers, their scheduled availability and a contact route for confirming access, and shall update the notice when it knows of a service interruption. Unverified availability shall be marked unverified.",
          ),
        ],
        safeguard:
          "No notice under this Act shall disclose patient information or promise a particular appointment, treatment outcome or waiting time.",
        amendment:
          "The body shall make the same service notice available on request without requiring internet access.",
        amendmentGround:
          "A public notice should remain accessible to a person who cannot use the online version.",
        limit:
          "The draft supplies no clinic, patient, waiting-time or staffing records.",
      },
      {
        key: "service-change-referral-plan",
        label: "Service change referral plan",
        synopsis:
          "Requires a public operator planning a service withdrawal to explain referral arrangements and their unknowns before the change.",
        instrument: "regulatory-requirement",
        reach: "public bodies planning withdrawal of a health service",
        scopeText:
          "A public body planning to withdraw a health service it operates in this state shall prepare a referral plan before the withdrawal. This Act does not require another provider to accept a referral.",
        choiceLabel: "What the plan must establish",
        choices: [
          option(
            "contact-verification",
            "Verify referral contacts",
            "The plan shall identify the proposed referral contacts, the date on which each contact was checked, and any unconfirmed acceptance conditions. It shall be made public before the planned withdrawal.",
          ),
          option(
            "access-review",
            "Contacts and access barriers",
            "The plan shall identify checked referral contacts, unconfirmed acceptance conditions, and known transport or communication barriers, and shall describe proposed steps to address those barriers. It shall be made public before the planned withdrawal.",
          ),
        ],
        safeguard:
          "Where an immediate safety need prevents advance publication, the body shall publish the plan and its reason for delayed notice as soon as that need permits. No patient record shall be published under this Act.",
        amendment:
          "The plan shall name a contact through which a person may report that a listed referral route does not accept inquiries.",
        amendmentGround:
          "A correction route would expose a referral that exists on paper but cannot be contacted.",
        limit:
          "A referral plan proves neither available treatment nor completion of any referral.",
      },
    ],
  }),
  serviceFamily({
    key: "environmental-monitoring",
    title: "Environmental monitoring",
    mechanism:
      "Preserves the difference between a recorded measurement, a monitoring gap and a proposed corrective response.",
    inventoryRow: "D04 (environment)",
    outcome:
      "The completeness of environmental monitoring and follow-through on disclosed corrective plans.",
    missing:
      "No applicable monitoring baseline, facility observations or causal compliance estimate is registered for these clauses.",
    variants: [
      {
        key: "monitoring-record-disclosure",
        label: "Environmental monitoring disclosure",
        synopsis:
          "Requires public operators to publish monitoring records they hold with methods, dates and missing observations.",
        instrument: "oversight-reporting",
        reach:
          "public bodies operating facilities subject to environmental monitoring",
        scopeText:
          "This Act applies to a public body operating a facility in this state for which monitoring is required under otherwise applicable environmental law. It changes no discharge limit, permit or monitoring standard.",
        choiceLabel: "How monitoring is disclosed",
        choices: [
          option(
            "observations",
            "Observations and missingness",
            "The body shall publish annually the monitoring observations it holds, with dates, units and methods, and identify required observations it does not hold. Missing observations shall not be reported as zero.",
          ),
          option(
            "quality-flags",
            "Observations and quality flags",
            "The body shall publish annually the monitoring observations it holds, with dates, units, methods and recorded quality flags, and identify required observations it does not hold. Estimates shall be distinguished from measurements, and missing observations shall not be reported as zero.",
          ),
        ],
        safeguard:
          "Material protected from publication by applicable law shall be omitted with an explanation of the applicable restriction. Publication under this Act is not a determination of compliance or permission to discharge.",
        amendment:
          "A corrected observation shall retain the original publication date and identify the reason for correction.",
        amendmentGround:
          "A correction should not erase the reader's ability to see why the record changed.",
        limit:
          "No environmental limit or measurement is invented, and no compliance decision is made.",
      },
      {
        key: "monitoring-gap-response",
        label: "Monitoring gap response plan",
        synopsis:
          "Requires a public operator to disclose how it proposes to address a recorded monitoring gap without treating the plan as a completed repair.",
        instrument: "regulatory-requirement",
        reach:
          "public bodies with a recorded gap in required environmental monitoring",
        scopeText:
          "Where a public body operating a facility in this state records a gap in monitoring required by otherwise applicable environmental law, it shall prepare a response plan. This Act creates no finding that such a gap exists.",
        choiceLabel: "What a response plan must contain",
        choices: [
          option(
            "steps",
            "Proposed steps and responsible role",
            "The body shall publish a description of the gap, its proposed steps to restore monitoring, and the role responsible for each step. Proposed work shall be identified as proposed until completion is recorded.",
          ),
          option(
            "verification",
            "Steps and completion evidence",
            "The body shall publish the gap, proposed steps, responsible roles and the evidence it intends to use to verify completion. It shall identify completed steps separately from those still proposed.",
          ),
        ],
        safeguard:
          "A response plan neither suspends an existing monitoring duty nor excuses an otherwise applicable penalty. No proposed step shall be reported as a measured environmental improvement.",
        amendment:
          "If the body revises its plan, it shall publish the revision date and reason while retaining the earlier plan.",
        amendmentGround:
          "Revision history would distinguish a changed plan from evidence that work was finished.",
        limit:
          "This configuration supplies no incident, gap, enforcement action or completion record.",
      },
    ],
  }),
  serviceFamily({
    key: "procurement-disclosure",
    title: "Procurement disclosure",
    mechanism:
      "Makes prospective award decisions and exceptions reviewable without creating fictional contracts or inferring misconduct.",
    inventoryRow: "D05 (procurement)",
    outcome:
      "The completeness and timeliness of public procurement explanations and exception reviews.",
    missing:
      "Contract awards, exception records, publication baselines and an effect estimate are absent.",
    variants: [
      {
        key: "award-reasons-publication",
        label: "Contract award reasons",
        synopsis:
          "Requires a public body awarding a contract to explain its choice using recorded selection criteria.",
        instrument: "oversight-reporting",
        reach: "public bodies awarding contracts",
        scopeText:
          "This Act applies to a contract awarded by a public body of this state after this Act takes effect. It changes no existing award and creates no preference for a bidder.",
        choiceLabel: "What the award notice must explain",
        choices: [
          option(
            "criteria",
            "Criteria and reasons",
            "After an award and before the first payment, the body shall publish the selected contractor, contract amount, selection criteria and recorded reasons for the selection.",
          ),
          option(
            "criteria-and-changes",
            "Reasons and later changes",
            "After an award and before the first payment, the body shall publish the selected contractor, contract amount, selection criteria and recorded reasons for the selection. Before payment under a later contract change, it shall publish the change and the recorded reason for it.",
          ),
        ],
        safeguard:
          "Information protected by applicable law shall be redacted with an explanation of the restriction. An award notice shall not state that a rejected bidder engaged in misconduct without a separate supported finding.",
        amendment:
          "A corrected award notice shall identify what changed and retain the original publication date.",
        amendmentGround:
          "Corrections should remain visible so readers can distinguish an amended notice from a different award.",
        limit:
          "No award, bidder, contract price or influence allegation is supplied by this text.",
      },
      {
        key: "emergency-procurement-review",
        label: "Emergency procurement review",
        synopsis:
          "Requires a recorded explanation and independent review when a public body uses an emergency procurement exception available under other law.",
        instrument: "oversight-reporting",
        reach: "public bodies invoking an emergency procurement exception",
        scopeText:
          "Where a public body of this state invokes an emergency exception to a procurement requirement under otherwise applicable law after this Act takes effect, the body shall record the authority and circumstances it relies on. This Act creates no new exception.",
        choiceLabel: "How the exception is reviewed",
        choices: [
          option(
            "annual-review",
            "Annual independent review",
            "The body shall arrange an annual review of its recorded uses of the exception by a person who did not approve those uses, and shall publish the review findings.",
          ),
          option(
            "annual-and-response",
            "Review and written response",
            "The body shall arrange an annual review of its recorded uses of the exception by a person who did not approve those uses, publish the findings, and publish a written response describing which recommendations it accepts and why.",
          ),
        ],
        safeguard:
          "A review under this Act does not itself invalidate a contract, establish misconduct or extend the emergency exception. Protected information shall be omitted with an explanation under applicable law.",
        amendment:
          "The review shall identify any use for which supporting records were unavailable, without treating absent records as proof that no exception was used.",
        amendmentGround:
          "An incomplete record should appear as a limitation of the review, not a clean finding.",
        limit:
          "The proposed review does not establish that an emergency or any exception use has occurred.",
      },
    ],
  }),
  serviceFamily({
    key: "social-service-access",
    title: "Social-service application access",
    mechanism:
      "Changes the handling of an application while preserving the underlying eligibility and benefit decision.",
    inventoryRow: "D06 (social services)",
    outcome:
      "Whether applicants can submit complete applications and understand decisions without new benefit entitlements.",
    missing:
      "Application completion, refusal reasons and service-access baselines have not been recorded or modeled.",
    variants: [
      {
        key: "application-access-duty",
        label: "Accessible assistance applications",
        synopsis:
          "Requires public assistance administrators to provide usable submission routes and explain incomplete applications.",
        instrument: "regulatory-requirement",
        reach: "public bodies receiving applications for public assistance",
        scopeText:
          "This Act applies where a public body of this state receives an application for public assistance under otherwise applicable law. It changes no eligibility threshold, benefit amount or authority to award assistance.",
        choiceLabel: "What an applicant must be offered",
        choices: [
          option(
            "non-digital",
            "A route without internet access",
            "The body shall offer a method of applying that does not require internet access, and shall explain which required information is missing before refusing an application as incomplete.",
          ),
          option(
            "correction-opportunity",
            "A submission route and correction opportunity",
            "The body shall offer a method of applying that does not require internet access, explain missing required information, and allow a reasonable opportunity to correct it before refusing an application as incomplete, subject to deadlines imposed by otherwise applicable law.",
          ),
        ],
        safeguard:
          "An explanation or correction opportunity does not establish eligibility, guarantee an award or extend a deadline fixed by other law. The body shall protect personal application information.",
        amendment:
          "The body shall provide an applicant with an acknowledgement of receipt stating whether further information is requested.",
        amendmentGround:
          "Acknowledgement would make submission distinguishable from approval and identify the next step.",
        limit:
          "The draft asserts no applicant, denial, caseworker or existing assistance program in this world.",
      },
    ],
  }),
  serviceFamily({
    key: "agricultural-conservation",
    title: "Agricultural conservation assistance",
    mechanism:
      "Conditions a new conservation assistance authorization on a documented practice and a choice of completion evidence.",
    inventoryRow: "D06 (agriculture)",
    outcome:
      "Completion of supported conservation practices and any measured soil or water effects.",
    missing:
      "No farm-practice baseline, project completion observations or soil and water effect model is available.",
    variants: [
      {
        key: "conservation-practice-authorization",
        label: "Conservation practice assistance",
        synopsis:
          "Authorizes support for proposed soil-retention and water-conservation work without predicting yields or environmental gains.",
        instrument: "programme-authorization",
        funding: true,
        reach: "operators of agricultural land proposing conservation work",
        scopeText:
          "A conservation practice assistance program is established. An operator of agricultural land in this state may apply for assistance for proposed work intended to retain soil or conserve water on that land. The application shall establish the operator's permission to undertake the work. Eligibility creates no entitlement to an award.",
        choiceLabel: "How completion must be documented",
        choices: [
          option(
            "operator-record",
            "Operator completion record",
            "An assistance agreement shall require a dated description and supporting records of completed work from the operator before final payment. The record shall distinguish completion of the practice from any estimate of its environmental effect.",
          ),
          option(
            "independent-check",
            "Independent completion check",
            "An assistance agreement shall require a dated completion check by a person who did not perform the work before final payment. The check shall distinguish work observed from work reported by the operator and shall not certify an unmeasured environmental effect.",
          ),
        ],
        safeguard:
          "Assistance under this Act is for the described conservation work, not compensation for a claimed yield loss. No applicant shall be promised a particular harvest, water saving or improvement in soil condition.",
        amendment:
          "An agreement shall identify what evidence would support a partial completion finding and how any corresponding payment would be determined before work begins.",
        amendmentGround:
          "Stating the partial-completion rule in advance could make an interrupted project easier to assess without inventing a result.",
        limit:
          "No farm, acreage, yield, conservation measurement or award is asserted.",
      },
    ],
  }),
  serviceFamily({
    key: "veteran-transition-referrals",
    title: "Veteran transition referrals",
    mechanism:
      "Requires consent-based referral information while leaving veteran status and benefit eligibility to the authority responsible for them.",
    inventoryRow: "D06 (veterans)",
    outcome:
      "Whether requested transition referrals reach a verified contact without being misrepresented as benefit approval.",
    missing:
      "No referral requests, completion observations or access-effect baseline is available.",
    variants: [
      {
        key: "transition-referral-duty",
        label: "Veteran transition referral duty",
        synopsis:
          "Requires a public body offering transition assistance to explain and verify referral routes without deciding eligibility for another program.",
        instrument: "regulatory-requirement",
        reach:
          "public bodies offering civilian transition assistance to former service members",
        scopeText:
          "This Act applies where a public body of this state offers civilian transition assistance to a person who requests it as a former service member. A request under this Act does not establish veteran status or eligibility for any benefit under other law.",
        choiceLabel: "What a requested referral includes",
        choices: [
          option(
            "verified-contact",
            "Verified contact information",
            "At the person's request, the body shall provide contact information it has checked for a relevant employment, education or benefit inquiry, together with the date checked and any eligibility question the receiving body must decide.",
          ),
          option(
            "consented-handoff",
            "A handoff with explicit consent",
            "At the person's request, the body shall provide checked contact information for a relevant employment, education or benefit inquiry and offer to transmit the inquiry with the person's explicit consent. It shall explain which eligibility questions remain for the receiving body and record transmission separately from acceptance.",
          ),
        ],
        safeguard:
          "No referral shall be described as acceptance, benefit approval or a determination of service status. Personal information may be transmitted only within the person's consent and otherwise applicable law.",
        amendment:
          "The person may withdraw consent to any transmission that has not yet occurred, and shall be told how to do so.",
        amendmentGround:
          "A referral should remain the person's choice until the requested information is sent.",
        limit:
          "No service history, veteran classification, federal benefit rule or completed referral is invented.",
      },
    ],
  }),
];
