# PT Academy — CRM Issue Form

A lightweight, no-code-backend ticketing system for logging CRM issues. The form collects submissions and stores them in Google Sheets for developer review and tracking.

## Quick Start

1. **Read `SETUP.md`** for complete step-by-step deployment instructions.
2. The setup involves:
   - Creating a Google Sheet and Drive folder for storage
   - Deploying a Google Apps Script Web App (backend)
   - Hosting the form on GitHub Pages (frontend)

## What's Included

- **`index.html`** — The form (HTML structure)
- **`style.css`** — Professional styling
- **`script.js`** — Form validation, submission logic, screenshot handling
- **`Code.gs`** — Google Apps Script backend (handles Sheet writes and screenshot uploads)
- **`SETUP.md`** — Complete deployment guide
- **`README.md`** — This file

## Key Features

✓ **No backend infrastructure** — runs entirely on Google services  
✓ **Screenshot upload** — automatically saved to Google Drive  
✓ **Dropdown team member selection** — reduces typos  
✓ **Auto-incrementing ticket numbers** — for easy tracking  
✓ **Severity and category triage** — helps prioritize issues  
✓ **Responsive design** — works on desktop and mobile  
✓ **Free hosting** — via GitHub Pages  

## Form Fields

- **Name** (dropdown) — Team member selection
- **CRM URL** (text) — Where the issue occurred
- **Date/Time** (auto-filled, read-only) — Submission timestamp
- **Category** (dropdown) — Bug, Data Issue, Access Problem, Other
- **Severity** (dropdown) — Low, Medium, High, Critical
- **Issue Description** (textarea) — Detailed problem explanation
- **Screenshot** (file upload, optional) — Up to 5MB

## Data Storage

Submissions are stored in a Google Sheet with these columns:

| Column | Content |
|--------|---------|
| Ticket # | Auto-incrementing ID |
| Date Submitted | Submission timestamp |
| Name | Team member name |
| CRM URL | Link to the issue location |
| Category | Issue type |
| Severity | Priority level |
| Issue Description | Full issue text |
| Screenshot Link | Drive link to uploaded image |
| Status | Open / In Progress / Resolved |
| Developer Notes | Dev tracking notes |

## Setup Overview

1. Create a Google Sheet to store issues
2. Create a Google Drive folder for screenshots
3. Deploy a Google Apps Script Web App (backend)
4. Configure the frontend with the Apps Script URL
5. Push to GitHub and enable GitHub Pages
6. Share the form URL with the team

**See `SETUP.md` for detailed instructions.**

## Development

To modify the form:
- Edit `index.html` to change fields or layout
- Edit `style.css` to adjust styling
- Edit `script.js` to change validation or submission logic
- Edit `Code.gs` to modify backend behavior (then redeploy)
- Update the team member dropdown in `index.html` as needed

After making changes:
1. Push to GitHub (form changes are live immediately)
2. If you modify `Code.gs`, redeploy the Apps Script (Deploy > New Deployment)

## Troubleshooting

**Form not submitting?**
- Verify the `APPS_SCRIPT_URL` in `script.js` is correct
- Check browser console for errors (F12)
- Ensure Apps Script deployment is set to "Anyone" access

**Screenshot not saving?**
- Check that the Google Drive folder is shared as "Anyone with link"
- Try redeploying the Apps Script

**Ticket number not incrementing?**
- Verify the Sheet ID is correct in `Code.gs`
- Run the `testDoPost()` function in Apps Script to check logs

See `SETUP.md` for more troubleshooting tips.

---

Built with ❤️ for PT Academy
