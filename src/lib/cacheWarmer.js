/**
 * CACHE WARMER
 * 
 * Pre-warms the server cache on startup to prevent cold cache delays
 * for the first users.
 * 
 * This module is designed to be imported at server startup.
 */

import { SalesCache, UsersCache } from './serverCache';
import { getUsersSheet, getAgentSheet } from './googleSheets';

// ============================================
// SALES FETCH FUNCTION (Copied from sales/get for independence)
// ============================================

const fetchAllSalesFromGoogle = async () => {
  console.log('[Cache Warmer] Fetching ALL sales from Google Sheets...');
  
  const usersSheet = await getUsersSheet();
  const userRows = await usersSheet.getRows();
  
  const agents = userRows
    .map(r => r.get('Agent Name'))
    .filter(name => name && name !== 'Admin');

  let allSales = [];
  
  for (const agent of agents) {
    try {
      const sheet = await getAgentSheet(agent, false);
      if (sheet) {
        const rows = await sheet.getRows();
        const sheetId = sheet.sheetId;
        const sales = rows.map((row, idx) => {
          const r = row._rawData || [];
          const getCol = (i) => r[i] || '';
          return {
            sheetId: sheetId,
            row: row.rowNumber,
            timestamp: getCol(0),
            infoDetails: getCol(1),
            studentCode: getCol(2),
            activationDate: getCol(3),
            studentName: getCol(4),
            studentNumber: getCol(5),
            phone: getCol(5),
            parentNumber: getCol(6),
            birthday: getCol(7),
            city: getCol(8),
            area: getCol(9),
            stateOfOrder: getCol(10),
            subtype: getCol(11),
            class: getCol(12),
            subjectName: getCol(13),
            orderCost: String(getCol(14)).replace(/,/g, ''),
            proofUrl: getCol(15),
            note: getCol(16),
            wallet: getCol(17),
            transferNumber: getCol(18),
            transferCodeStatus: getCol(19),
            dateThatMsgArrive: getCol(20),
            timeThatMsgArrive: getCol(21),
            transferCode: getCol(22),
            sourceOfData: getCol(23),
            agentName: getCol(24) || agent
          };
        });
        allSales = allSales.concat(sales);
      }
    } catch (e) {
      console.warn(`[Cache Warmer] Failed to fetch sales for agent ${agent}`, e.message);
    }
  }

  console.log(`[Cache Warmer] Fetched ${allSales.length} total sales`);
  return allSales;
};

// ============================================
// USERS FETCH FUNCTION
// ============================================

const fetchAllUsersFromGoogle = async () => {
  console.log('[Cache Warmer] Fetching users from Google Sheets...');

  const sheet = await getUsersSheet();
  const rows = await sheet.getRows();

  const users = rows.map((row) => ({
    userId: row.get('User ID'),
    username: row.get('Username'),
    password: row.get('Password'),
    email: row.get('Email'),
    agentName: row.get('Agent Name'),
    role: row.get('Role'),
    wallets: row.get('Wallets'),
    row: row.rowNumber
  }));

  console.log(`[Cache Warmer] Fetched ${users.length} users`);
  return users;
};

// ============================================
// WARM FUNCTIONS
// ============================================

export const warmSalesCache = async () => {
  try {
    await SalesCache.preWarm(fetchAllSalesFromGoogle);
  } catch (error) {
    console.error('[Cache Warmer] Sales warm failed:', error.message);
  }
};

export const warmUsersCache = async () => {
  try {
    await UsersCache.preWarm(fetchAllUsersFromGoogle);
  } catch (error) {
    console.error('[Cache Warmer] Users warm failed:', error.message);
  }
};

export const warmAllCaches = async () => {
  console.log('');
  console.log('============================================================');
  console.log('[Cache Warmer] Starting cache pre-warming...');
  console.log('============================================================');
  console.log('');

  // Warm in parallel
  await Promise.all([
    warmUsersCache(),
    warmSalesCache()
  ]);

  console.log('');
  console.log('============================================================');
  console.log('[Cache Warmer] Cache pre-warming complete!');
  console.log('============================================================');
  console.log('');
};

// ============================================
// AUTO-WARM ON IMPORT (Optional - can be disabled)
// ============================================

// Uncomment below to auto-warm when this module is first imported
// warmAllCaches().catch(console.error);
