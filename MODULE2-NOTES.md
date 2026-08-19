# Module 2 — Axis Architecture for All 13 Buckets

Companion to `METHODOLOGY.md`. This is the output of §7's drafting order, run to
completion for every bucket:

> list sub-ideologies → draft 8 candidate axes → assign provisional 8-vectors to every
> sub-ideology → run pairwise separation → revise the axes until nothing collides →
> only then write the 96 questions.

Files:
- `module2-axes.json` — 13 buckets × 8 axes, plus an 8-vector anchor for all 157
  sub-ideology entries (the ~125 named, with cross-listed ones anchored separately in
  each bucket they appear in).
- `module2-b01-ml-questions.json` — bucket 1's full 96-item battery. Reference
  implementation; the remaining 12 follow the identical template.
- `validate2.py`, `m2_data_*.py`, `q_b01.py`, `build.py` — the harness and source data.

**Note on bucket 1.** ML's 8 axes were described as already drafted in project history,
but that history isn't reachable from this session — only the three axis names quoted in
the sub-ideology reference (`Revolutionary Site`, `Vanguard Discipline`, `AES Orthodoxy`)
and the sample label `"Stalinist-Orthodox, Third-Worldist Lean"`. Bucket 1 below is a
reconstruction consistent with those. If the original draft resurfaces, diff it against
this and keep whichever is better; the validation harness works either way.

---

## 1. Results

All 13 buckets pass all three diagnostics.

| # | Bucket | subs | min pair | σ=10 | σ=15 | profiles |
|---|--------|-----:|---------:|-----:|-----:|---------:|
| 1 | Marxism-Leninism / Communism | 18 | 35.8 | 98.4% | 88.9% | 7/7 |
| 2 | Left-Communism / Communization | 11 | 43.6 | 98.1% | 90.6% | 5/5 |
| 3 | Anarchism | 17 | 37.7 | 98.4% | 90.5% | 6/6 |
| 4 | Social Democracy / Dem. Socialism | 12 | 44.9 | 99.5% | 95.3% | 5/5 |
| 5 | Progressive / Social Liberalism | 10 | 38.6 | 98.5% | 91.5% | 4/4 |
| 6 | Classical / Market Liberalism | 8 | 37.9 | 99.1% | 95.1% | 4/4 |
| 7 | Conservatism | 12 | 38.8 | 98.9% | 92.6% | 5/5 |
| 8 | Fascism / Third Position | 14 | 40.3 | 99.2% | 94.0% | 5/5 |
| 9 | Monarchism / Reaction | 10 | 41.9 | 99.3% | 94.5% | 4/4 |
| 10 | Theocracy / Religious Fund. | 13 | 42.8 | 98.7% | 91.9% | 6/6 |
| 11 | Anarcho-Capitalism / Right-Lib. | 9 | 51.4 | 98.9% | 95.1% | 4/4 |
| 12 | Third-Worldism / Nat. Liberation | 14 | 44.6 | 99.2% | 93.8% | 6/6 |
| 13 | Neo-Eurasianism / Traditionalism | 9 | 39.5 | 99.3% | 96.0% | 5/5 |

Every named sub-ideology is separable — the §7 operational goal is met with no pair
below the 35.0 comfort threshold, let alone the 25.0 fatal one.

Bucket 1's question set additionally passes the balance invariants: 52/52 full form and
27/27 short form on every axis, no cross-loading, all-neutral respondent lands at exactly
50.0 on all eight.

---

## 2. Two conventions added

**Umbrella entries.** Some list items are critics' labels or family-level aspirations
rather than distinct positions: `Ultra-leftism`, `Third Position (general)`,
`Right-Libertarianism (general)`, `Islamism (general)`, `Barracks Communism`,
`Pan-Arabism`. They get anchors so they can be placed on the radar and used as fallback
labels, but they're excluded from pairwise-separation scoring — otherwise you spend the
tuning loop manufacturing distance between a tendency and the umbrella it belongs to.

Pan-Arabism was demoted to umbrella during tuning. It kept colliding with Ba'athism and
Nasserism, and it should: both *are* Pan-Arabisms. That's a real collision in §5's sense,
and the honest resolution is to stop treating the genus as a species.

**Weight pattern by construction.** Instead of hand-balancing 96 items per bucket and
re-checking after every edit, each axis's 12 items are written in a fixed order:

```
[0:3]  core positive   10,  9,  8
[3:6]  extra positive  10,  8,  7
[6:9]  core negative  -10, -9, -8
[9:12] extra negative -10, -8, -7
```

