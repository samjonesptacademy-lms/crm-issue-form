# CRM Issue Form — Setup Instructions

This guide walks you through deploying the CRM Issue Form so the PT Academy team can start logging issues.

---

## Prerequisites

- A Google account (personal or Google Workspace)
- A GitHub account (for hosting the form via GitHub Pages)
- Basic familiarity with copying/pasting IDs and URLs

---

## Phase 1: Set Up Google Infrastructure

### Step 1.1 — Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2. Rename it to **"PT Academy CRM Issues"** (or a name of your choice).
3. In the first row (row 1), add these column headers in columns A–J:
   - A: `Ticket #`
   - B: `Date Submitted`
   - C: `Name`
   - D: `CRM URL`
   - E: `Category`
   - F: `Severity`
   - G: `Issue Description`
   - H: `Screenshot Link`
   - I: `Status`
   - J: `Developer Notes`

4. Freeze row 1 so it stays visible while scrolling:
   - Go to **View > Freeze > 1 row**

5. Copy the **Sheet ID** from the URL:
   - The URL looks like: `https://docs.google.com/spreadsheets/d/ABC123XYZ.../edit`
   - The Sheet ID is the long alphanumeric string between `/d/` and `/edit` (e.g., `1a2b3c4d5e6f...`)
   - **Save this ID — you'll need it in a few steps.**

---

### Step 1.2 — Create the Google Drive Folder

