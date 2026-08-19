#!/usr/bin/env python3
"""Bundle src/{index.html,style.css,app.js} + all data JSON into one
standalone conferadar.html — no fetch(), no server, works from file://
or a Discord activity iframe.
"""
import json, re

ROOT = "."
SRC = f"{ROOT}/src"

MODULE2_FILES = {
    1: "module2-b01-ml-questions.json",
    2: "module2-b02-leftcom-questions.json",
    3: "module2-b03-anarchism-questions.json",
    4: "module2-b04-socdem-questions.json",
    5: "module2-b05-progressive-questions.json",
    6: "module2-b06-classlib-questions.json",
    7: "module2-b07-conservatism-questions.json",
    8: "module2-b08-fascism-questions.json",
    9: "module2-b09-monarchism-questions.json",
    10: "module2-b10-theocracy-questions.json",
    11: "module2-b11-ancap-questions.json",
    12: "module2-b12-thirdworldism-questions.json",
    13: "module2-b13-eurasianism-questions.json",
}


def load(name):
    with open(f"{ROOT}/{name}", encoding="utf-8") as f:
        return json.load(f)


def main():
    module1 = load("module1-questions.json")
    buckets = {str(bid): load(fn) for bid, fn in MODULE2_FILES.items()}
    data = {"module1": module1, "module2": {"buckets": buckets}}

    # </script> can't appear literally inside a script body
    data_json = json.dumps(data).replace("</script>", "<\\/script>")

    css = open(f"{SRC}/style.css", encoding="utf-8").read()
    js = open(f"{SRC}/app.js", encoding="utf-8").read()

    favicon = (
        "data:image/svg+xml,"
        "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
        "%3Crect width='32' height='32' rx='5' fill='%23d9c9a3'/%3E"
        "%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='%231c2a44' stroke-width='2.5'/%3E"
        "%3Cline x1='16' y1='3' x2='16' y2='29' stroke='%231c2a44' stroke-width='1.5'/%3E"
        "%3Cline x1='3' y1='16' x2='29' y2='16' stroke='%231c2a44' stroke-width='1.5'/%3E"
        "%3Ccircle cx='16' cy='16' r='2.5' fill='%238c1f1f'/%3E"
        "%3C/svg%3E"
    )
    description = (
        "A deeper, more granular political-ideology quiz than 8values or Political "
        "Compass: a 6-axis router into 13 ideological families, then a family-specific "
        "8-axis battery placing you among 151 named sub-ideologies."
    )

    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Conferadar Values</title>
<meta name="description" content="{description}">
<meta property="og:title" content="Conferadar Values">
<meta property="og:description" content="{description}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="Conferadar Values">
<meta name="twitter:description" content="{description}">
<link rel="icon" href="{favicon}">
<style>
{css}
</style>
</head>
<body>
<div id="app"></div>
<script>window.__BUNDLED_DATA__ = {data_json};</script>
<script>
{js}
</script>
</body>
</html>
"""
    out_path = f"{ROOT}/conferadar.html"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"wrote {out_path} ({len(html)/1024:.0f} KB)")


if __name__ == "__main__":
    main()
