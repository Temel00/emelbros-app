# Darts module — spec

The **darts** module turns one shared device into a darts scoreboard — the
family's chalkboard for 501/301. One member (the **tracker**) runs the scoring
for a game between two players; when the game ends it lands immediately on both
players' career records, building a family trophy case of averages, checkouts,
and head-to-head rivalries.

It is the canonical **fixed-scope** module named in the module contract
(ADR-0004): every game is Family scope, so all games and stats are open to all
five members. It follows the spec shape set by the lists module (`docs/modules/lists.md`)
and uses the platform vocabulary from `CONTEXT.md` verbatim: Module, Module
Manifest, Scope, Scope Policy, Widget, Dashboard, Pinned.

- **Slug**: `darts`
- **Milestone**: 2 (immediately after the walking skeleton — see map #1)

## 1. Module vocabulary

Terms local to this module (the platform glossary in `CONTEXT.md` is unchanged):

- **Game** — one leg of 501 or 301 between two players, run on one device by the
  tracker. A game is the unit of the career record: one completed game = one W
  and one L. There is no leg/set/match layer in v1 — a best-of-N is just playing
  again.
- **Tracker** — the signed-in **member** who starts and scores a game (the game's
  owner). Need not be one of the two players; can scorekeep for two other people.
- **Player** — one of the two sides of a game. Each player is **either a member**
  (gets a career record) **or a guest** (a free-text name, logged but with no
  record of their own). At least one player, or the tracker, is always a member.
- **Turn** — a player's visit of up to three **darts**. Ends after three darts,
  on a checkout, or on a bust.
- **Dart** — one thrown dart: a board segment and a multiple. The atomic stored
  unit; everything (totals, averages, checkouts) is computed from darts.
- **Checkout** — the finishing turn that brings a player to exactly 0 **on a
  double** (double-out). The last dart of the game is always a double.
- **Bust** — a turn that can't legally finish: it takes the player below 0, to
  exactly 1, or to 0 on a non-double. A bust scores nothing; the player's
  remaining total is unchanged for the next turn.

## 2. Rules (v1)

- **Variant** — the tracker picks **501 or 301** at game start; the chosen start
  score is stored on the game.
- **Start** — **straight**: every dart counts from the first (no double-in).
- **Finish** — **double-out**: a player wins by reaching exactly 0 with a double
  as the final dart. (The bull, 50, counts as a double for this purpose; 25 does
  not.)
- **Bust** — a turn busts if a dart would take the remaining score below 0, to
  exactly 1, or to 0 without the last dart being a double. On a bust the turn
  scores nothing and the player resumes next turn from the score they had **before**
  that turn. The engine detects busts automatically from the darts entered.
- **Starting player** — the tracker picks who throws first at game setup. No
  in-app bull-off in v1.

The engine enforces all of the above from per-dart entry (§3), so an illegal
finish simply can't be recorded as a win.

## 3. Playing a game (flow & entry)

1. **Setup** — the tracker opens **New game**, picks the variant (501/301), picks
   **Player 1** and **Player 2** (each a member from the family, or a typed guest
   name), and chooses who starts. The tracker is recorded as the game's owner.
2. **Per-dart entry** — each turn, the tracker taps each dart on a board/number
   pad: a **segment** (1–20, 25, or bull) and a **multiple** (single / double /
   treble; treble only applies to 1–20). A miss is entered as a **0** (a thrown
   dart that scored nothing). The engine keeps the running remaining score,
   detects busts, and ends the turn after three darts or on a checkout.
3. **Undo** — an **Undo** removes the single most recent dart, and can be pressed
   **repeatedly without limit**, stepping back across the turn and player
   boundaries into earlier turns and re-entering from there. This is the only
   correction mechanism during a live game (there is no random-access editing of
   an arbitrary past turn); repeated undo reaches any mistake.
4. **End** — when a player checks out, the game is **completed** immediately: the
   result is written to both players' records with **no confirmation step** from
   the opponent (§6). A completed game is **immutable** — its darts and result
   never change afterward.
5. **Abandon** — at any point mid-game the tracker can **abandon** the game. An
   abandoned game is **discarded entirely** (hard delete) — it counts for
   neither player and leaves nothing in history or stats.

### Turn-entry UX model

Per-dart entry (not per-turn totals) is chosen deliberately: it lets the engine
enforce double-out, know exactly which dart was the finishing double, and record
the data needed for checkout, doubles, and per-dart stats. The cost is more taps
per turn, accepted for the richer trophy case.

## 4. Data model

One `public` schema, slug-prefixed tables (ADR-0006). Hand-written migration
(ADR-0008); generated types land in `types/database.ts`. The model is a shallow
hierarchy: **game → turn → dart**, plus a **participant** row per player.

**`darts_game`**

| column            | type          | notes                                              |
| ----------------- | ------------- | -------------------------------------------------- |
| `id`              | uuid pk       |                                                    |
| `owner_member_id` | uuid          | the tracker who ran the game                       |
| `variant`         | smallint      | starting score: `301` or `501`                     |
| `starting_participant_id` | uuid  | → `darts_participant`; who threw first             |
| `winner_participant_id`   | uuid  | → `darts_participant`; null until completed        |
| `status`          | text          | `in_progress` / `completed` (abandoned = deleted)  |
| `scope`           | `scope` enum  | always `family` (fixed Scope Policy)               |
| `completed_at`    | timestamptz   | null until the game ends                           |
| `created_at`      | timestamptz   |                                                    |

`status` never takes an `abandoned` value in storage — abandoning hard-deletes
the row (and its turns/darts via cascade). A completed game may still be deleted
later (§6).

**`darts_participant`** — the two players of a game (exactly two rows per game)

| column       | type    | notes                                                    |
| ------------ | ------- | -------------------------------------------------------- |
| `id`         | uuid pk |                                                          |
| `game_id`    | uuid fk | → `darts_game`, cascade delete                           |
| `member_id`  | uuid    | the player, when a member; null for a guest              |
| `guest_name` | text    | the player's name, when a guest; null for a member       |
| `slot`       | smallint| 1 or 2, the player's side                                |

Exactly one of `member_id` / `guest_name` is set per row (a check constraint). A
game has two participant rows. This "(member \| guest)" shape is what lets a
member log a game against a visiting non-member; guests carry no login and no
record of their own.

**`darts_turn`** — one visit by one player

| column           | type    | notes                                                   |
| ---------------- | ------- | ------------------------------------------------------- |
| `id`             | uuid pk |                                                         |
| `game_id`        | uuid fk | → `darts_game`, cascade delete                          |
| `participant_id` | uuid fk | → `darts_participant`; whose turn                       |
| `turn_number`    | integer | order of play within the game                           |
| `busted`         | boolean | the turn busted (its darts scored nothing)              |

**`darts_dart`** — one thrown dart (the atomic record)

| column        | type    | notes                                                        |
| ------------- | ------- | ------------------------------------------------------------ |
| `id`          | uuid pk |                                                              |
| `turn_id`     | uuid fk | → `darts_turn`, cascade delete                               |
| `dart_number` | smallint| 1–3, order within the turn                                   |
| `segment`     | smallint| board value hit: 1–20, 25, or 50 (bull); 0 = miss           |
| `multiple`    | smallint| 1 = single, 2 = double, 3 = treble (1 for 25/50/miss)        |

A dart's point value is `segment × multiple` for 1–20; `25` (single 25) or `50`
(bull, which counts as a double) are stored with `multiple = 1`. Storing segment
+ multiple (rather than only the total) is what makes "was the finishing dart a
double?", "how many trebles?", and 180-detection computable. The `scope` enum is
the shared platform enum from ADR-0007, not a darts-local type.

### Derivation, not duplication

Nothing aggregate is stored: running scores, turn totals, W/L, averages,
checkouts, and 180s are all **computed from darts** at read time (§5). A completed
game is immutable, so these computations are stable. Career and head-to-head
stats read across all completed games. If read performance ever needs it, a
materialized summary is a later optimization — v1 computes on read.

## 5. Stats

All stats derive from stored darts across completed games; abandoned games don't
exist and so never count.

**Career record** (per member — shown in the darts module's stats pages):

- **Record** — games played, wins, losses, win %.
- **3-dart average** — lifetime points per three darts, plus **best single-game
  average**.
- **Highest checkout** — best single finishing turn (e.g. 121).
- **Highest turn** — best single turn scored (e.g. 180).
- **Best leg** — fewest darts taken to win a game.
- **180 count** — lifetime maximum turns.

**Head-to-head** — a member's record against each other **member** they've played
(wins–losses per opponent), e.g. "vs Dad 8–5". Member-vs-member only; guest games
don't produce a head-to-head row (there's no guest to be a rival).

**Guest games** — a game a member played against a guest **does** count toward
that member's overall record and averages (it's a real game); only head-to-head
excludes it, and the guest gets no record of their own.

