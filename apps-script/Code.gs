/**
 * Conferadar Values — opt-in result collection backend.
 *
 * Bind this script to a Google Sheet (Extensions > Apps Script), deploy as a
 * web app, and paste the deployment URL into SUBMIT_ENDPOINT in src/app.js.
 * See ../SETUP-DATA-COLLECTION.md for the full walkthrough.
 *
 * Receives one JSON row per opt-in submission and appends it to the active
 * sheet. No auth — this is a public, unauthenticated, write-only endpoint by
 * design (anonymous opt-in from a static site with no backend of its own).
 * That means it's also spammable/floodable by anyone who finds the URL;
 * there's no defense against that here beyond what Apps Script's own quotas
 * provide. Treat the sheet as unverified data, not a clean dataset.
 */

const HEADER = [
  'timestamp', 'form',
  'm1_bucket', 'm1_econ', 'm1_auth', 'm1_soli', 'm1_chng', 'm1_legi', 'm1_impe', 'm1_match',
  'm2_bucket_id', 'm2_label', 'm2_primary', 'm2_secondary', 'm2_match',
  'cultural_score', 'accuracy_rating', 'self_id_text',
];

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADER);

  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'bad json' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const m1 = data.m1 || {};
  const m1axes = m1.axes || {};
  const m2 = data.m2 || {};

  sheet.appendRow([
    new Date(),
    data.form || '',
    m1.bucket || '',
    m1axes.econ, m1axes.auth, m1axes.soli, m1axes.chng, m1axes.legi, m1axes.impe,
    m1.matchPercent,
    m2.bucketId, m2.label || '', m2.primary || '', m2.secondary || '', m2.matchPercent,
    data.culturalScore,
    data.accuracyRating || '',
    data.selfId || '',
  ]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
