# Connect the contact form (about 10 minutes)

The form on the website sends each message to a small Google Apps Script. The script:

- saves the message as a new row in a **Google Sheet** (your inbox database, viewable on your phone or laptop), and
- **emails you** straight away, with Reply-To set to the sender so you can just hit Reply.

It's free, and you don't need any API keys.

## 1. Create the sheet

1. Go to <https://sheets.new> while signed in to the Google account you want emails sent to.
2. Name it **Portfolio inbox**.

## 2. Add the script

1. In the sheet: **Extensions → Apps Script**.
2. Delete the sample code, paste in everything from [`Code.gs`](Code.gs), and press **Save** (💾).
3. In the function dropdown at the top, choose **`testSetup`** and press **Run**.
4. Google asks for permission. Choose your account → **Advanced** → **Go to (project name) (unsafe)** → **Allow**.
   The warning appears because you wrote the script yourself and Google hasn't reviewed it; it only gets access to this sheet and to sending email as you.
5. Check your email for "Portfolio inbox is set up", and check the sheet now has a **Messages** tab.

## 3. Publish it as a web app

1. **Deploy → New deployment**.
2. Click the gear ⚙ next to "Select type" → **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**. ("Anyone" lets the website send to it. Nobody can read your sheet through it.)
4. **Deploy**, then copy the **Web app URL**. It ends in `/exec`.
5. Optional check: open that URL in a browser. You should see `{"ok":true,"service":"portfolio-inbox"}`.

## 4. Put the URL in the website

1. On GitHub, open `docs/assets/js/config.js` and click the pencil (Edit).
2. Paste the URL between the quotes: `CONTACT_ENDPOINT: "https://script.google.com/macros/s/…/exec",`
3. **Commit changes**. GitHub Pages republishes in about a minute.
4. Send yourself a test message from the live site.

## Changing the script later

Edit the code, then **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. Doing it this way keeps the URL the same, so you don't need to touch `config.js` again.

## Good to know

- Free Google accounts can send 100 emails a day from Apps Script, far more than a portfolio needs.
- To get emails at a different address, set `NOTIFY_EMAIL` at the top of `Code.gs`.
- Mark rows as `Replied` in the **Status** column to track who you've answered.