**Individual game record** — a completed game stores its full per-dart history,
so a game detail view can show each player's turn-by-turn scores, darts thrown,
3-dart average, and the checkout. Immutable once completed.

## 6. Deleting a completed game

There is no result-confirmation step — a finished game records immediately on both
members' records. The correction path is deletion instead: a completed game can be
**deleted**, removing it from **both** players' records (hard delete). Allowed for
the **game owner (tracker)** or **any member who was a player** in it — the loser
of a bogus game can wipe it without hunting down the tracker. Rare and trust-based
(a five-person family); no soft-delete or audit trail in v1.

## 7. Scope & sharing (RLS)

`darts_game` has a **fixed** Scope Policy (ADR-0004): every game is **Family**
scope. All games and all stats are visible to every signed-in member — the shared
trophy case is the whole point. This is a deliberate refinement of the map's
founding "games visible to participants" note (map #1): for darts, openness is
cheaper and more useful than privacy.

Scope enforcement is RLS-only (ADR-0004), using the fixed-scope template from
ADR-0007:

- **`darts_game` SELECT** — any signed-in member (fixed Family scope).
- **`darts_game` INSERT** — the inserting member is the `owner_member_id`.
- **`darts_game` UPDATE** — the owner only (advancing status, recording the
  winner while scoring).
- **`darts_game` DELETE** — the owner, **or** any member who is a participant
  (`member_id` on a `darts_participant` row for the game). This is the delete
  right of §6.
- **`darts_participant` / `darts_turn` / `darts_dart`** — SELECT for any signed-in
  member (they ride Family visibility); INSERT/UPDATE/DELETE allowed when the
  member can UPDATE (or, for deletes, DELETE) the parent `darts_game`. Live
  scoring writes turns and darts; game deletion cascades to them.

Because scope is fixed Family, there is **no** `darts_participant`-as-visibility
join like lists uses — participants here identify players, not viewers.

## 8. Module Manifest

Code-first typed manifest (ADR-0001), registered in `modules/index.ts`.

- **Identity** — name "Darts", slug `darts`, icon, description.
- **Scopes (informational, per ADR-0004)** — `darts_game`: fixed Family;
  `darts_participant` / `darts_turn` / `darts_dart`: inherit the game's Family
  visibility. A truthful catalog label; RLS is the only enforcement.
- **Widgets** — one (§9).
- **`profileSections: []`** — none in v1 (§10).

## 9. Widget: My Darts

One Widget (ADR-0005): a zero-prop React Server Component about the current
member, rendered inside the platform card frame.

- **Shows** — the current member's recent record (e.g. last-10 W/L), their most
  recent completed game (opponent + result), and a **New game** shortcut into the
  module.
- Fetches its own data via the module's `queries.ts` and the platform
  current-member helper; the dashboard passes it nothing (ADR-0005).
- Uniform v1 card size; no size variants (ADR-0005).

## 10. Module pages

Career stats and history live in the darts module's own pages (there is **no**
profile section in v1 — you don't see darts stats on a member's profile):