1. Go to [Google Drive](https://drive.google.com).
2. Create a new folder named **"CRM Issue Screenshots"** (or similar).
3. Copy the **Folder ID** from the URL:
   - Open the folder, and look at the URL: `https://drive.google.com/drive/folders/ABC123XYZ...`
   - The Folder ID is the string after `/folders/` (e.g., `1a2b3c4d5e6f...`)
   - **Save this ID — you'll need it next.**

4. Share the folder so anyone with the link can view it:
   - Right-click the folder → **Share**
   - Change sharing to **"Anyone with the link"** → **Viewer** access
   - This allows the developer to click screenshot links without needing a Google login

---https://drive.google.com/drive/folders/1tPTyX3DSPx6wY-NtZKdbzkx0VUcDsMZf?usp=drive_link

### Step 1.3 — Create the Apps Script

1. Go back to your Google Sheet ("PT Academy CRM Issues").
2. Click **Extensions > Apps Script** (this opens the Google Apps Script editor bound to your sheet).
3. A new editor window opens with a default `Code.gs` file.
4. **Delete** the existing code and paste the contents of the `Code.gs` file from this project.
5. At the top of the file, replace these two constants with the IDs you just saved:
   ```javascript
   const SHEET_ID = 'YOUR_SHEET_ID_HERE';  // Replace with your Sheet ID
   const FOLDER_ID = 'YOUR_FOLDER_ID_HERE';  // Replace with your Folder ID
   ```
6. Optionally, change `SHEET_NAME` if your sheet tab is not named "Sheet1" (usually you can leave it as-is).
7. Click **File > Save** and give the project a name like **"CRM Issue Form Backend"**.

---

### Step 1.4 — Deploy as a Web App

1. In the Apps Script editor, click **Deploy** (top right) → **New Deployment**.
2. Select **Type: Web App**.
3. Fill in the settings:
   - **Description:** "CRM Issue Form v1" (or any description)
   - **Execute as:** Select **Me** (your Google account — this is what gives the script permission to write to your sheet and Drive)
   - **Who has access:** Select **Anyone** (no login required for form submissions)
4. Click **Deploy**.
5. You'll be prompted to authorize the script. Click through and accept the permissions (it needs Sheets and Drive access).
6. After authorization, a popup shows your **deployment URL**. It looks like:
   ```
   https://script.google.com/macros/s/ABC123...XYZ/exec
   ```
   - **Copy this URL and save it — you'll paste it into the form code next.**

⚠️ **Important:** Each time you edit `Code.gs` later, you must create a new deployment. The "test deployment" URL (`/dev` suffix) only works when you're logged in, so always use the versioned URL for production.

---

## Phase 2: Configure the Frontend

### Step 2.1 — Update the Apps Script URL in script.js

1. Open the `script.js` file in a text editor (VS Code, Sublime, etc.).
2. Find this line near the top:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
   ```
3. Replace `YOUR_DEPLOYMENT_ID` with the actual deployment URL you copied in Step 1.4. For example:
   ```javascript
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwABC123...XYZ/exec';
   ```
4. Save the file.

### Step 2.2 — Customize Team Member Names

1. Open `index.html` in a text editor.
2. Find the **Name** dropdown section (search for `<select id="name"`).
3. Update the `<option>` elements with your actual team member names. For example:
   ```html
   <select id="name" name="name" required>
       <option value="" disabled selected>Select your name...</option>
       <option value="Alice Smith">Alice Smith</option>
       <option value="Bob Johnson">Bob Johnson</option>
       <option value="Carol Williams">Carol Williams</option>
       <option value="David Brown">David Brown</option>
   </select>
   ```
4. Add or remove `<option>` lines as needed for your team.
5. Save the file.

---

## Phase 3: Host on GitHub Pages (Optional but Recommended)

GitHub Pages provides free hosting and a public URL for the form.

### Step 3.1 — Create a GitHub Repository

1. Go to [GitHub](https://github.com) and log in.
2. Click the **+** icon (top right) → **New repository**.
3. Name it **crm-issue-form** (or another name).
4. Set it to **Public** (so the form is accessible).
5. Click **Create repository**.

### Step 3.2 — Push Files to GitHub

1. Clone the repository locally (or use GitHub's web interface):
   ```bash
   git clone https://github.com/YOUR_USERNAME/crm-issue-form.git
   cd crm-issue-form
   ```

2. Copy the four form files into this folder:
   - `index.html`
   - `style.css`
   - `script.js`
   - (You do NOT need to upload `Code.gs` or `SETUP.md` — those stay in Google)

3. Commit and push:
   ```bash
   git add .
   git commit -m "Add CRM Issue Form"
   git push origin main
   ```

### Step 3.3 — Enable GitHub Pages

1. Go to your GitHub repository.
2. Click **Settings** (top right).
3. In the left sidebar, click **Pages**.
4. Under "Build and deployment," select:
   - **Source:** "Deploy from a branch"
   - **Branch:** "main" and "/" (root)
5. Click **Save**.
6. GitHub will display your public URL, typically: `https://YOUR_USERNAME.github.io/crm-issue-form/`
7. Visit this URL in your browser to see the form!

---

## Phase 4: Test the Form

### Step 4.1 — Test Apps Script Logic (in Google Apps Script editor)

1. Go back to your Apps Script editor (Extensions > Apps Script from your Google Sheet).
2. Find the `testDoPost()` function at the bottom of `Code.gs`.
3. Click **Run** (top center of the editor).
4. Check the **Execution log** (View > Execution log) to see if it ran successfully.
5. Go to your Google Sheet and verify a new row was added with test data.

### Step 4.2 — Test the Full Form

1. Open the form URL in your browser (either GitHub Pages or local file).
2. Fill in all required fields:
   - Select a name from the dropdown
   - Enter a CRM URL (e.g., `https://crm.example.com/ticket/123`)
   - Date/time should auto-fill
   - Select a category and severity
   - Write a description (at least 20 characters)
   - (Optional) Upload a screenshot
3. Click **Submit Issue**.
4. You should see a success message with a ticket number.
5. Check your Google Sheet — a new row should appear with all the data.
6. If you uploaded a screenshot, the "Screenshot Link" column should have a clickable Drive link.

### Step 4.3 — Verify Ticket Number Increment

1. Submit another issue through the form.
2. Check the Google Sheet — the ticket number should be 2, 3, etc. (incrementing correctly).

---

## What's Next?

- **Share the form URL** with your PT Academy team: `https://YOUR_USERNAME.github.io/crm-issue-form/`
- **Monitor the Google Sheet** for incoming issues. The developer can:
  - Update the **Status** column (e.g., "Open" → "In Progress" → "Resolved")
  - Add notes in the **Developer Notes** column to track progress
- **To add or remove team members** later, just edit `index.html`, update the dropdown, and push to GitHub — the changes go live immediately.

---

## Troubleshooting

### Form submission shows an error
- Check that the `APPS_SCRIPT_URL` in `script.js` is correct (no typos).
- Verify the Apps Script deployment is set to "Anyone" access.
- Check the browser console for error messages (press F12, click **Console** tab).

### Screenshot link in Google Sheet doesn't open
- Make sure the Drive folder is shared as "Anyone with link can view" (not restricted).
- The link might take a moment to activate — try refreshing after a few seconds.

### Apps Script shows a permission error
- Re-run the deployment (Deploy > New Deployment > Web App) and authorize again.
- Make sure you selected "Execute as: Me" and "Who has access: Anyone".

### Form not submitting
- Ensure JavaScript is enabled in your browser.
- Try a different browser to rule out extensions or settings.
- Check the browser console (F12) for error messages.

---

## Questions or Issues?

Refer back to the plan file (`dazzling-wandering-moon.md`) for architecture details, or reach out to your development team.
