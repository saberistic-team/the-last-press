# The Last Press

Build a production-quality responsive web game called The Last Person.

The concept is intentionally extremely simple: thousands of people participate in one global game centered around a countdown timer and a single button.

The experience should feel mysterious, tense, competitive, and slightly absurd. Do not overcomplicate the UI. The countdown and button are the product.

Core Concept

There is one global game running for everyone.

Every season starts with a group of players.

Each player begins the season with 10 presses.

There is one global 24-hour countdown timer.

Whenever an eligible player presses the button:

The global timer immediately resets to 24:00:00.

That player loses one of their remaining presses.

They become the current Last Person.

Their username and press time are recorded.

Everyone watching sees the reset happen in real time.

If the timer ever reaches:

00:00:00

the player who pressed most recently wins the season.

The season ends immediately.

Landing Page

The landing page should immediately communicate the game without requiring explanation.

Design it around a huge countdown.

Example:

THE LAST PERSON

One button.
One global timer.
Don't be the one who blinks.

00:13:47

until someone wins

12,842 players remain

Last pressed by

potato57

23 hours, 46 minutes ago

[ PRESS ]

You have 7 presses remaining

Below the main game area:

🔥 927 players still have presses available

The exact numbers should update live.

If the visitor is not logged in, replace PRESS with:

[ JOIN THE GAME — $1/MONTH ]

Allow non-members to watch the current game for free.

The Most Important UX Principle

The game should feel alive.

When someone presses the button, everyone currently watching should immediately see:

RESET!

Then animate:

00:00:04

to

24:00:00

Show:

potato57 reset the clock with 4 seconds remaining.

The username briefly becomes prominent.

Use subtle animations, screen flashes, vibration on supported mobile devices, and sound effects.

Don't make the design childish.

Think:

internet experiment

live sporting event

hacker terminal

game of chicken

global social experiment

Use a dark interface with large typography and extremely strong visual hierarchy.

Timer

The global timer must be server-authoritative.

Never rely on a browser countdown as the source of truth.

Store:

season ID

current timer expiration timestamp

last press timestamp

last presser user ID

season status

Clients calculate the displayed countdown from the server expiration timestamp.

Use Supabase realtime subscriptions so all connected clients receive press events and timer resets immediately.

The press operation must be atomic so two people pressing simultaneously cannot corrupt the game state.

Press Mechanics

Each player starts a season with:

10 presses

Each successful press consumes one.

Display the remaining presses prominently:

YOUR PRESSES

● ● ● ● ● ● ● ○ ○ ○

7 remaining

When the user reaches zero:

YOU'RE OUT OF PRESSES

You can continue watching the season but cannot press again.

Presses do NOT regenerate during the season.

Press Confirmation

Don't accidentally let someone waste a press.

When someone presses the main button, show a very fast confirmation:

Use 1 of your 7 remaining presses?

Current timer:

00:04:21

[ CANCEL ]

[ PRESS ]

However, when the timer falls below 30 seconds, allow the user to enable:

SNIPER MODE

In Sniper Mode, pressing happens immediately without confirmation.

Show a warning when enabling it:

Every press counts. No confirmation.

Real-Time Activity

Below the main game, show a live activity feed.

Example:

LIVE

potato57 pressed at 00:00:04
sarah42 pressed at 00:31:17
internetdad pressed at 06:42:09
alex98 pressed at 18:11:42

Show relative timestamps as well.

Allow users to click a username to view that player's public game profile.

Player Profiles

Each player has a simple public profile.

Example:

potato57

Playing since Season 2

👑 Season 4 Winner

Career

Seasons played: 7
Best finish: #1
Total presses: 41
Closest press: 00:00:02
Average press time: 03:42:17
Times Last Person: 41

Seasons

Season 8 — ACTIVE
Season 7 — Top 2.1%
Season 6 — Top 38%
Season 5 — Top 11%
Season 4 — 👑 WINNER

Do not turn profiles into social media profiles.

No posts, follower counts, DMs, etc.

Spectator Mode

Anyone can watch without paying.

Spectators see:

global timer

current Last Person

players remaining

recent presses

season history

player profiles

But the button says:

JOIN NEXT SEASON