Keyed balance and weight balance are then automatic for both forms. §1's warning that
"a subset of a balanced set is not itself balanced" is handled structurally rather than
by a check that fires after the damage.

---

## 3. Tuning log

Five collisions surfaced on the first pass. Per §5, each was classified as REAL or
ARTEFACT before touching anything. All five turned out to be artefacts — in every case
the fix was knowing the tendency better, not adjusting numbers.

**Platformism ↔ Especifismo, 14.9 (FATAL).** The worst one. Both had been anchored as
"disciplined cadre anarchism," which collapses them. The actual difference is the *site*
of mass work: the Platform reads as union-centric, while especifismo's defining practice
is *social insertion* into broad popular movements — neighbourhood, land, student — and
it rejects synthesis more sharply than the Platform does. Separating them on
Organisational Vehicle and Territorial Politics took the pair to 47.

**Maoism ↔ Naxalism, 29.5.** Anchored as if Naxalism were just Maoism in India. It isn't:
it's an insurgency inside a formally parliamentary state, with absolute electoral
rejection, an adivasi/forest periphery base, and — unlike the Peruvian case — collective
leadership rather than a named guiding thought. Moving `road`, `lead`, and `cont` took it
to 50. Gonzaloism was pushed further out on `vang`/`lead`/`intl` at the same time, since
militarisation of the party and the universality of protracted people's war are exactly
what its adherents claim distinguishes it (Maoism ↔ MLM went 35.9 → 44).

**Situationism ↔ Communization Theory, 32.7.** A straightforward error on my part:
Situationism had been given a high Communisation Immediacy score. Debord wanted
generalised self-management through councils, which is a *transitional workers' power*
position, not the abolition-of-value-immediately position. Correcting it took the pair to
64 and fixed the whole communizer cluster.

**Christian ↔ Ethical Socialism, 26.8.** Tawney's argument is a secular moral one made
inside a parliamentary labour party; Christian Socialism is confessional and
cooperative-institutional. Ethical Socialism had been given both the religious ground
*and* the parallel-institutions route, which is the Christian Socialist profile. → 63.

**Integralism ↔ Clerical Fascism, 34.6.** Brazilian Integralism was a genuine
mass movement with a paramilitary style, and doctrinally *non-racialist* — Salgado
celebrated racial fusion. Clerical fascism is church-subordinate and demobilised. → 63.

**Legitimism ↔ Throne-and-Altar, 33.3.** Legitimism is a claim about *who* rules by
blood; Throne-and-Altar is a doctrine about church-state fusion, less centralist and not
tied to a dynasty. → 52.

---

## 4. Axis-design notes worth carrying forward

**The cultural-axis smuggling guard (§7) bit twice.**

In Anarchism, `Analytical Primacy` (Class Struggle ↔ Intersecting Dominations) is the
axis I'm least comfortable with. Without it, Anarcha-Feminism, Queer Anarchism, and Black
Anarchism don't separate from anarcho-communism at all — they are *defined* by which
domination they centre. But it does correlate with the Cultural appendage more than the
other 103 axes do. It's kept, worded strictly as analytical primacy (what is the
fundamental unit of domination?) rather than as attitudes toward tradition, on the
grounds that culturally progressive class-struggle anarchists are common and must remain
separable. **Flag for review once there's live data**: if this axis correlates above
~0.6 with the Cultural appendage, Anarchism has 7 real axes and needs a replacement.

In Right-Libertarianism, `Social Base Strategy` does one job — isolating
Paleolibertarianism, and partly Hoppean ancap. It's weak but structural (who do you build
a coalition with?) rather than cultural (what do you think of tradition?). Acceptable;
worth revisiting.

**Near-duplicate axes were caught and replaced during drafting, before questions:**
- Conservatism's `Locus of Order` (local ↔ central) was a near-copy of `State Capacity` —
  replaced with `Moral Policy Instrument` (persuasion ↔ legal enforcement), which cleanly
  separates a confessional-but-liberal Christian Democrat from a secular-but-coercive
  National Conservative.
- Right-Libertarianism's `Order Provision` duplicated `State Residue` — replaced with
  `Intellectual Property`, a genuinely live internal dispute that also separates
  Objectivism from Minarchism.
