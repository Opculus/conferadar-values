# Setting up opt-in result collection

The results screen can offer respondents an optional, anonymous "submit my
result" button — mainly useful for the accuracy-rating and self-identified-
ideology fields, which are the closest thing this project has to real
construct-validity data (do people agree with what the test told them?).
It's off by default (`SUBMIT_ENDPOINT = ''` in `src/app.js`) and only needs
this one-time setup to turn on.

GitHub Pages is static-only, so the receiving end has to live somewhere else.
Google Apps Script is used here because it's free, requires no server of
your own, and writes straight into a Google Sheet you can read/export/delete
at any time.

## 1. Create the sheet

Create a new Google Sheet (sheets.new). Anything you name it is fine — the
script writes its own header row on first submission.

## 2. Add the script

`Extensions > Apps Script`, delete the placeholder `Code.gs` contents, and
paste in this repo's `apps-script/Code.gs`. Save (`Ctrl+S` / `Cmd+S`).

## 3. Deploy as a web app

`Deploy > New deployment` → gear icon → type **Web app**. Set:

- **Execute as:** Me
- **Who has access:** Anyone

Click **Deploy**, then **Authorize access** and click through the consent
screen (it'll warn the script is unverified — that's expected for a script
you wrote yourself; proceed anyway). Copy the resulting **Web app URL**
(ends in `/exec`).

## 4. Wire it into the app

Paste that URL into `src/app.js`:

```js
const SUBMIT_ENDPOINT = 'https://script.google.com/macros/s/AKfycb.../exec';
```

Rebuild the bundle and commit:

```sh
python3 build.py
```

That's it — the results screen will now show the opt-in submission section.

## What gets collected

Per submission: the form taken (full/short), the routed family and its axis
scores, the tendency label and its axis scores, the cultural-orientation
score, and whatever the respondent optionally typed into the accuracy rating
and self-identification fields. No answers to individual questions, no name,
no email, no IP captured by the app itself — though note Google's own
infrastructure may log request metadata (IP, timestamp) on its end
regardless of what the payload contains, the same as any web request.

## Caveats

- **The endpoint is public and unauthenticated by design** (anonymous
  opt-in, no accounts). That also means it can be spammed by anyone who
  finds the URL — there's no rate limiting or validation beyond what's in
  `Code.gs`. Treat the sheet as unverified, not clean, data; skim for
  obvious junk before drawing conclusions from it.
- Submission uses `fetch(..., { mode: 'no-cors' })` because Apps Script web
  apps don't return CORS headers a browser will accept cross-origin. That
  means the client can't actually confirm the write succeeded — it just
  reports success once the request completes without a network error.
  Check the sheet directly if you want to confirm rows are landing.
- To disable collection again, blank `SUBMIT_ENDPOINT` back to `''` and
  rebuild — the entire submission section stops rendering.
