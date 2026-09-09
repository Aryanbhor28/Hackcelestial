# LocalFlow — Real Places. Deeper Stories.

A context-aware matching platform for local experiences. A traveler describes their
situation; the engine works out what is actually feasible, ranks it, explains why, and
re-ranks when circumstances change. Providers list, get matched, and manage bookings.

Pilot destination: **Manali**, 44 seeded experiences across 24 providers.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

No API keys required — everything works offline.

Optional: set `ANTHROPIC_API_KEY` and intent extraction additionally asks Claude
(`claude-opus-5`) to fill any field the rules could not resolve. The rule-based extractor
stays the source of truth, so the demo never depends on a network call.

## The demo path

1. **`/discover`** — type the situation in plain language. Default example:
   *"I'm in Manali with my parents. We have 2 hours before dinner. Budget ₹800 each. We want
   something cultural and relaxing. We don't want much walking."*
   The extraction panel shows each field, its confidence, and the words it came from. Every
   field is editable.
2. **`/results`** — Traditional Himachali Puppet Show, **98% match**. ₹300, 55 min, 2.6 km,
   starts 5:16 PM. "How this was scored" opens the ten weighted factors. "Why 34 others were
   not shown" lists the hard-constraint rejections, including 5 ruled out purely on time.
3. **`/experience/x_puppet`** — trust card (what was checked, by whom, when), local-relevance
   methodology with its factors, reviews, and booking.
4. Book it → **`/provider`** — the request lands on the Sharma Family dashboard. Accept it.
5. **The wow moment.** On the provider dashboard press **Cancel today**, or on the results
   page press **"My top pick was cancelled"**. The traveler's match is recomputed against
   their remaining time, budget and preferences, the confirmed booking is cancelled, and a new
   top recommendation is explained in the banner.
6. Also try **"I have an hour less"**, **"My budget dropped"**, **"The weather turned"**.

## Why the feasibility rule matters

A 90-minute workshop 25 minutes away is a 140-minute commitment. Waiting for the next session
counts too. With a 2-hour window the engine computes `travel + wait + duration + travel back`
and rejects anything that does not fit — before relevance is ever considered. In the demo
scenario that removes 5 otherwise well-matched experiences.

## Architecture

```
Data sources (provider · community · hotels · guides · places · events · video · travelers)
        ↓  normalization layer
Experience database            lib/data/*, lib/store.ts
        ↓  hard filters → weighted scoring
Recommendation engine          lib/engine/recommend.ts
        ↓
Traveler UI / Provider UI      app/*
```

| Path | What it is |
| --- | --- |
| `lib/types.ts` | Domain model, framework-free |
| `lib/engine/recommend.ts` | Hard filters + 10-factor weighted scoring |
| `lib/engine/geo.ts` | Valley-adjusted distance and travel time (swap for a routing API) |
| `lib/engine/time.ts` | Slots, earliest feasible start, itinerary conflicts |
| `lib/engine/explain.ts` | Deterministic match explanations |
| `lib/ai/intent.ts` | Rule-based intent extraction with evidence spans |
| `lib/ai/llm.ts` | Optional Claude upgrade, gap-filling only |
| `lib/ai/classify.ts` | Listing classification + local-relevance methodology |
| `lib/store.ts` | Swappable in-process store — the only file a real DB touches |

### Hard filters (reject outright)

Inactive · cancelled today · over budget · group over capacity · below minimum group ·
closed on this day · no session in the window · **round trip does not fit the time** ·
not wheelchair accessible when required · too physically demanding when low-walking is
required · below the local-relevance floor when "local only" is chosen · clashes with the
existing itinerary.

### Score weights (published on every card)

interest 20 · time fit 15 · budget 12 · group 10 · distance 9 · accessibility 8 ·
local character 8 · availability 7 · trust 6 · plan compatibility 5.

It is called a **Match Score**, not a certainty. The breakdown, the weights and the
rejections are all visible to the traveler.

## Positioning notes

- **Local is a preference, not a restriction.** `local_only` / `prefer_local` /
  `no_preference` / `popular` all change the ranking; the engine works for all four.
- **Discovery ≠ verification.** Places data, video and referrals produce *candidates*
  (`/discovery` shows the pipeline and the live lead queue). Only a provider who confirms
  their own details is published, which is how informal family providers get in without
  formal business registration.
- **No "100% safe" claims.** The trust card shows what was checked, the evidence, and the
  date it was last verified.

## Navigation

| Nav item | Route | What it is |
| --- | --- | --- |
| Home | `/` | Landing page |
| Experiences | `/experiences` | Full catalogue, filterable by category |
| Plan My Day | `/discover` | The matching flow — intent input and constraints |
| Local Hosts | `/provider` | Provider dashboard, bookings, cancel-today |
| Stories | `/discovery` | Supply architecture, discovery sources, lead pipeline |

## Photography

Images live in `public/images/` and are Creative Commons photographs from Wikimedia
Commons of the Kullu valley and its food: the Beas river in the Kullu Valley (hero),
Hidimba Devi Temple at Dhungri, an Indian thali, rafting on the Beas, tandoori momos, a
Kullu–Manali walking trail, and Himachali Nati dancers.

They are **representative of the region, not photographs of the individual providers** —
`lib/data/media.ts` maps them per experience and per category, and anything without an
honest match falls back to generated gradient art rather than borrowing a picture of
somewhere else. Real listings would carry provider-supplied images. Swap the files in
`public/images/` (same filenames) to change the look without touching any component.

## Prototype scope

Seeded, curated data — structured exactly as real provider submissions, not presented as
real partnerships. Bookings are requests, no payment gateway. State is in-process and resets
when the server restarts. Provider notifications are in-app; SMS/WhatsApp are left as a
clearly-marked integration point.
