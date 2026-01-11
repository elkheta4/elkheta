import { NextResponse } from 'next/server';
import { getUsersSheet, getAgentSheet } from '@/lib/googleSheets';
import { SalesCache } from '@/lib/serverCache';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ============================================
// 🔧 HELPER FUNCTIONS
// ============================================

// Map row to object
// Map row to object
const mapRow = (row, idx, sheetId, sourceAgent) => {
  // Helper to safely get value by header name
  const getVal = (header) => {
    try {
      return row.get(header) || '';
    } catch (e) {
      return '';
    }
  };

  return {
    sheetId: sheetId,
    row: row.rowNumber,
    timestamp: getVal('Timestamp'),
    infoDetails: getVal('Info Details'),
    studentCode: getVal('Student Code'),
    activationDate: getVal('Activation Date'),
    studentName: getVal('Student Name'),
    studentNumber: getVal('Student Number'),
    phone: getVal('Student Number'), // Alias
    parentNumber: getVal('Parent Number'),
    birthday: getVal('Birthday'),
    city: getVal('City'),
    area: getVal('Area'),
    stateOfOrder: getVal('State Of Order'),
    subtype: getVal('Subtype'),
    class: getVal('Class'),
    subjectName: getVal('Subject Name'),
    orderCost: String(getVal('Order Cost')).replace(/,/g, ''),
    // proofUrl removed or optional
    note: getVal('Note'),
    wallet: getVal('Wallet'),
    transferNumber: getVal('Transfer Number'),
    transferCodeStatus: getVal('Transfer Code Status'),
    // Msg Arrive fields removed
    transferCode: getVal('Transfer Code'),
    sourceOfData: getVal('Source Of Data'),
    agentName: getVal('Agent Name') || sourceAgent,
    originalTimestamp: getVal('Timestamp')
  };
};

// Parse date for sorting
const parseDate = (str) => {
  if (!str) return 0;
  try {
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) return parsed;

    const dry = str.replace(/,/g, '').replace(/\s+/g, ' ').trim();
    const match = dry.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM|am|pm)?$/i);
    if (match) {
      const [_, d, m, y, h, min, sec, mer] = match;
      let hh = parseInt(h, 10);
      const mm = parseInt(min, 10);
      const ss = sec ? parseInt(sec, 10) : 0;
      if (mer) {
        const isPM = mer.toUpperCase() === 'PM';
        if (isPM && hh < 12) hh += 12;
        if (!isPM && hh === 12) hh = 0;
      }
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d), hh, mm, ss).getTime();
    }
    return 0;
  } catch (e) { return 0; }
};

// ============================================
// 📡 FETCH ALL SALES FROM GOOGLE SHEETS
// ============================================

async function fetchAllSalesFromGoogle() {
  console.log('[API] Fetching ALL sales from Google Sheets...');

  // 1. Get all agents from Users sheet
  const usersSheet = await getUsersSheet();
  const userRows = await usersSheet.getRows();

  const agents = userRows
    .map(r => r.get('Agent Name'))
    .filter(name => name && name !== 'Admin');

  // 2. Fetch all agent sheets
  let allSales = [];
  let successCount = 0;
  let failCount = 0;

  for (const agent of agents) {
    try {
      const sheet = await getAgentSheet(agent, false);
      if (sheet) {
        const rows = await sheet.getRows();
        const sheetId = sheet.sheetId;
        const sales = rows.map((row, idx) => mapRow(row, idx, sheetId, agent));
        allSales = allSales.concat(sales);
        successCount++;
      }
    } catch (e) {
      console.warn(`Failed to fetch sales for agent ${agent}`, e);
      failCount++;
    }
  }

  // CRITICAL FIX: If ALL agents failed, throw error to prevent "No Orders" false positive
  if (successCount === 0 && failCount > 0) {
    throw new Error('Failed to fetch data from Google Sheets (All agents failed)');
  }

  // 3. Sort by timestamp (newest first)
  allSales.sort((a, b) => parseDate(b.timestamp) - parseDate(a.timestamp));

  // 4. Clean up
  allSales.forEach(s => delete s.originalTimestamp);

  console.log(`[API] Fetched ${allSales.length} total sales from all agents (Success: ${successCount}, Failed: ${failCount})`);

  return allSales;
}

// ============================================
// 🚀 API HANDLER
// ============================================

export async function POST(request) {
  try {
    const data = await request.json();
    const { agentName, showAll } = data;

    // ========================================
    // ADMIN - All Orders (Uses Server Cache)
    // ========================================
    if (agentName === 'Admin' && showAll) {

      // Check if client requested force refresh (bypass server cache)
      const forceRefresh = data.forceRefresh === true;

      let result;
      // Use optimized getOrFetch with force flag
      // This allows concurrent Admin refreshes to share one API call
      result = await SalesCache.getOrFetch(fetchAllSalesFromGoogle, forceRefresh);

      return NextResponse.json({
        success: true,
        sales: result.data,
        fromCache: result.fromCache,
        spreadsheetId: process.env.SHEET_ID_SALES
      });
    }

    // ========================================
    // REGULAR USER - My Orders (Filtered from Cache)
    // ========================================

    // Strategy: Use the same cache, but filter by agentName
    // This way, 50 users hitting the API = 1 Google API call

    // Strategies:
    // 1. Normal: SalesCache.getOrFetch(fn) -> Checks TTL, returns cached/stale
    // 2. Force: SalesCache.getOrFetch(fn, true) -> Skips TTL, joins existing promise or starts new one (Deduplicated)

    const forceRefresh = data.forceRefresh === true;

    // This handles both cases elegantly:
    // - If normal, cache is used.
    // - If forced, cache is ignored, but concurrent requests share the same Google API call.
    const result = await SalesCache.getOrFetch(fetchAllSalesFromGoogle, forceRefresh);

    // Filter for this specific agent
    const userSales = result.data.filter(sale => sale.agentName === agentName);

    // Sort by row number for single-agent view
    userSales.sort((a, b) => {
      const rowA = parseInt(a.row) || 0;
      const rowB = parseInt(b.row) || 0;
      return rowB - rowA;
    });

    return NextResponse.json({
      success: true,
      sales: userSales,
      fromCache: result.fromCache,
      spreadsheetId: process.env.SHEET_ID_SALES
    });

  } catch (error) {
    logger.error('Get Sales Error', error, {
      endpoint: '/api/sales/get'
    });

    console.error('Get Sales Error:', error);
    return NextResponse.json({
      success: false,
      error: 'System Error: ' + error.message
    }, { status: 500 });
  }
}
