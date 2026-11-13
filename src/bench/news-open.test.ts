import { describe, expect, it } from "vitest";
import { openingTab } from "./ui/news-open.mjs";

// Which tab News opens on (Fable A, Nov 13): the last tab the player chose if
// it has something new; otherwise the followed outlet with the newest story
// they have not read; otherwise their home paper. The Red desk's case is
// Arial, South Carolina (NEWS_SEED=484cc751bef6ccc5): the home paper empty
// while another outlet the player follows has stories.
const story = (id: string, date: string) => ({ id, date });
type Outlet = {
  home?: boolean;
  why?: string;
  stories: { id: string; date: string }[];
};
const tabs = (entries: [string, Outlet][]) => new Map(entries);

describe("News opens on", () => {
  it("the followed outlet with unread stories when the home paper is empty", () => {
    const outlets = tabs([
      ["leader", { home: true, why: "local", stories: [] }],
      ["news", { stories: [story("record:1", "2025-05-30")] }],
      ["wxyz", { stories: [story("printed:1", "2025-05-31")] }],
    ]);
    expect(openingTab(outlets, null, new Set())).toBe("wxyz");
  });

  it("the followed outlet whose unread story is newest", () => {
    const outlets = tabs([
      [
        "paper",
        { home: true, why: "follows", stories: [story("a", "2025-05-28")] },
      ],
      ["tv", { stories: [story("b", "2025-05-31")] }],
      ["nation", { stories: [story("c", "2025-06-01")] }],
    ]);
    // The Nation's page and the desk are not outlets the player follows.
    expect(openingTab(outlets, null, new Set())).toBe("tv");
    // Once that story is read, the next newest unread.
    expect(openingTab(outlets, null, new Set(["b"]))).toBe("paper");
  });

  it("the last tab the player chose while it has something new", () => {
    const outlets = tabs([
      [
        "paper",
        { home: true, why: "follows", stories: [story("a", "2025-05-28")] },
      ],
      ["tv", { stories: [story("b", "2025-05-31")] }],
    ]);
    expect(openingTab(outlets, "paper", new Set())).toBe("paper");
    // Read, so it gives way to the outlet with something new.
    expect(openingTab(outlets, "paper", new Set(["a"]))).toBe("tv");
  });

  it("the desk of stories no outlet printed when only it has something new", () => {
    // North Hyde Park, Vermont (Fable A, Nov 13): every story on the desk.
    const outlets = tabs([
      ["paper", { home: true, why: "local", stories: [] }],
      ["news", { stories: [story("record:2", "2025-05-30")] }],
    ]);
    expect(openingTab(outlets, null, new Set())).toBe("news");
  });

  it("the home paper when nothing is unread", () => {
    const outlets = tabs([
      ["news", { stories: [story("r", "2025-05-30")] }],
      [
        "paper",
        { home: true, why: "follows", stories: [story("a", "2025-05-28")] },
      ],
      ["tv", { stories: [story("b", "2025-05-31")] }],
    ]);
    expect(openingTab(outlets, "tv", new Set(["a", "b", "r"]))).toBe("paper");
    // A place with no paper of its own: the first tab.
    expect(openingTab(tabs([["news", { stories: [] }]]), null, new Set())).toBe(
      "news",
    );
  });
});
