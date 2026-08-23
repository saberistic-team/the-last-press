# The Last Person

A live, global game of chicken: one countdown, one button, thousands of people watching. Dark, huge typography, monospace timer, mobile-first.

## Game rules (as decided)

- One global season at a time. A season begins the moment the first person presses.
- Season 1 timer duration: 5 minutes. Any press resets the clock to the full duration.
- When the timer hits zero, the most recent presser wins the season.
- The winner chooses the next season's duration: double it, halve it, or keep it. Minimum 5 minutes, maximum 1 week — the ladder doubles from 5 minutes (5m, 10m, 20m, 40m, 1h20m, 2h40m, 5h20m, 10h40m, 21h20m, 1d18h, 3d13h, 7d cap). If the winner doesn't choose within a short window, duration stays the same.
- Presses are a monthly allowance, not per-season: every signed-up player gets 1 press per month for free. A $1/month membership adds 10 presses per month (11 total). Allowance refills monthly, not during a season.
- Spectating is free and requires no account.

## Screens

- **LIVE (home)** — dominated by the countdown. Below it: last presser + relative time, players remaining, your press dots, the big PRESS button. Adapts to state: spectator (JOIN FOR $1/MONTH), signed-in with presses (PRESS), out of presses (YOU'RE OUT), season idle (BE THE FIRST TO PRESS — starts the season), winner announced (crown screen + duration choice for the winner).
- **Live activity feed** — recent presses with absolute + relative times, usernames clickable.
- **Player profile** — username, member since, crowns, career stats (seasons played, total presses, closest press, average press time, times Last Person), season-by-season list. No social features.
- **HALL OF LAST PEOPLE** — season list with winner, player count, duration; click into a season's stats.
- **HOW IT WORKS** — the four steps, nothing more.
- **Admin** — create/start/end seasons, set duration and press allowances, view players and press activity, eliminate/reinstate, ban, announcements, and a demo panel (fast-forward the clock, trigger bot presses, reset season).

## Real-time drama

- Server timestamp is the only truth; clients render a countdown from `timer_expires_at`.
- Realtime broadcast on every press: full-screen RESET flash, the presser's username enlarged, the clock animating from near-zero back to full, sound + haptics (both mutable).
- Escalating intensity: normal → tense under 25% → ⚠ warning under 1 hour-equivalent → oversized timer in the last minutes → full-screen 10…1 count.
- Press confirmation dialog by default; SNIPER MODE (instant press, no confirm) unlockable when the clock is in its final stretch, with a warning.

## Backend

Lovable Cloud (Postgres + realtime + auth). Tables: `profiles` (username, monthly press allowance, presses_remaining, allowance_period), `seasons` (number, status, duration_ms, timer_expires_at, last_presser, winner, next-duration choice, config), `season_players`, `presses`, `notifications`, `subscriptions`, `user_roles` (admin, in its own table), plus season config for future purge rules.

The press action is a single atomic Postgres function: locks the active season, verifies status, non-expired timer, participation, and remaining presses, consumes one press, records the press, resets the expiration, and returns the new state. Clients never write game tables directly — RLS is read-only for players, with all mutations behind server functions. Rate limiting and server-side subscription checks included.

A scheduled server route settles expired seasons (declares the winner, locks pressing) so the game ends even if nobody is watching.

## Auth & payments

Supabase Auth with email and Google; unique username required at signup. Stripe $1/month subscription via Lovable's payments integration; a webhook keeps subscription status and the monthly press grant in sync. Joining mid-season doesn't grant an unfair edge — the confirmation explains presses apply from the next allowance/season as appropriate.

## Demo data

Seeded past seasons, winners, and thousands of player rows so the app feels populated, plus an opt-in simulated crowd that presses on a realistic cadence during development.

## Order of work

1. Cloud enable, schema, RLS, atomic press function, seed data
2. LIVE page + server-authoritative timer + realtime resets and animations
3. Auth, usernames, profile/press allowance
4. Press flow, sniper mode, activity feed, intensity states
5. Season end, winner screen, duration choice, Hall of Last People
6. Stripe $1/month membership
7. Admin + demo controls, notifications, share cards
