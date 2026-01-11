# ☁️ Vercel Deployment & Google Auth Guide

## 1. Environment Variables (Required)
These variables must be added in **Vercel Dashboard -> Settings -> Environment Variables**.

| Variable Name | Description |
| :--- | :--- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | From your service account JSON |
| `GOOGLE_PRIVATE_KEY` | The long key starting with `-----BEGIN PRIVATE KEY...` |
| `SHEET_ID_USERS` | ID of the Users Google Sheet |
| `SHEET_ID_SALES` | ID of the Sales Google Sheet |
| `ORDERS_PROOF_FOLDER_ID` | Drive Folder ID for Order Proofs |
| `WALLETS_PROOF_SCREEN_FOLDER_ID` | Drive Folder ID for Wallet Proofs |
| `GOOGLE_OAUTH_CLIENT_ID` | From Google Cloud Console (OAuth Client) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | From Google Cloud Console (OAuth Client) |
| `GOOGLE_REFRESH_TOKEN` | **The Critical Key** (See below how to get it) |

---

## 2. Default "Service Account" vs "OAuth"
*   **Service Account** (`GOOGLE_PRIVATE_KEY`): Used for reading/writing to Sheets.
*   **OAuth** (`GOOGLE_REFRESH_TOKEN`): Used for uploading files to *your* personal Drive as "You".

---

## 3. How to Rotate/Generate a New Refresh Token
If your upload stops working or the token expires, follow these steps:

### Step 1: Run Locally
Ensure your app is running locally:
```bash
npm run dev
```

### Step 2: Authorize
Open this URL in your browser:
[http://localhost:3000/api/auth/google](http://localhost:3000/api/auth/google)

1.  Login with the **Owner's Google Account** (the one that owns the Drive folders).
2.  Grant the permissions requested.
3.  You will see a success screen with a long **Refresh Token**.

### Step 3: Update Local Environment
Copy the token and paste it into your `.env.local` file:
```env
GOOGLE_REFRESH_TOKEN="1//04........"
```

### Step 4: Update Vercel
1.  Go to **Vercel Dashboard** -> Project -> Settings -> Environment Variables.
2.  Find `GOOGLE_REFRESH_TOKEN`.
3.  Click **Edit** (pencil icon).
4.  Paste the **New Token**.
5.  Click **Save**.

### Step 5: Redeploy (Crucial!)
Changes won't apply until you rebuild.
1.  Go to **Deployments** tab.
2.  Click the **... (three dots)** next to the latest deployment.
3.  Click **Redeploy**.

---

## 4. Troubleshooting
*   **Upload Error?** Check if `WALLETS_PROOF_SCREEN_FOLDER_ID` is correct and shared with the account.
*   **Build Error?** Ensure you didn't miss any variables.