- ML's original `Revolutionary Site` (urban insurrection ↔ rural PPW) overlapped with
  route-to-power and became undefined for parliamentary tendencies. Split into
  `Route to Power` (armed ↔ parliamentary) and `Revolutionary Subject` (proletariat ↔
  peasantry) — the second is about *who* makes the revolution, which stays meaningful
  even for Eurocommunism.

---

## 5. Known limitations

- **Anchors are hand-specified.** Same caveat as Module 1 §6: once there's live data,
  fit each sub-ideology anchor to the centroid of respondents who self-identify with it.
  Until then these are informed estimates, and the named-profile diagnostic is the only
  thing standing between them and a misplacement.

- **Cross-listed sub-ideologies get independent anchors per bucket.** Juche, National
  Bolshevism, Objectivism, Neo-Reaction, Catholic Integralism, and Neoreactionary
  Techno-Commercialism each appear in two buckets with different 8-vectors, because the
  two buckets measure different things. Nothing keeps those two placements consistent.
  That's probably fine — a Juche respondent routed to bucket 1 by Module 1 should get
  bucket 1's reading — but it's untested.

- **σ=20 sits at 72–89% across buckets**, weakest in ML (74.5%) and Anarchism (77.8%).
  Those are the two most crowded buckets, at 18 and 17 sub-ideologies, and the crowding
  is real rather than an anchor defect — same judgement Module 1 §6 made about the
  reactionary cluster. Better to leave it than fabricate separation.

- **The label rule is untested.** `module2-axes.json` proposes: nearest anchor gives the
  primary label; second-nearest within 15% match appends a lean. This reproduces
  "Stalinist-Orthodox, Third-Worldist Lean" in shape but the 15% threshold is a guess.
  It needs the same treatment Module 1's routing got.

- **End-to-end scoring is unvalidated.** Bucket 1's questions are balanced and axis-pure,
  and a neutral respondent lands at 50.0 on all eight. What hasn't been checked is
  whether a hand-keyed orthodox-Stalinist answer sheet actually *scores* near the
  Stalinist anchor. That's the Module 2 equivalent of Module 1's named-profile test at
  the question layer, and it's the first thing to do after the remaining batteries exist.

---

## 6. Question batteries — complete

All 13 buckets now have their full 96-question batteries (1,248 questions total,
`module2-b01..b13-*-questions.json`). Each follows the bucket-1 template exactly: 12
items per axis in the fixed weight order from §2, so every bucket passes the same balance
check bucket 1 did — 52/52 full form, 27/27 short form, on all 8 axes, with no
cross-loading. Confirmed via `build.py`, which now loops over all 13 buckets. There are
also zero duplicate question texts anywhere across the full 1,248-item corpus.

Each axis's 12 items follow §1's mid-range requirement by construction: items 3–5 and
9–11 (weight 10/8/7 and −10/−8/−7) are written as moderate, concrete claims rather than
pole statements, specifically targeting the pairs that only separate on that axis. The
pairs that most needed this attention going in:

| Bucket | Pair | Deciding axis given mid-range items |
|---|---|---|
| 3 | Platformism ↔ Especifismo | Organisational Vehicle |
| 3 | Anarcha-Fem ↔ Queer ↔ Black | Analytical Primacy, Strategy |
| 5 | Feminist ↔ Multiculturalist Liberalism | Axis of Justice |
| 6 | Austrian School ↔ Objectivism | Moral Register, State Residue |
| 7 | Paleoconservatism ↔ Agrarian Conservatism | Political Style, Economic Posture |
| 8 | Integralism ↔ Falangism ↔ Clerical Fascism | Regime Form, Religion |
| 13 | Neo-Reaction ↔ Techno-Commercialism | Metaphysical Ground, Modernity |

## 7. What remains

**All three items previously listed here are done** (2026-08-18). Superseded, for the
record:

- ~~End-to-end scoring validation~~ — done, and it is now the standing regression suite.
  `accuracy_test.py` drives the real respondent path (anchor → synthesized Likert sheet →
  score → route) rather than routing hand-written vectors the way `validate.py` does.
  Current results: neutral respondent lands at exactly 50.0 on every axis of Module 1 and
  all 13 Module 2 batteries; Module 1 self-routing 13/13 and named profiles 9/9; Module 2
  recovers the right sub-ideology 151/151 on the full form and 151/151 on the 48-item
  short form. **Read the caveat in that file's docstring before quoting those numbers** —
  synthesizing answers from an anchor is self-referential, so it measures internal
  consistency and anchor separability, *not* construct validity. Only human respondents
  establish the latter. The meaningful robustness figures are the belief-drift ones
  (σ=10: 92.9% bucket / 96.7% tendency; σ=15: 85.6% / 90.4%; σ=20: 74.0% / 80.5%).