or, when registration is available:

JOIN FOR $1/MONTH

This is important because watching should be the primary acquisition mechanism.

Membership

Use Stripe subscriptions.

Price:

$1/month

Membership allows users to participate in seasons.

Watching is free.

If someone joins during an active season, don't automatically insert them into the game if the season has already started.

Instead show:

YOU'RE IN.

You're registered for Season 9.

Season 8 is currently underway.

Watch Season 8 →

This prevents late entrants from having an unfair advantage.

Season Registration

Between seasons, show a registration countdown.

Example:

SEASON 9

Registration closes in

02 DAYS
14 HOURS
31 MINUTES

83,491 players registered

[ JOIN SEASON 9 ]

Existing paying members can join with one click.

New users go through:

account creation → $1 Stripe subscription → username → join season

Keep onboarding extremely short.

Season Start

When registration closes:

Freeze the participant list.

Give every participant 10 presses.

Set the timer to 24 hours.

Start the season.

Send participants a notification/email.

Begin the live game.

Elimination System

Build elimination rules as configurable season settings rather than hardcoding them.

For the first version, implement:

Activity Elimination

At configurable checkpoints, eliminate players who haven't participated according to that season's activity requirement.

For example:

THE PURGE

Players who haven't pressed during the required period are eliminated.

Before a purge, show:

NEXT PURGE

04:32:19

3,821 players are currently at risk

When it happens:

PURGE COMPLETE

7,291 → 4,183 players

Eliminated players become spectators.

Make the exact purge interval and eligibility rules configurable by admins so we can experiment with game balance.

Final Hours

The UI should become progressively more intense as the timer decreases.

24h–6h:
Normal interface.

6h–1h:
Slight increased tension.

Under 1 hour:
Show:

⚠ ONE HOUR REMAINS

Under 10 minutes:
Make the timer substantially more prominent.

Under 60 seconds:

00:00:47

47 SECONDS UNTIL VICTORY

Under 10 seconds:

Full-screen countdown.

10
9
8
7
6...

If somebody presses:

RESET.

potato57 pressed with 3 seconds remaining.

Then return dramatically to:

24:00:00

Winning

If the server determines that the countdown reached zero:

Immediately lock pressing.

Display:

👑 WE HAVE A WINNER

potato57

THE LAST PERSON

Season 8

1 of 183,492 players

Season duration:

83 days, 7 hours, 41 minutes

Show statistics:

183,492 players
641,291 total presses
2,391,842 hours watched
Closest reset: 00:00:01

Give the winner a permanent:

👑 S8

badge on their profile.

Season History

Create a page:

HALL OF LAST PEOPLE

Example:

Season 8
👑 potato57
183,492 players
83 days

Season 7
👑 sarah42
91,304 players
64 days

Season 6
👑 internetdad
52,819 players
41 days

Clicking a season opens its statistics and history.

Notifications

Create notification preferences.

Potential notifications:

Nobody has pressed for 20 hours.

🔥 ONE HOUR REMAINS

🚨 10 MINUTES REMAIN

🚨 60 SECONDS

potato57 reset the timer with 3 seconds remaining.

THE PURGE begins in one hour.

You are at risk of elimination.

Initially support email and in-app notifications.

Structure the system so push notifications can be added later.

Do not spam every user for every press.

Sharing

Make dramatic moments extremely shareable.

Examples:

I just reset The Last Person with 4 seconds remaining.

Only 127 players remain in Season 8.

I've survived 71 days.

THE TIMER IS UNDER 10 MINUTES.

Generate attractive Open Graph sharing cards dynamically.

Shared links should take people directly to the live spectator page.

Authentication

Use Supabase Auth.

Support:

email

Google

Require every participant to select a unique public username.

Usernames should be the primary identity displayed publicly.

Database

Use Supabase/Postgres.

Create tables similar to:

users

id
username
created_at
subscription_status

seasons

id
season_number
status
registration_start
registration_end
started_at
ended_at
timer_expires_at
winner_user_id
starting_press_count
purge_configuration

season_players

id
season_id
user_id
presses_remaining
status
joined_at
eliminated_at
final_position

presses

id
season_id
user_id
pressed_at
previous_timer_remaining_ms
new_expiration_at

