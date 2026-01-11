import { NextResponse } from 'next/server';
import { getUsersSheet } from '@/lib/googleSheets';
import { UsersCache } from '@/lib/serverCache';

export const dynamic = 'force-dynamic';

// ============================================
// 📡 FETCH ALL USERS FROM GOOGLE SHEETS
// ============================================

async function fetchAllUsersFromGoogle() {
  console.log('[API] Fetching users from Google Sheets...');

  const sheet = await getUsersSheet();
  const rows = await sheet.getRows();

  const users = rows.map((row, i) => {
    return {
      userId: row.get('User ID'),
      username: row.get('Username'),
      password: row.get('Password'),
      email: row.get('Email'),
      agentName: row.get('Agent Name'),
      role: row.get('Role'),
      wallets: row.get('Wallets'),
      row: row.rowNumber
    };
  });

  console.log(`[API] Fetched ${users.length} users`);

  return users;
}

// ============================================
// 🚀 API HANDLER
// ============================================

export async function POST(request) {
  try {
    // Get from cache or fetch
    const result = await UsersCache.getOrFetch(fetchAllUsersFromGoogle);

    return NextResponse.json({
      success: true,
      users: result.data,
      fromCache: result.fromCache
    });

  } catch (error) {
    console.error('Get Users Error:', error);
    return NextResponse.json({
      success: false,
      error: 'System Error: ' + error.message
    }, { status: 500 });
  }
}
