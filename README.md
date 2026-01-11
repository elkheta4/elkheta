<div align="center">

# 🚀 Sales Dashboard Ahmed 2026

<img src="public/images/logo.webp" alt="Logo" width="200"/>

### A Complete Sales & Order Management System

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

[Live Demo](https://sales-dashboard-ten-sage.vercel.app) • [Features](#-features) • [Installation](#-installation) • [Project Structure](#-project-structure)

</div>

---

## 📋 Overview

**Sales Dashboard** is a full-stack web application built with **Next.js 16** that provides:

- 🔐 Multi-role authentication system (Admin / User)
- 📊 Admin dashboard with comprehensive statistics
- 📝 Order and sales management
- 👥 User management
- 📤 Data export to Excel

---

## ✨ Features

### 🔐 Authentication & Security
- Secure login system
- Role-based route protection
- Secure session management

### 👨‍💼 Admin Dashboard
| Feature | Description |
|---------|-------------|
| 📊 System Overview | Comprehensive sales statistics |
| 👥 User Management | Add/Edit/Delete users |
| 📦 All Orders | View and manage all orders |
| 📤 Export Data | Export to Excel |

### 👤 User Dashboard
| Feature | Description |
|---------|-------------|
| 📊 Overview | Personal statistics |
| ➕ New Order | Add new orders |
| 📦 My Orders | View personal orders |

---

## 🛠️ Tech Stack

<div align="center">

| Technology | Usage |
|------------|-------|
| ![Next.js](https://img.shields.io/badge/Next.js-000?logo=next.js) | Main Framework |
| ![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black) | UI Library |
| ![CSS](https://img.shields.io/badge/CSS3-1572B6?logo=css3) | Styling |
| ![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?logo=google-sheets&logoColor=white) | Database |
| ![Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel) | Hosting |

</div>

---

## 📁 Project Structure

```
src/
├── 📁 app/
│   ├── 📁 (frontend)/          # UI & Pages
│   │   ├── 📁 admin/           # Admin pages
│   │   ├── 📁 user/            # User pages
│   │   └── 📁 login/           # Login page
│   │
│   ├── 📁 (backend)/           # APIs
│   │   └── 📁 api/
│   │       ├── 📁 auth/        # Authentication
│   │       ├── 📁 sales/       # Sales endpoints
│   │       └── 📁 users/       # User endpoints
│   │
│   ├── layout.js               # Root layout
│   └── page.js                 # Home page
│
├── 📁 components/              # Shared components
├── 📁 context/                 # React Context
├── 📁 services/                # API services
├── 📁 lib/                     # External libraries
├── 📁 utils/                   # Utility functions
└── 📁 styles/                  # Global styles
```

---

## 🚀 Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/ahmedmostafa8/sales-dashboard.git

# 2. Navigate to directory
cd sales-dashboard

# 3. Install dependencies
npm install

# 4. Create environment file
cp .env.example .env.local
# Then add the required variables

# 5. Run the project
npm run dev
```

---

## ⚙️ Environment Variables

Create a `.env.local` file and add the following.
> **Note:** This project uses **Service Account** (for Sheets) and **OAuth 2.0** (for Drive Uploads).

```env
# --- Google Sheets (Service Account) ---
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_SPREADSHEET_ID=your-google-sheet-id

# --- Google Drive Uploads (OAuth 2.0) ---
GOOGLE_OAUTH_CLIENT_ID=your-oauth-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-oauth-client-secret
GOOGLE_REFRESH_TOKEN=your-long-refresh-token
ORDERS_PROOF_FOLDER_ID=your-drive-folder-id
```

---

## ☁️ Google Cloud Setup (Critical)

To make **Image Uploads** work, you must set up **OAuth 2.0**:

1.  **Create OAuth Client**:
    *   Go to **Google Cloud Console > Credentials**.
    *   Create **OAuth 2.0 Client ID** (Web Application).
    *   Get `Client ID` and `Client Secret`.

2.  **Configure Redirect URIs**:
    *   **Authorized Origins:**
        *   `http://localhost:3000`
        *   `https://your-app.vercel.app`
    *   **Authorized Redirect URIs:**
        *   `http://localhost:3000/api/auth/google/callback`
        *   `https://your-app.vercel.app/api/auth/google/callback`

3.  **Get Refresh Token**:
    *   Run the app locally (`npm run dev`).
    *   Visit `http://localhost:3000/api/auth/google`.
    *   Login with your Google Account.
    *   Copy the **Refresh Token** displayed and save it to `.env.local` (and Vercel).

4.  **Production Mode**:
    *   Go to **OAuth Consent Screen**.
    *   Click **"Publish App"** (Switch to Production).
    *   *You do NOT need to verify the app. Just accept the "Unverified" warning when generating the token.*
    *   **Effect:** Tokens will now last indefinitely (no 7-day expiry).

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Lint the code |

---

## 🌐 Deploy on Vercel

1.  **Push to GitHub**: Commit your code.
2.  **Import to Vercel**: Connect repository.
3.  **Environment Variables**:
    *   **Copy ALL variables** from `.env.local` to Vercel Settings.
    *   *Tip:* For `GOOGLE_PRIVATE_KEY`, simple paste the whole string (Vercel handles the newlines).
4.  **Update Google Console**:
    *   Add your Vercel Domain (`https://...`) to the **Authorized Origins** and **Redirect URIs** in Google Cloud Console.
5.  **Deploy!** 🚀

## 👨‍💻 Developer

<div align="center">

**Ahmed Mostafa**

[![GitHub](https://img.shields.io/badge/GitHub-ahmedmostafa8-181717?style=for-the-badge&logo=github)](https://github.com/ahmedmostafa8)

</div>

---

<div align="center">

### ⭐ If you like this project, don't forget to star it!

Made with ❤️ By Ahmed Mostafa

</div>