notifications

id
user_id
type
data
created_at
read_at

subscriptions

user_id
stripe_customer_id
stripe_subscription_id
status
current_period_end

Design proper indexes and Row Level Security policies.

Concurrency

This is critical.

The game must handle many users pressing at nearly the exact same moment.

Implement the press action server-side as an atomic database transaction/function.

It should:

lock/read the active season

verify the season is still active

verify the timer hasn't expired

verify the user is an active participant

verify presses_remaining > 0

consume exactly one press

update last presser

reset timer_expires_at

insert the press event

commit

broadcast the event

The database/server timestamp determines ordering.

Never trust the client's timestamp.

If two presses arrive 20 milliseconds apart, both may be valid, but the database ordering determines who is currently The Last Person.

Anti-Cheating

Rate-limit press requests.

Do not expose database mutations directly from the client.

Validate subscription and season participation server-side.

Record:

server timestamp

user ID

season

request metadata necessary for abuse detection

Build basic suspicious-activity detection but don't overengineer anti-cheat for MVP.

Admin Dashboard

Create an admin-only area.

Admins can:

create season

configure registration dates

start season

end/cancel season

configure starting presses

configure timer duration

configure purge rules

view current players

view press activity

view subscriptions

eliminate/reinstate a player

ban abusive accounts

send announcements

inspect game statistics

Most importantly, make game mechanics configurable so we can experiment without redeploying.

For example, a future season could have:

5 presses + 12-hour timer

while another could have:

20 presses + 48-hour timer

Home Page States

The homepage should automatically adapt to the user's state.

Spectator

Show live game + JOIN.

Paying member not registered

Show live game + JOIN NEXT SEASON.

Registered for next season

Show:

YOU'RE IN

plus live spectator game.

Active player

Show timer + PRESS + remaining presses.

Eliminated player

Show:

ELIMINATED

You finished #8,291.

Continue watching.

Winner

Show their victory prominently.

Design Direction

The application should feel premium despite costing $1.

Avoid a traditional SaaS dashboard appearance.

Do not fill the screen with cards.

The timer should dominate the experience.

Use:

enormous typography

dark background

strong contrast

subtle glow

restrained animations

monospace digits for timer

responsive mobile-first layout

dramatic transitions

minimal navigation

Navigation:

LIVE | SEASONS | PLAYERS | HOW IT WORKS

Profile/avatar in the corner.

Mobile

Treat mobile as the primary experience.

The timer and PRESS button should fit comfortably above the fold.

Make the press button large and tactile.

When the timer resets, use haptic feedback where supported.

The final 60 seconds should feel particularly dramatic on mobile.

How It Works Page

Explain the entire game in approximately four steps:

1. JOIN

$1/month gets you into upcoming seasons.

2. WAIT

Everyone shares the same countdown.

3. PRESS

Pressing resets the timer, but you have a limited number of presses.

4. BE LAST

If nobody presses before the timer reaches zero, the last person who pressed wins.

Then:

That's it.

Do not bury the concept under excessive rules.

MVP Priorities

Build the first version around:

Landing/live spectator page

Global server-authoritative timer

Authentication

Usernames

Season registration

$1 Stripe subscription

Season participants

Limited presses

Atomic press endpoint

Supabase Realtime

Live activity feed

Player profiles

Season ending/winner determination

Hall of winners

Admin season configuration

Responsive mobile UI

Treat purge mechanics, sophisticated notifications, sharing cards, achievements, and advanced statistics as secondary features if necessary.

Important Product Philosophy

Do not turn this into a normal multiplayer game.

The scarcity is the product.

There should be:

one timer

one button

one decision

The emotional experience should come from thousands of people staring at the same countdown and wondering:

"Is somebody else going to press it?"

The application should be simple enough that someone can open a shared link and understand what's happening within five seconds.

Build the initial application with realistic seeded/demo data so the live experience feels populated during development.

Create a development/demo mode where presses, timer duration, number of simulated players, and season state can be manipulated quickly without waiting 24 hours.

The finished product should feel like a live internet event rather than a SaaS application.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://the-last-press.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/23f9903c-08a1-4ad9-a38a-da0900bc58fc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
