# Conferadar Values

A standalone political-ideology quiz, deeper and more granular than tests like
8values or Political Compass. Two stages:

- **Module 1 (Bucket Test)** — ~94 questions across 6 structural axes (Economic,
  Authority, Solidarity Basis, Change Orientation, Legitimacy, Imperial
  Orientation) route the respondent into one of 13 ideological family buckets
  (Marxism-Leninism, Anarchism, Social Democracy, Conservatism, Fascism,
  Theocracy, Anarcho-Capitalism, ...).
- **Module 2 (Tendency Test)** — a bucket-specific, 96-question battery scoring
  8 axes unique to that family, placing the respondent among its named
  sub-ideologies (151 total across all 13 buckets) on a radar chart.

Results are computed and encoded entirely client-side — nothing is sent
anywhere. A shared result link carries only the axis scores (as a short
base36 URL fragment), not the answers; labels and routing are recomputed on
load.

## Running it

Open `conferadar.html` directly in a browser — it's a single self-contained
file (~324 KB, all question data and JS/CSS bundled in), no server, no build
step, no network requests. It also works inside an iframe (e.g. a Discord
Activity).

## Development

Source lives in `src/` (`app.js`, `style.css`, `index.html`) plus one JSON
file per module/bucket (`module1-questions.json`,
`module2-b01..b13-*-questions.json`, `module2-axes.json`). After editing
either, rebuild the bundle:

```sh
python3 build.py
```

### Tests

```sh
python3 validate.py            # Module 1: pairwise separation, Monte Carlo
                                # self-routing under noise, named profiles
python3 validate2.py           # same three diagnostics, per Module 2 bucket
python3 accuracy_test.py       # end-to-end: synthesizes an answer sheet from
                                # each anchor, scores it through the real
                                # pipeline, checks it routes back to itself
python3 label_threshold_test.py  # calibration check for the compound-label
                                  # ("X, Y Lean") threshold
```

`accuracy_test.py` synthesizes answers from the anchor vectors themselves, so
it's self-referential — it verifies internal consistency and that anchors are
separable given the item weights, not construct validity (whether the
questions actually capture the beliefs they claim to). See
`PERSONA-TEST-RESULTS.md` for genuine-persona-based construct-validity
testing, and `MODULE2-NOTES.md` / `WORDING-ISSUES.md` for the design and
tuning history.

## License

MIT — see `LICENSE`.
