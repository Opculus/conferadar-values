#!/usr/bin/env python3
"""Calibration test for LABEL_THRESHOLD (src/app.js), the matchPercent gap within
which the results page appends a compound "X, Y Lean" label.

Per MODULE2-NOTES.md §5/§7, the value 15 was a guess, never checked against data.
This gives it the same treatment validate.py's MC_TARGETS gave the bucket-routing
thresholds: measure a false-positive rate and a sensitivity rate, and use those to
say whether 15 is actually a reasonable choice.

Two things a label rule should do:
  - STAY QUIET for a respondent who is genuinely one thing (no compound label).
  - SPEAK UP for a respondent who genuinely sits between two named tendencies.

Reuses synth_answers/score/dist from accuracy_test.py rather than re-deriving them,
and reimplements resolveModule2Label's compound-label logic (src/app.js) in Python
so the same threshold sweep can run outside the browser.
"""
import math, random, statistics

from accuracy_test import ROOT, MODULE2_FILES, load, synth_answers, score, dist

CANDIDATE_THRESHOLDS = [5, 9, 10, 15, 20, 25, 30]
CURRENT_THRESHOLD = 9


def resolve_label(scores, subs, keys, threshold):
    """Mirrors resolveModule2Label() in src/app.js."""
    maxd = math.sqrt(len(keys) * 100 ** 2)
    ranked = sorted(
        ({**s, "d": dist(scores, s["anchor"], keys)} for s in subs),
        key=lambda r: r["d"],
    )
    for r in ranked:
        r["matchPercent"] = 100 * (1 - r["d"] / maxd)
    primary = ranked[0]
    if primary.get("umbrella"):
        non_umbrella = next((s for s in ranked if not s.get("umbrella")), None)
        if non_umbrella and (primary["matchPercent"] - non_umbrella["matchPercent"]) <= threshold:
            primary = non_umbrella
    secondary = next((s for s in ranked if s["name"] != primary["name"]), None)
    compound = bool(secondary and (primary["matchPercent"] - secondary["matchPercent"]) <= threshold)
    return primary, secondary, compound, ranked


def load_buckets():
    out = []
    for bid, fn in MODULE2_FILES.items():
        d = load(fn)
        keys = [a["key"] for a in d["axes"]]
        subs = d["subIdeologies"]
        named = [s for s in subs if not s.get("umbrella")]
        qs = d["questions"]
        out.append((bid, d["meta"]["bucket"], qs, subs, named, keys))
    return out


def false_positive_rate(buckets, threshold, drift_sigma=0, rng=None):
    """Fraction of textbook (or belief-drifted) single-ideology respondents who
    incorrectly get a compound label. They hold ONE belief system; the label
    naming a second one is a false alarm."""
    fired, total, worst = 0, 0, []
    for bid, name, qs, subs, named, keys in buckets:
        b_fired = b_total = 0
        for s in named:
            anchor = s["anchor"]
            if drift_sigma:
                anchor = {k: max(0, min(100, anchor[k] + rng.gauss(0, drift_sigma))) for k in keys}
            v = score(qs, synth_answers(qs, anchor))
            primary, secondary, compound, _ = resolve_label(v, subs, keys, threshold)
            b_total += 1
            if compound:
                b_fired += 1
        fired += b_fired
        total += b_total
        worst.append((b_fired / b_total, bid, name))
    return fired / total, worst


def blend_sensitivity(buckets, threshold, fracs=(0.5,)):
    """For every bucket's closest anchor pair, synthesize a genuine blend
    respondent and check whether the compound label correctly fires and whether
    it names both true ingredients (in either order)."""
    hits, total, misses = 0, 0, []
    for bid, name, qs, subs, named, keys in buckets:
        pairs = sorted(
            ((dist(a["anchor"], b["anchor"], keys), a, b)
             for i, a in enumerate(named) for b in named[i + 1:]),
        )
        d0, a, b = pairs[0]
        for frac in fracs:
            blend = {k: a["anchor"][k] * frac + b["anchor"][k] * (1 - frac) for k in keys}
            v = score(qs, synth_answers(qs, blend))
            primary, secondary, compound, ranked = resolve_label(v, subs, keys, threshold)
            names = {a["name"], b["name"]}
            got_names = {primary["name"], secondary["name"] if secondary else None}
            ok = compound and names <= got_names
            total += 1
            hits += ok
            if not ok:
                misses.append((bid, name, a["name"], b["name"], frac, compound,
                                primary["name"], secondary["name"] if secondary else "-"))
    return hits / total, misses


def main():
    buckets = load_buckets()
    n_named = sum(len(named) for *_, named, _ in buckets)
    print(f"{n_named} named sub-ideologies across {len(buckets)} buckets\n")

    print("=" * 78)
    print("SWEEP — false-positive rate (textbook respondent, zero noise) vs.")
    print("        blend sensitivity (genuine 50/50 respondent between closest pair)")
    print("=" * 78)
    print(f"{'threshold':>9}  {'FP rate (noise=0)':>19}  {'FP rate (sigma=10)':>19}  {'blend recall':>13}")
    rng = random.Random(0)
    for t in CANDIDATE_THRESHOLDS:
        fp0, _ = false_positive_rate(buckets, t)
        fp10, _ = false_positive_rate(buckets, t, drift_sigma=10, rng=random.Random(0))
        recall, _ = blend_sensitivity(buckets, t)
        marker = "  <-- current" if t == CURRENT_THRESHOLD else ""
        print(f"{t:9d}  {fp0:18.1%}  {fp10:18.1%}  {recall:12.1%}{marker}")
    print()

    print("=" * 78)
    print(f"DETAIL AT CURRENT THRESHOLD ({CURRENT_THRESHOLD})")
    print("=" * 78)
    fp0, worst0 = false_positive_rate(buckets, CURRENT_THRESHOLD)
    print(f"\nzero-noise false-positive rate: {fp0:.1%}")
    print("worst buckets (textbook respondent wrongly gets a compound label):")
    for rate, bid, name in sorted(worst0, reverse=True)[:5]:
        print(f"  {rate:5.1%}  b{bid:02d} {name}")

    recall, misses = blend_sensitivity(buckets, CURRENT_THRESHOLD)
    print(f"\nblend sensitivity (50/50 between each bucket's closest pair): {recall:.1%}")
    if misses:
        print("missed blends (should have compounded, didn't — or named the wrong pair):")
        for bid, name, a, b, frac, compound, got_p, got_s in misses[:8]:
            print(f"  b{bid:02d} {name}: {a} + {b} -> compound={compound}  got '{got_p}' / '{got_s}'")

    print()
    print("=" * 78)
    print("READING")
    print("=" * 78)
    print("""
A false positive means a respondent who answered as a textbook adherent of ONE
sub-ideology gets told they're also leaning toward a second one they never
endorsed — this happens whenever that sub-ideology's own nearest neighbor sits
within `threshold` matchPercent points, which is a property of how tightly
module2-axes.json's anchors are packed, not of the respondent.

Blend sensitivity measures the opposite failure: a respondent synthesized as a
genuine 50/50 mix of the two closest anchors in each bucket SHOULD trigger the
compound label and name both ingredients. A recall below 100% means some
buckets pack ideologies close enough that even an even blend doesn't cross the
gap threshold, understating the ambiguity.
""".strip())


if __name__ == "__main__":
    main()
