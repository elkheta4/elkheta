import { NextResponse } from 'next/server';
import { getUsersSheet } from '@/lib/googleSheets'; // Adjust path if needed

// Force dynamic needed to prevent static caching of login
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const data = await request.json();
    const { username, password } = data;

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 });
    }

    const sheet = await getUsersSheet();
    const rows = await sheet.getRows();

    // Headers: UserID(0), Username(1), Password(2), Email(3), AgentName(4), Role(5), Wallets(6)
    // getRows returns valid rows. We assume headers are row 1 (0-index in Grid), so rows start from 2.
    // google-spreadsheet rows objects are accessible by header name usually, but let's verify header row usage.
    // If strict on indices:
    // Row 1: Headers.
    // Row 2+: Data.
    // `rows` array indices access data rows.

    // Using header names is safer if structured correctly:
    // 'UserID', 'Username', 'Password', 'Email', 'AgentName', 'Role', 'Wallets'

    // Find User
    const userRow = rows.find(row =>
      row.get('Username') == username && row.get('Password') == password
    );

    if (userRow) {

      // Parse Wallets
      let wallets = [];
      const rawWallets = userRow.get('Wallets');
      if (rawWallets) {
        wallets = String(rawWallets).split(',').map(w => w.trim()).filter(w => w);
      }

      return NextResponse.json({
        success: true,
        user: {
          userId: userRow.get('User ID'),
          username: userRow.get('Username'),
          email: userRow.get('Email'),
          agentName: userRow.get('Agent Name'),
          role: userRow.get('Role'),
          wallet1: wallets[0] || '',
          wallet2: wallets[1] || '',
          wallet3: wallets[2] || '',
          wallets: wallets
        }
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });

  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ success: false, error: 'System Error: ' + error.message }, { status: 500 });
  }
}
