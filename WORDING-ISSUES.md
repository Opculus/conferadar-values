See also `PERSONA-TEST-RESULTS.md` for the full 13-bucket persona routing audit (2026-08-18,
re-tested 2026-08-19, anchor fix 2026-08-19). 4 buckets (Left-Com, Anarchism, Social Democracy,
Classical Liberalism) misrouted under a free-tier model's persona answers; a Claude-direct
re-test on 2026-08-19 closed Left-Com and Anarchism as free-model noise (both route correctly,
rank 1). Social Democracy and Classical Liberalism were confirmed as real bugs, reproduced with
a fresh blinded persona, root-caused to **bad anchors** (not bad axes or bad wording), and fixed
— see "Closed" below and the fix log in `PERSONA-TEST-RESULTS.md`.

# Wording / content-validity issues (found via genuine persona-answering, not the self-referential test)

Distinct from the axis-polarity (sign-inversion) bug fixed on 2026-08-18 — these items are
correctly *scored*, but worded in a way that suppresses genuine partisans' scores toward the
middle of the axis, regardless of ideology.

## Closed (2026-08-19)

- **module2-b01-ml-questions.json, lead08** — was "The cult of the individual leader has done
  serious damage to the communist movement," which used the pejorative Khrushchev-era term
  "cult of personality" — a genuine Stalinist rejects the *label*, not the idea that excessive
  personal deference is (in the abstract) a problem. Reworded to the same polarity (-9, still
  the anti-concentrated-leadership pole) without the loaded label: "Structuring the movement's
  authority around one leader's personal standing, however capable they are, leaves it fragile
  once that leader is gone." (Note: the doc's originally-proposed fix direction — a positively
  -framed "veneration was proportionate, not a distortion" — would have *flipped* the item's
  polarity and required flipping `effect` to +9, unbalancing the axis's fixed weight structure.
  Not used for that reason.)

- **module1-questions.json, impe axis (impe07/impe08/impe09)** — re-examined with a sharper
  diagnosis than "just hedging": `impe08` ("The main enemy of any population is the ruling
  power of its own state") is Liebknecht-style revolutionary-defeatism, which orthodox
  ML/Third-Worldist doctrine does *not* hold universally (a colonized/neocolonial population's
  main enemy is imperialism, not necessarily its own state) — this was a content-keying error
  (item belongs to Left-Com's doctrine, not general anti-imperialism), not just absolutism.
  Reworded to a claim anti-imperialists broadly hold regardless of faction: "A government that
  serves a foreign imperial power against its own people forfeits its legitimacy." `impe07`
  dropped "whatever form it takes" → "Armed resistance to foreign occupation is a legitimate
  response to illegitimate force." `impe09` softened "the decisive front" (excludes rival
  fronts) → "a central front... not a peripheral concern." `impe06`/`impe10` reviewed, no
  absolutist-qualifier or content-keying issue found, left unchanged. Same review, done via the
  Gemini sweep below, also flagged and fixed `legi11` (Marxist "opiate" framing forced onto the
  general secular pole → reworded without the functionalist theory-of-religion claim) and
  `soli08` ("Every national interest... is really..." → "usually mask," matching the softer
  register `soli09`/`soli10` already use). `soli03` was flagged but judged a correct, not a
  hedge-inducing, absolute — left unchanged.

- **module2-b04-socdem-questions.json** — Bernstein persona misrouting to Ethical Socialism
  (Tawney) was **not** an axis-separation problem as previously logged. Root cause: the anchor
  itself was backwards on `mora`/`ownr`/`mkt` (had Bernstein as historical-materialist,
  state-ownership, planning-leaning — the opposite of his actual "Back to Kant" revisionism).
  Anchor corrected; a fresh blinded persona now routes rank 1/12 at 99.8%, margin to nearest
  neighbor up from 44.9 to 55.1. Full diff and evidence in `PERSONA-TEST-RESULTS.md`.

- **module2-b06-classlib-questions.json** — Locke/Smith near-tying Neoliberalism/Ordoliberalism
  was likewise an anchor bug, not an axis-design gap. Anchor had Smith as near-laissez-faire,
  epistemically neutral, near-zero-welfare — contradicts Smith's own three-duties-of-the-
  sovereign position, his (and Locke's) empiricism, and *Theory of Moral Sentiments*. Anchor
  corrected; fresh blinded persona now routes rank 1/8 at 100%, margin to nearest neighbor up
  from 37.9 to 67.0.

## Broader sweep — done (2026-08-19), via `gemini-flash-lite-latest`

Swept all 111 axis-chunks (module1's 7 axes + all 13 Module 2 buckets' 8 axes each) for the
three patterns below, one axis per call, given item text + pole labels + effect sign, with an
explicit instruction to flag only where a genuine committed adherent of the item's keyed pole
would hedge or reject the wording — not just "contains an absolute word." 13 flags total out of
1,342 items reviewed. Beyond the module1 items folded into "Closed" above, three more were
judged real and fixed:
- `module2-b01-ml-questions.json mech08` — "Any restoration of markets under socialism prepares
  the restoration of capitalism" ignored that Lenin's own NEP was an orthodox-approved tactical
  market reintroduction; softened "any" → "a durable turn back toward market allocation... risks
  becoming a slide toward."
- `module2-b03-anarchism-questions.json disc03` — "lets each affiliate believe whatever it
  wants" was a caricature of synthesist federalism rather than a claim a Platformist would
  sincerely make; reworded to "tolerates real disagreement over strategy and ideology."
- `module2-b11-ancap-questions.json stra06` — "the only strategy with a real record" dropped to
  "the strategy most likely to actually" (electoral reform vs. counter-economics/exit axis).

Six more flags were reviewed and judged **not** real issues — the flagged absolute is core,
deliberate doctrine for that pole, not an artifact that would make a genuine adherent hedge:
`b01 road07` (ruling classes never yield power voluntarily — core Marxist doctrine), `b01 road10`
("never inherited" — literally the "smash the state, don't inherit it" doctrine), `b01 aes04`
("without conditions" — the defining claim of unconditional-AES-defense vs. critical-support
tendencies, not a bug), `b02 org02` ("only legitimate organs" — council communism's defining,
correctly-absolutist claim against party-vanguard models), `b02 parl12` (weak/marginal, "direct
action" plausibly already covers the flagged exclusion), `b07 stat06` ("whatever the intent" is
the intended construct — suspicion of state expansion *regardless of good intentions* is what
separates this tendency from state-capacity-friendly conservatism, not a wording defect).

`build.py` re-run after all edits above; `accuracy_test.py` (1,342/1,342 unique item texts, no
duplicates introduced) and `validate.py` both re-run, ALL PASS.