- **Darts home** — start a **New game**, and the current member's recent games.
- **Live game** — the scoring surface: per-dart entry, running scores, Undo,
  Abandon.
- **Stats / leaderboard** — every member's full career record and head-to-head
  numbers, open to all members (Family scope). This is where anyone's trophy
  case is viewed.
- **Game detail** — a completed game's turn-by-turn history.

## 11. Deferred / out of scope

Consciously left out so v1 stays a single-device, single-leg chalkboard:

- **Live score sync** — both players watching on their own phones. Already
  out of scope on the map (one device is the scoreboard in v1).
- **Best-of-N legs / sets / matches** — a game is one leg; a match is "play
  again". A leg/match layer is a later addition.
- **Other variants** — Cricket, Around the Clock, double-in, straight-out,
  handicaps. v1 is 501/301 straight-in double-out only.
- **Profile section** — darts stats on member profiles; stats live in the module
  pages for v1.
- **Result confirmation / dispute flow** — none; trust-based, deletable instead.
- **Guest career records / guest head-to-head** — guests are logged names only.
- **Materialized stat rollups** — computed on read in v1.

## 12. Defaults worth noting

Not separate decisions — sensible defaults recorded so they aren't re-litigated:

- **Starting player** is chosen by the tracker at setup; no bull-off.
- **A miss** is a real dart entered as `0` (segment 0), so darts-thrown counts and
  averages stay accurate.
- **The bull (50)** counts as a double for double-out; **25** does not.
- **Two participants per game**, exactly; `slot` 1/2 fixes their sides.
- **Guest games** count toward a member's overall record/averages but not
  head-to-head.
- **Corrections are live-only** (Undo); after completion a game is immutable and
  can only be deleted, not edited.
