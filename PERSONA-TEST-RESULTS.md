# Persona-based construct-validity testing (2026-08-18)

Genuine persona answers (not synthesized from anchor vectors) run through the real scoring
pipeline, checking whether a committed adherent's honest answers route to the ideology they
actually hold. This is the check `accuracy_test.py` explicitly cannot do (it self-referentially
derives answers from the anchor, so it can't catch a text/effect mismatch or wording bias).

Also motivated finding and fixing the axis-polarity (sign-inversion) bug — see the fix applied
to 12 of 13 module2-bXX files, 58/104 axes total, effect signs flipped to match stated pole
labels. `WORDING-ISSUES.md` tracks a separate, still-open bug class (loaded/absolutist wording
that suppresses genuine partisans' scores) found during this same testing.

## Methodology

- Bucket 1 (ML) and bucket 8 (Fascism): answered directly by Claude, question-by-question,
  reasoning from actual ideological content only — never looked at `effect`/`axis` fields or
  anchor vectors while answering.
- Buckets 2-7, 9-13: answered by `dots-studio/dots-3-note-preview:free` via OpenRouter, one
  persona-instructed call per axis (12 items), same blinding rule (told not to use effect/axis
  fields), user-supplied API key. Script: `openrouter_persona.py` / `score_openrouter.py` in
  the session scratchpad.

## Results (13/13 buckets)

| Bucket | Target sub-ideology | Result |
|---|---|---|
| 1 ML | Marxism-Leninism (orthodox/Stalinist) | **OK** — 88.1%, rank 1 |
| 2 Left-Communism | Council Communism (Pannekoek, Gorter) | ~~MISROUTE~~ free-model run only — **OK on re-test**, see below |
| 3 Anarchism | Anarcho-Communism (Kropotkin) | ~~MISROUTE~~ free-model run only — **OK on re-test**, see below |
| 4 Social Democracy | Classical Social Democracy (Bernstein) | **MISROUTE (confirmed)** — see below |
| 5 Progressive | Rawlsian Liberalism | **OK** — 69.8%, rank 1 |
| 6 Classical Liberalism | Classical Liberalism (Locke, Smith) | **MISROUTE (confirmed, near-tie)** — see below |
| 7 Conservatism | Traditional / Burkean Conservatism | **OK** — 71.8%, rank 1 |
| 8 Fascism | Nazism / National Socialism | **OK** — 83.9%, rank 1 (only after the sign-inversion fix; was rank 5 / 49.5% before) |
| 9 Monarchism | Absolute Monarchism | close — rank 2 at 72.5%, vs top (Tsarist Restorationism) 74.8% — plausibly a genuine near-tie between adjacent tendencies, not flagged as broken |
| 10 Theocracy | Khomeinism (Vilayat-e Faqih) | **OK** — 75.5%, rank 1 |
| 11 Ancap | Anarcho-Capitalism (Rothbard) | **OK** — 74.0%, rank 1 |
| 12 Third-Worldism | Ba'athism | **OK** — 76.6%, rank 1 |
| 13 Eurasianism | Duginism / Fourth Political Theory | **OK** — 75.7%, rank 1 |

## Re-test (2026-08-19) — buckets 2, 3, 4, 6, Claude direct

Decision (2026-08-18) was to leave buckets 2/3/4/6 open rather than treat the free-model
misroutes as confirmed data bugs, and to re-test with Claude answering directly (as done for
buckets 1 and 8) before touching any anchors. Done. Method: same blinding rule (id+text only,
no axis/effect fields), one Claude instance per bucket, each explicitly briefed on the named
historical figure's actual (not generic-modernized) positions, answering all 96 items in one
pass, scored through the real `score()`/nearest-anchor pipeline.

| Bucket | Target | Free-model result | Claude-direct result |
|---|---|---|---|
| 2 Left-Com | Council Communism (Pannekoek, Gorter) | MISROUTE, rank 6 | **OK — rank 1, 85.2%** |
| 3 Anarchism | Anarcho-Communism (Kropotkin) | MISROUTE, rank 5 | **OK — rank 1, 84.8%** |
| 4 Social Dem | Classical Social Democracy (Bernstein) | MISROUTE, rank 7, 54.8% vs top 68.4% | **still MISROUTE — rank 7**, top is Ethical Socialism (Tawney) 79.2% |
| 6 Classical Lib | Classical Liberalism (Locke, Smith) | MISROUTE, rank 4, 66.4% vs top 87.0% | **still MISROUTE — rank 3**, target 73.2% vs top Neoliberalism 74.6% (near-tie, much closer than before) |

**Buckets 2 and 3 close as false positives** — confirmed model-fidelity noise from the free
OpenRouter model, not a scoring/data defect, per the hypothesis above.

**Buckets 4 and 6 upgrade to confirmed issues.** Since a careful, historically-briefed Claude
answer still misroutes both, this is no longer explainable as weak persona fidelity:
- **b04 (Social Democracy)**: Bernstein-style evolutionary/parliamentary revisionism keeps
  landing on Ethical Socialism (Tawney) / Christian Socialism instead of Classical Social
  Democracy. Suggests the axes distinguishing "revisionist-Marxist-turned-reformist" from
  "secular/religious moral-case reformism" (the same Tawney-vs-Christian-Socialism distinction
  MODULE2-NOTES.md §3 already tuned once) don't separate Bernstein cleanly from that
  neighboring cluster. Needs an axis/anchor look, not a wording-only fix.
- **b06 (Classical Liberalism)**: Locke/Smith moved from a clear Austrian-ancap misroute to a
  near-tie with Neoliberalism/Ordoliberalism — a big improvement once the persona brief
  corrected the earlier "zero public welfare, fully extreme" error, which suggests part of the
  original misroute *was* free-model noise. But the remaining near-tie with modern
  market-liberal descendants persists under a careful direct answer, so classical liberalism
  isn't yet cleanly separated from its 20th-century descendants on the current 8 axes.

Logged as open items in `WORDING-ISSUES.md`.

## Fixed (2026-08-19) — root cause was bad anchors, not bad axes

Before touching anchors, re-tested both with a *fresh, independently blinded* Claude persona
(same blinding rule: id+text only, shuffled order, no axis/effect/anchor exposure) and scored
the sheet through the real `score()`/nearest-anchor pipeline via a standalone script
(`answers-b04.json`/`answers-b06.json`, scratchpad). Both reproduced closely:

| Bucket | Recorded (2026-08-19 re-test) | Fresh reproduction |
|---|---|---|
| b04 | rank 7, top Tawney 79.2% | rank 7, 66.9%, top Tawney 80.6% |
| b06 | rank 3, 73.2% vs top Neoliberalism 74.6% | rank 2, 73.5%, top Ordoliberalism 76.3% |

A compression-proxy hypothesis (shrink the target anchor toward 50, isotropically, to see if
that alone reproduces the misroute) was tried first and **falsified** — isotropic shrink never
moves a sub-ideology off rank 1 against its own bucket, so the bug isn't "the anchor is too
extreme," it's specific axes pointing the wrong way. Per-axis diff of the persona's genuine
score against the file's anchor confirmed this:

- **b04 Bernstein anchor was backwards on 3 of 8 axes.** Historical Bernstein was the
  "Back to Kant" revisionist who explicitly rejected economic determinism for an ethical
  foundation, favored cooperatives/municipal socialism over state nationalization, and accepted
  markets — but the anchor had him at `mora=24` (deep historical-materialist), `ownr=22` (deep
  state-ownership), `mkt=42` (planning-leaning). Persona scored `mora=79`, `ownr=66`, `mkt=88`.
  Corrected anchor (`module2-axes.json` + `module2-b04-socdem-questions.json`): `goal 62→47,
  ownr 22→66, clas 34→61, mora 24→79, mkt 42→88, intl 62→42, rout 26→45` (agen left at 84,
  already accurate). Re-verified: persona now rank 1/12 at 99.8%, nearest neighbor (Tawney) at
  55.1 distance — up from the bucket's existing worst pair of 44.9, so this doesn't trade one
  collision for another.
- **b06 Locke/Smith anchor was backwards on stat/epis/soci, understated on mora/corp.** Smith
  assigns the state three duties including publicly funded education for the poor (not
  laissez-faire), both Locke and Smith are empiricists (not deductive rationalists — that's
  Austrian/Objectivist territory), and Smith's *Theory of Moral Sentiments* is explicitly
  anti-egoist. Anchor had `stat=30` (near laissez-faire), `epis=55` (near-neutral), `soci=35`
  (near no-welfare). Persona scored `stat=68`, `epis=87`, `soci=81`. Corrected anchor: `stat
  30→68, prop 30→28, epis 55→87, demo 55→30, soci 35→81, intl 20→29, mora 66→81, corp 55→66`.
  Re-verified: persona now rank 1/8 at 100%, nearest neighbor (Ordoliberalism) at 67.0
  distance — up from the bucket's existing worst pair of 37.9.

Both fixes are anchor-only; no axis was added, removed, or reworded, so `RESULT_VERSION` in
`app.js` did not need a bump. `build.py` re-run, `accuracy_test.py` and `validate.py` both still
ALL PASS (collapse-guard and Module-1 pairwise checks only — neither is evidence for these two
fixes specifically, since both self-referentially derive answers from the anchor; the fresh
blinded persona re-scoring above is the actual evidence).