- ~~Build the results page~~ — done; see §8.
- ~~Presentation-layer shuffling~~ — done; seeded mulberry32 + Fisher-Yates, seed held in
  `sessionStorage` so a mid-quiz refresh doesn't reshuffle, with an in-memory fallback for
  frames where storage is blocked.

- ~~`validate2.py` cannot run~~ — fixed (2026-08-19). It imported `m2_data_a.py`,
  `m2_data_b.py`, `m2_data_c.py` and `q_b01.py`, none of which were ever checked into this
  project (not in the KEY.zip manifest). Rewired to load the same axes/anchors from
  `module2-axes.json` instead. Re-run output matches this file's §1 results table exactly
  (min pair, σ=10, σ=15 all match per bucket), confirming the reconstruction is faithful.
  It still carries no named test-profile answer sheets (`profiles` is empty per bucket, so
  that diagnostic reports a trivial 0/0 PASS) — `accuracy_test.py`'s named profiles and the
  persona testing in `PERSONA-TEST-RESULTS.md` cover that ground instead.

- ~~The 15-point compound-label threshold is still a guess~~ — calibrated (2026-08-19),
  see §9.

Genuinely still open: nothing at the module-2 layer. Remaining limitations are all in
§5 (hand-specified anchors, cross-listed-sub-ideology consistency, σ=20 crowding) and are
accepted trade-offs pending live data, not defects.

## 9. Label-threshold calibration (2026-08-19)

`LABEL_THRESHOLD` in `src/app.js` (matchPercent gap within which the results page
appends a compound "X, Y Lean" label) was 15 with no justification beyond reproducing
the shape of the one sample label in the sub-ideology reference. `label_threshold_test.py`
gives it the same empirical treatment `validate.py`'s MC_TARGETS gave the bucket-routing
thresholds, checking two failure modes across all 151 named sub-ideologies:

- **False positive**: a textbook (zero-noise) single-ideology respondent gets a spurious
  second label they never endorsed. Happens whenever that sub-ideology's nearest neighbor
  sits within `threshold` matchPercent points — which, given axis design only guarantees
  pairwise separation down to a 35.0 raw-distance floor (≈12.4 matchPercent points, see §1
  MIN_PAIR_OK), was structurally almost guaranteed at 15.
- **Blend recall**: a respondent synthesized as a genuine 50/50 mix of each bucket's
  closest anchor pair should trigger the compound label and name both ingredients.

At 15: **64.2% false-positive rate at zero noise**, rising to 74.2% under sigma=10 belief
drift — the compound label was firing on most respondents regardless of genuine ambiguity.
9 is the smallest integer threshold with 100% blend recall (no genuine 50/50 tie missed),
cutting the false-positive rate to 12.6% (zero noise) / 40.4% (sigma=10). Changed
`LABEL_THRESHOLD` 15 → 9, rebuilt via `build.py`. No axis changed, so `RESULT_VERSION`
does not need a bump — labels are recomputed from scores on load, never stored in the URL.

Partial blends (30/70, 40/60) mostly don't compound at threshold 9 — judged correct
behavior, not a gap: a minority 30% lean toward a second tendency is weaker evidence than
a 50/50 tie, so silence is more defensible than a false alarm there.

## 8. Front end

`build.py` bundles `src/{style.css,app.js}` plus all 14 data JSONs into a single
standalone `conferadar.html` (~323 KB) — no fetch, no CORS, runs from `file://` and
inside an iframe. Run `python3 build.py` after any edit to `src/` or the data.

Two things worth knowing before changing it:

- **Radar semantics.** A spoke's radius is the *strength of the lean* (`|score−50|×2`),
  and the vertex is labelled with the pole actually landed on. Plotting raw 0–100 as the
  radius draws a hard negative-pole conviction as a short spoke, which reads as "weak on
  this" — the opposite of the truth. Consequence: two shared results are not directly
  comparable side by side, since the same screen position means a different pole for each
  respondent.
- **Results are embedded in the URL** as `#r=<49 chars>` (base36, fixed width). The hash
  carries scores, not answers; routing and labels are recomputed on load. The payload is
  positional, so `RESULT_VERSION` in `app.js` must be bumped on any axis add/remove/
  rename/reorder in any bucket — see the comment there.
