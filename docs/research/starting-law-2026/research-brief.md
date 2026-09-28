# Research brief for one state-law question (CLOUD A)

You research ONE policy question for 56 places: the 50 states, D.C. (US-DC), Puerto Rico (US-PR), Guam (US-GU), the U.S. Virgin Islands (US-VI), American Samoa (US-AS) and the Northern Mariana Islands (US-MP). You are finding the real law IN FORCE ON 2026-01-01.

Tools (UPDATED): the WebSearch budget for this session is spent, and WebFetch is blocked. Use Bash `curl -sL -m 40 <url>` to fetch SPECIFIC pages directly, then extract text with a short python snippet. Do NOT scrape search engines (Bing, Google, DuckDuckGo) or build any search substitute: that is not permitted here. Find primary pages by (a) URLs you know (state legislature code sites such as revisor.mn.gov, cga.ct.gov, le.utah.gov, legislature.idaho.gov, leginfo.legislature.ca.gov, oregonlegislature.gov, app.leg.wa.gov/rcw, law.lis.virginia.gov, codes.findlaw.com, casetext; state agency pages; taxfoundation.org; brennancenter.org), and (b) following links on pages you fetched (Wikipedia articles, fetched as plain https://en.wikipedia.org/wiki/<Title> pages, list references with URLs — fetch the primary ones). Known refusals: ncsl.org, ballotpedia.org (bot challenge), law.justia.com, ilsr.org, courtlistener.com, nmhc.org (login). Wikipedia's API is rate-limited; plain article pages work. Never log in or create accounts. Pace requests (no more than about one per second to a host). Every source URL you record must be a page you actually fetched (status 200) and that supports the answer; prefer the state's own code or agency page.

Rules:

- The file accepts only "yes" or "no". Use the definition of yes/no given for your question. Where the law is partial, choose per the definition and write a short note (plain American English, one sentence).
- UNKNOWN is never "no". If you cannot confirm a place (especially territories), leave it out of "answers" and list it under "unknown" with the reason.
- Record the answer on 2026-01-01. If a law enacted before or during 2026 changes the answer AFTER 2026-01-01, keep the 2026-01-01 answer and describe the change in "note" (with its effective date).
- "operativeAt": the date (YYYY-MM-DD) the current answer took effect, when a search result supports it; omit it if the rule has stood since before 2000 or the date is not found (say which in "dateBasis").
- "cite": the statute or constitutional section (e.g. "Ind. Code § 3-11-8-25.1", "Ariz. Const. art. 4, pt. 2, § 1"). Omit if you can't support it.
- "source": one URL from your search results that supports the answer.
- List every place where sources disagree under "conflicts" with both readings and URLs.

Output: write a JSON file to the path given in your task, exactly this shape:
{
"question": "<qualified key>",
"definition": "<the yes/no definition you applied>",
"summarySource": "<one line: main sources and their dates>",
"answers": { "US-AL": { "answer": "yes", "cite": "...", "operativeAt": "2014-06-03", "dateBasis": "enacted-effective|pre-2000|not-found", "source": "https://...", "note": "..." }, ... },
"unknown": { "US-AS": "reason" },
"conflicts": [ { "place": "US-XX", "readings": "...", "sources": ["..."] } ],
"counts": { "yes": 0, "no": 0, "unknown": 0 }
}
Validate the file parses (python3 -c "import json;json.load(open(PATH))") and that answers + unknown cover all 56 keys exactly once. Your final message: the counts, the conflicts, and any place you were least sure of. Do NOT edit any file in the repository.
