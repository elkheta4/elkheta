# Deployment & Setup Guide

This guide explains how to configure your environment variables and deploy the "El Kheta Sales" application.

## 1. Creating the `.env.local` File

The `.env.local` file stores sensitive information like API keys and passwords. **Never commit this file to GitHub.**

### Steps:
1.  Go to the root of your project folder (where `package.json` is).
2.  Create a new file named `.env.local`.
3.  Copy and paste the template below into the file.
4.  Fill in the values as described in the next section.

### Template
```env
# --- Google Sheets Service Account (For Reading/Writing Data) ---
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account-email@project-id.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour...\n-----END PRIVATE KEY-----\n"

# --- Sheet IDs ---
# The ID is the long string in the sheet URL: docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit
SHEET_ID_USERS="your_users_sheet_id"
SHEET_ID_SALES="your_sales_sheet_id"
SHEET_ID_WALLETS="your_wallets_sheet_id"

# --- Google Drive OAuth (For Uploading Images) ---
# Used for uploading wallet proofs to a shared folder
GOOGLE_OAUTH_CLIENT_ID="your_oauth_client_id"
GOOGLE_OAUTH_CLIENT_SECRET="your_oauth_client_secret"
GOOGLE_REFRESH_TOKEN="your_refresh_token"

# --- Drive Folder Config ---
WALLETS_PROOF_SCREEN_FOLDER_ID="your_target_folder_id_for_images"
```

---

## 2. How to Get These Values

### A. Google Service Account (Sheets)
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project (or select existing).
3.  Enable the **Google Sheets API**.
4.  Go to **IAM & Admin** > **Service Accounts**.
5.  Create a Service Account.
6.  Copy the **Email** -> `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
7.  Go to the **Keys** tab, create a new JSON key.
8.  Open the downloaded JSON file. Copy the `private_key` value -> `GOOGLE_PRIVATE_KEY`.
    *   *Note*: Ensure the `\n` characters are preserved if copying manually. The app handles them.
9.  **Important**: Share your Google Sheets (Users, Sales, Wallets) with the `GOOGLE_SERVICE_ACCOUNT_EMAIL` (give "Editor" access) so the bot can edit them.

### B. Sheet IDs
1.  Open your Google Sheet.
2.  Look at the URL: `https://docs.google.com/spreadsheets/d/1aBcD.../edit`
3.  The text between `/d/` and `/edit` is your ID.

### C. Google Drive OAuth (For Images)
1.  In Google Cloud Console, enable **Google Drive API**.
2.  Go to **APIs & Services** > **OAuth consent screen**. Set it to **External** (or Internal for Workspace). Fill in required fields.
3.  Go to **Credentials**, create **OAuth Client ID** (Web Application).
    *   **Authorized Redirect URIs**: `http://localhost:3000/api/auth/google/callback` (for local dev).
        *   *For Production*: Add your domain callback, e.g., `https://your-app.vercel.app/api/auth/google/callback`.
4.  Copy **Client ID** and **Client Secret**.
5.  **Getting the Refresh Token**:
    *   Run the app locally (`npm run dev`).
    *   Visit `http://localhost:3000/api/auth/google`.
    *   Login with the Google Account that owns the Drive folder.
    *   The app should print the `Refresh Token` in your terminal console (you may need to check the code in `api/auth/google/callback/route.js` to ensure it logs or saves it first).
6.  Share the target upload folder with this Google Account.

---

## 3. Deployment

We recommend **Vercel** for deploying Next.js applications.

### Step 1: Push to GitHub
Make sure your code is pushed to a GitHub repository.

### Step 2: Deploy on Vercel
1.  Go to [Vercel.com](https://vercel.com) and sign up/login.
2.  Click **Add New...** > **Project**.
3.  Import your GitHub repository.
4.  **Environment Variables**:
    *   Copy content from your `.env.local`.
    *   Paste it into the "Environment Variables" section in Vercel.
5.  Click **Deploy**.

### Step 3: Production Configuration (IMPORTANT)
The current code may have `http://localhost:3000` hardcoded for the Google OAuth Callback.
1.  **Update Routes**: Check `src/app/(backend)/api/auth/google/route.js`.
2.  Replace:
    ```javascript
    'http://localhost:3000/api/auth/google/callback'
    ```
    With:
    ```javascript
    process.env.NEXT_PUBLIC_BASE_URL + '/api/auth/google/callback'
    ```
3.  Add `NEXT_PUBLIC_BASE_URL` to your Vercel Environment variables (e.g., `https://elkheta-sales.vercel.app`).
4.  **Update Google Cloud Console**: Add your Vercel URL to the "Authorized Redirect URIs" for your OAuth Client.
