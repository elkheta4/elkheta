import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Config Variables
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const SHEET_ID_USERS = process.env.SHEET_ID_USERS;
const SHEET_ID_SALES = process.env.SHEET_ID_SALES;

// Debug Logs (Server Side)
console.log('[GoogleSheets] Init Check:', {
    hasEmail: !!SERVICE_ACCOUNT_EMAIL,
    hasKey: !!PRIVATE_KEY,
    keyLength: PRIVATE_KEY ? PRIVATE_KEY.length : 0,
    sheetUsers: SHEET_ID_USERS,
    sheetSales: SHEET_ID_SALES
});

if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY || !SHEET_ID_USERS) {
    console.error('[GoogleSheets] Missing Env Vars');
    throw new Error('Missing Google Sheets Environment Variables');
}

// Singleton Auth Client
const serviceAccountAuth = new JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY,
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
    ],
});

export const getUsersSheet = async () => {
    const doc = new GoogleSpreadsheet(SHEET_ID_USERS, serviceAccountAuth);
    await doc.loadInfo();
    return doc.sheetsByTitle['Users'];
};

export const getAgentSheet = async (agentName, createIfMissing = true) => {
    // Note: If using a separate Spreadsheet for Sales, use SHEET_ID_SALES.
    // If using the SAME spreadsheet as Users (tabs), use SHEET_ID_USERS.
    // Based on user request "SEPARATE SHEETS: Users Spreadsheet... Sales Spreadsheet...", we assume distinct IDs.

    if (!SHEET_ID_SALES) {
        throw new Error('Missing SHEET_ID_SALES Environment Variable');
    }

    const doc = new GoogleSpreadsheet(SHEET_ID_SALES, serviceAccountAuth);
    await doc.loadInfo();

    if (!agentName) {
        throw new Error('Agent Name is required to fetch sheet');
    }

    // ROBUST SEARCH: Case-insensitive and Trimmed check
    const targetName = String(agentName).trim().toLowerCase();

    let sheet;
    // Iterate over all sheets to find a match
    for (const s of doc.sheetsByIndex) {
        if (s.title.trim().toLowerCase() === targetName) {
            sheet = s;
            break;
        }
    }

    if (!sheet) {
        if (!createIfMissing) {
            return null; // Don't create, just return null
        }

        console.log(`[GoogleSheets] Sheet for agent '${agentName}' not found. Creating new sheet.`);
        // Create if not exists (Auto-provisioning for new agents)
        sheet = await doc.addSheet({
            title: agentName.trim(), headerValues: [
                'Timestamp', 'Info Details', 'Student Code', 'Activation Date', 'Student Name',
                'Student Number', 'Parent Number', 'Birthday', 'City', 'Area',
                'State Of Order', 'Subtype', 'Class', 'Subject Name', 'Order Cost', 'Note', 'Wallet',
                'Transfer Number', 'Transfer Code Status', 'Transfer Code', 'Source Of Data', 'Agent Name'
            ]
        });
    }
    return sheet;
};
