import { NextResponse } from 'next/server';
import { getUsersSheet } from '@/lib/googleSheets';
import { UsersCache } from '@/lib/serverCache';
import { withRetry } from '@/lib/retryUtils';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const data = await request.json();
    const { userId, row, username, password, email, wallets } = data;

    const sheet = await getUsersSheet();
    const rows = await sheet.getRows();

    let userRow;
    
    // 1. Precise Targeting by Row Number (Preferred)
    if (row) {
        // google-spreadsheet rows are 0-indexed in the array, but their .rowNumber is 1-based sheet row.
        // The array returned by getRows() matches the sheet data order.
        // We can find by strict equality if row number is reliable.
        
        // Note: Code.gs: "headers are row 1, data starts row 2".
        // data.row=2 means 1st data row (index 0).
        // Since google-spreadsheet handles headers, rows[0] is essentially row 2.
        
        // Let's rely on finding by ID or Row Number property on the row object
        // if user provided row number, let's find that specific row object.
        userRow = rows.find(r => r.rowNumber == row);
    }

    // 2. Fallback to ID Search
    if (!userRow && userId) {
        userRow = rows.find(r => r.get('User ID') == userId);
    }

    if (!userRow) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check for duplicate username (excluding self)
    if (username) {
        const duplicate = rows.find(r => r.get('Username') == username && r.rowNumber !== userRow.rowNumber);
        if (duplicate) {
            return NextResponse.json({ success: false, error: 'Username already exists' }, { status: 409 });
        }
    }

    // Validation
    if (password && password.length < 6) {
        return NextResponse.json({ success: false, error: 'Password too short (min 6)' }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
        return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
    }

    // Update Fields
    if (username) userRow.set('Username', username);
    if (password) userRow.set('Password', password);
    if (email) userRow.set('Email', email);
    
    // Note: Agent Name and Role are NOT updated here, per Code.gs logic.

    if (wallets !== undefined) {
        const val = wallets ? ("'" + wallets) : "";
        userRow.set('Wallets', val);
    }

    // Save with retry logic
    await withRetry(
      () => userRow.save(),
      { operationName: 'Update User Row' }
    );

    // Soft invalidate - triggers background refresh
    UsersCache.softInvalidate();

    return NextResponse.json({ success: true, message: 'User updated' });

  } catch (error) {
    console.error('Edit User Error:', error);
    return NextResponse.json({ success: false, error: 'System Error: ' + error.message }, { status: 500 });
  }
}
