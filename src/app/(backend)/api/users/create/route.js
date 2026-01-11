import { NextResponse } from 'next/server';
import { getUsersSheet } from '@/lib/googleSheets';
import { UsersCache } from '@/lib/serverCache';
import { withRetry } from '@/lib/retryUtils';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const data = await request.json();
    const { username, password, email, agentName, role, wallets } = data;

    if (!username || !password || !agentName || !role) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const sheet = await getUsersSheet();
    const rows = await sheet.getRows();

    // Check Duplicate Username
    const duplicate = rows.find(r => r.get('Username') == username);
    if (duplicate) {
      return NextResponse.json({ success: false, error: 'Username already exists' }, { status: 409 }); // 409 Conflict
    }

    // Generate ID: UI-xxxx
    const random4 = Math.floor(1000 + Math.random() * 9000);
    const newId = 'UI-' + random4;

    // Clean Wallets (mimic Code.gs logic: replace(/,\s*$/, ""))
    const walletsStr = wallets ? String(wallets).replace(/,\s*$/, "") : "";

    // Append Row with retry logic
    await withRetry(
      () => sheet.addRow({
        'User ID': newId,
        'Username': username,
        'Password': password,
        'Email': email || '',
        'Agent Name': agentName,
        'Role': role,
        'Wallets': "'" + walletsStr
      }),
      { operationName: 'Create User Row' }
    );

    // Soft invalidate - triggers background refresh
    UsersCache.softInvalidate();

    return NextResponse.json({ success: true, message: 'User created' });

  } catch (error) {
    console.error('Create User Error:', error);
    return NextResponse.json({ success: false, error: 'System Error: ' + error.message }, { status: 500 });
  }
}
