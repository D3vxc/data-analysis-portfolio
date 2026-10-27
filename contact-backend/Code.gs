/**
 * Portfolio contact form backend (Google Apps Script).
 *
 * - Saves every message as a row in the "Messages" tab of the Google Sheet this script is attached to.
 * - Emails you straight away, with Reply-To set to the sender so you can just hit Reply.
 * - Filters bots (hidden honeypot field, too-fast submissions) and limits each sender to 3 messages an hour.
 *
 * Setup steps: see SETUP.md in this folder.
 */

const SHEET_NAME = "Messages";
const HEADERS = ["Received", "Name", "Email", "Topic", "Message", "Page", "Status"];
const NOTIFY_EMAIL = ""; // leave empty to email the Google account that owns this script
const MAX_PER_HOUR = 3;

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    // Bots: the hidden "website" field is filled, or the form was submitted in under 3 seconds.
    if (data.website || (data.elapsedMs && data.elapsedMs < 3000)) return json_({ ok: true });

    const name = clean_(data.name, 100);
    const email = clean_(data.email, 200).toLowerCase();
    const topic = clean_(data.topic, 60) || "General";
    const message = clean_(data.message, 5000);
    const page = clean_(data.page, 300);

    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || message.length < 10) {
      return json_({ ok: false, error: "invalid" });
    }

    const cache = CacheService.getScriptCache();
    const key = "rate_" + Utilities.base64EncodeWebSafe(email);
    const count = Number(cache.get(key) || 0);
    if (count >= MAX_PER_HOUR) return json_({ ok: false, error: "rate_limited" });
    cache.put(key, String(count + 1), 3600);

    getSheet_().appendRow([new Date(), safe_(name), safe_(email), safe_(topic), safe_(message), safe_(page), "New"]);

    MailApp.sendEmail({
      to: NOTIFY_EMAIL || Session.getEffectiveUser().getEmail(),
      replyTo: email,
      name: "Portfolio inbox",
      subject: "New message from " + name + " · " + topic,
      body:
        name + " <" + email + "> sent you a message from your portfolio.\n\n" +
        "Topic: " + topic + "\n\n" + message + "\n\n" +
        "---\nReply to this email to answer them directly.\n" +
        "All messages: " + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    });

    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: "server" });
  } finally {
    lock.releaseLock();
  }
}

/** Visiting the web app URL in a browser shows this, which confirms the deployment works. */
function doGet() {
  return json_({ ok: true, service: "portfolio-inbox" });
}

/** Run this once from the editor: it creates the sheet tab, asks for permissions and emails you a test. */
function testSetup() {
  getSheet_();
  MailApp.sendEmail(
    NOTIFY_EMAIL || Session.getEffectiveUser().getEmail(),
    "Portfolio inbox is set up",
    "Messages from your portfolio will appear in: " + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  );
  console.log("Done. Check your email.");
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#0e6e73").setFontColor("#ffffff");
    sheet.setColumnWidth(5, 420);
    sheet.getRange("E:E").setWrap(true);
  }
  return sheet;
}

function clean_(value, maxLength) {
  return String(value == null ? "" : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, maxLength);
}

/** Stops a message like "=HYPERLINK(...)" being run as a spreadsheet formula. */
function safe_(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
