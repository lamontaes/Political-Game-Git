# Audit 1: life and words, as code (Oct 12, 9:10 a.m.; read-only helper, on opus-play /play and pool/P15-people-5)

**Status key:** Reachable = works and you can reach it in /play. Tests = works only in tests. Stand-in = relies on a registered stopgap. Missing = not in the code.

## Step 1: a life at 18

- **Reachable:**
  - The 18-year-old (or the oldest 17-year-old).
  - Family by kin rules (parents, siblings, grandparents, aunts and uncles, nieces and nephews; no cousins or in-laws).
  - A real NCES school picked by enrollment.
- **Gaps:**
  - Schools are today's campuses, so a 60-year-old can have "attended" a 2015 school.
  - /play never shows schools.
  - The Family sheet shows raw keys ("aunt-or-uncle · 34").
  - "Records behind facts" is only a tooltip of raw ids.

## Step 2: meeting people

- **Reachable, indirectly:** meetings happen on visit or join acts.
- **Gaps:**
  - Choice buttons show raw action ids.
  - Talking on /play records no meeting, contact or closeness.
  - Two copies of the kin fading rule disagree (1095 vs 1096 days).

## Conversations and the Lie control

- **Reachable, but:**
  - **Hand-written templates.** Every line comes from a template, e.g. "Still at {{employer}}?", and the bank's stopgap never fires.
  - **Four choices not guaranteed.** That's only tested for a working adult with acquaintances, and a stranger gets the "home" opener.
  - **Choices aren't distinct.** Every choice is the same answer plus a tacked-on topic.
  - **Lies are thin.**
    - You can only lie about your own job or home, with one fixed false claim each.
    - The lie is stored as a fact nothing reads.
    - The hearer is only the one listener.
    - Discovery happens only if you later tell the same person the truth.
  - **The scales are wrong.** They show "tipped" whenever a lie is available, there's no soft-red line, and the word "Lie" appears in title/alt text.
  - **Conversations cost nothing.** No time passes, and the conversation is held only in server memory.

## Scenes and the director

- **Reachable:** interrupts at 0.50 or more become stops, then a scene is composed.
- **Gaps:**
  - Scene words are templates.
  - Only 4 cause kinds are explained, so death and birth scenes don't say what happened.
  - Waiting moments can't be reached from /play.
  - A moment with no situation binding throws an error.

## "My life" journal

- **Reachable:** 8 template rows.
- **Gaps:**
  - No lines for deaths, marriages, lies, conversations, news, speeches, elections or filing.
  - The death look-back works only in tests.

## Speeches

- **/play:** a campaign-only Speech button (topic plus for or against) through GOV's `giveSpeech`. It produces **no words**, only "speech: N · +w · −c".
- **Tests only:** PEOPLE's `speechModule`, which isn't registered in the bench world.
- **Missing:** speaking anytime, a wording preview, memory by age, passing down to children.
- **Duplicated:** two competing retelling models.

## Basic news

- **The module is registered** (delays by habit, word of mouth).
- **But /play's News sheet** lists every public record raw; `storiesHeard` is unused.
- **Missing:** outlets as records, engine words, trust, news reaching other places. Talking passes no news.

## People bring it up

- **Tests only.** Nothing in play calls it. One change kind only (a business closing); template lines.

## Time and skip

- **Reachable:** Day, Week and Until needed. **The owner's Oct 12 ruling is in:** work-only stops auto-resume during a skip.
- **Gaps:**
  - Calendar jump isn't on /play.
  - /play never says which stop ended a skip.
  - The skip quietly gives up after 52 weeks.
  - Self-chosen answers are saved as the player's (a stand-in).

## Sharp questions

1. With a fresh 18-year-old, click a housemate, then a stranger. How many choices appear, and do they differ beyond the tacked-on topic?
2. In a live game, what makes the person I lied to find out?
3. Why does /play's News show every record instead of what I heard?
4. When does /play use PEOPLE's speech module and "bring it up"?
