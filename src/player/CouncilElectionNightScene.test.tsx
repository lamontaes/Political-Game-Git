import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { World } from "../simulation";
import type { councilElectionNightRoomPacket } from "../presentation/election-night-scene";
import { CouncilElectionNightScene } from "./CouncilElectionNightScene";

const packetMock = vi.hoisted(() => ({ value: null as unknown }));
const sceneMock = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("../presentation/election-night-scene", () => ({
  councilElectionNightRoomPacket: () => packetMock.value,
  returnFromCouncilElectionNight: vi.fn((world) => world),
}));
vi.mock("../presentation/election-night-progress", () => ({
  electionNightViewedBeat: () => 0,
  recordElectionNightReportView: vi.fn((world) => world),
}));
vi.mock("../presentation/campaign-projection", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, giveElectionSpeech: vi.fn((world) => world) };
});
vi.mock("../simulation/campaign-speeches", () => ({
  electionSpeechOpen: () => false,
}));
vi.mock("../simulation/campaign-queries", () => ({
  campaignForCandidate: () => null,
}));
vi.mock("../presentation/scene-conversation", () => ({
  projectPlayedSceneExchange: () => sceneMock.value,
}));
vi.mock("./SceneConversation", () => ({
  SceneConversation: ({ addressee }: { addressee: string }) => (
    <div data-testid="actual-recorded-conversation">{addressee}</div>
  ),
}));
vi.mock("../player/PersonPortrait", () => ({
  PersonPortrait: ({ personId }: { personId: string }) => (
    <span data-testid="mock-portrait">{personId}</span>
  ),
}));

const player = "person-player";
const friend = "person-present-friend";
const source = "saved-source-record";
const result = "saved-result";
const mockWorld = {
  currentDate: "2026-01-01",
  people: {
    [player]: { id: player, givenName: "Alex", familyName: "Candidate" },
    [friend]: { id: friend, givenName: "Sam", familyName: "Neighbor" },
    "person-absent": {
      id: "person-absent",
      givenName: "Pat",
      familyName: "Away",
    },
  },
} as unknown as World;

function installPacket() {
  packetMock.value = {
    resultId: result,
    winnerName: "Sam Neighbor",
    sourceRecordIds: [source, result],
    participantPersonIds: [player, friend],
    reportingReady: true,
    reports: {
      finalBeatIndex: 0,
      beats: [
        {
          index: 0,
          final: true,
          reportedPrecincts: 1,
          totalPrecincts: 1,
          runningBallotsCast: 17,
          runningTallies: [
            { candidatePersonId: player, votes: 7, voteShare: 7 / 17 },
            { candidatePersonId: friend, votes: 10, voteShare: 10 / 17 },
          ],
        },
      ],
    },
  } as ReturnType<typeof councilElectionNightRoomPacket>;
}

describe("council election night player consumer", () => {
  it("shows saved running returns and only named people in the recorded room", () => {
    installPacket();
    const html = renderToStaticMarkup(
      <CouncilElectionNightScene
        world={mockWorld}
        personId={player}
        contestId="contest"
        onWorldChange={() => {}}
      />,
    );
    expect(html).toContain("1 of 1 precincts reported");
    expect(html).toContain("17 ballots counted");
    expect(html).toContain("Alex Candidate");
    expect(html).toContain("Sam Neighbor");
    expect(html).toContain(`data-result-id="${result}"`);
    expect(html).toContain(`data-source-record-ids="${source} ${result}"`);
    expect(html).toContain(`>${friend}</span>`);
    expect(html).not.toContain("person-absent");
    expect(html.replace(/<[^>]*>/g, " ")).not.toContain(source);
    expect(html).not.toContain("Give your election speech");
    expect(html).not.toContain("Talk with");
    expect(html).toContain("58.8%");
    expect(html).toContain("41.2%");
  });

  it("renders no scene until the actual room packet is ready", () => {
    packetMock.value = null;
    expect(
      renderToStaticMarkup(
        <CouncilElectionNightScene
          world={mockWorld}
          personId={player}
          contestId="contest"
          onWorldChange={() => {}}
        />,
      ),
    ).toBe("");
  });

  it("offers the shared conversation only when a saved contribution exists", () => {
    installPacket();
    sceneMock.value = { contributions: [{ sourceEventId: "actual-event" }] };
    const html = renderToStaticMarkup(
      <CouncilElectionNightScene
        world={mockWorld}
        personId={player}
        contestId="contest"
        onWorldChange={() => {}}
      />,
    );
    expect(html).toContain("Talk with Sam Neighbor");
    sceneMock.value = null;
  });

  it("omits unknown candidate rows and leaves zero-ballot shares unclaimed", () => {
    installPacket();
    const packet = packetMock.value as {
      reports: { beats: Array<Record<string, unknown>> };
    };
    packet.reports.beats[0] = {
      ...(packet.reports.beats[0] as object),
      runningBallotsCast: 0,
      runningTallies: [
        { candidatePersonId: "unknown-candidate", votes: 0, voteShare: 0 },
      ],
    };
    expect(
      renderToStaticMarkup(
        <CouncilElectionNightScene
          world={mockWorld}
          personId={player}
          contestId="contest"
          onWorldChange={() => {}}
        />,
      ),
    ).toBe("");
    packet.reports.beats[0] = {
      ...(packet.reports.beats[0] as object),
      runningTallies: [
        { candidatePersonId: player, votes: 0, voteShare: 0 },
        { candidatePersonId: friend, votes: 0, voteShare: 0 },
      ],
    };
    const html = renderToStaticMarkup(
      <CouncilElectionNightScene
        world={mockWorld}
        personId={player}
        contestId="contest"
        onWorldChange={() => {}}
      />,
    );
    expect(html).toContain("0 ballots counted");
    expect(html).not.toContain(">Share</th>");
    expect(html).not.toContain('<th scope="row">Candidate</th>');
  });
});
