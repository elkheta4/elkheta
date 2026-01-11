import { NextResponse } from 'next/server';
import { getUsersSheet, getAgentSheet } from '@/lib/googleSheets';
import { SalesCache } from '@/lib/serverCache';
import { withRetry } from '@/lib/retryUtils';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let data = {};

  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      // Extract all form fields
      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }
    } else {
      data = await request.json();
    }

    const {
      agentName, wallet, dataMode, studentName, studentNumber,
      studentClass, transferNumber, orderCost
    } = data;

    // 1. Validate Agent & Permissions
    const usersSheet = await getUsersSheet();
    const rows = await usersSheet.getRows();

    const agentRow = rows.find(r => r.get('Agent Name') == agentName);

    if (!agentRow) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Agent not found' }, { status: 401 });
    }

    let allowedWallets = [];
    const rawWallets = agentRow.get('Wallets');
    if (rawWallets) {
      allowedWallets = String(rawWallets).split(',').map(w => w.trim());
    }

    if (wallet && !allowedWallets.includes(String(wallet))) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Wallet mismatch' }, { status: 403 });
    }

    // 2. Business Logic Validation
    if (dataMode === 'With Data') {
      if (!studentName) return NextResponse.json({ success: false, error: 'Missing Student Name' }, { status: 400 });
      if (!studentNumber) return NextResponse.json({ success: false, error: 'Missing Student Number' }, { status: 400 });

      if (data.stateOfOrder !== 'OverPayment') {
        if (!studentClass) return NextResponse.json({ success: false, error: 'Missing Class' }, { status: 400 });
      }
    }



    // 4. Prepare Data Row
    const formatDate = (date) => {
      const d = new Date(date);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const timestamp = formatDate(new Date());
    const isFullData = dataMode === 'With Data';

    // Map fields matching Code.gs index (with new Proof URL column after Order Cost)
    // Map fields matching Google Sheet Headers
    // Using an object ensures that data goes into the correct column regardless of order
    const rowObject = {
      'Timestamp': timestamp,
      'Info Details': data.infoDetails || '',
      'Student Code': data.studentCode || '',
      'Activation Date': data.activationDate || '',
      'Student Name': isFullData ? (data.studentName || '') : '',
      'Student Number': isFullData ? (data.studentNumber || '') : '',
      'Parent Number': isFullData ? (data.parentNumber || '') : '',
      'Birthday': isFullData ? (data.birthday || '') : '',
      'City': isFullData ? (data.city || '') : '',
      'Area': isFullData ? (data.area || '') : '',
      'State Of Order': data.stateOfOrder || '',
      'Subtype': data.subtype || '',
      'Class': data.studentClass || '',
      'Subject Name': data.subjectName || '',
      'Order Cost': data.orderCost || 0,
      'Note': data.note || '',
      'Wallet': data.wallet || '',
      'Transfer Number': data.transferNumber ? "'" + data.transferNumber : '',
      'Transfer Code Status': data.transferCodeStatus || '',
      'Transfer Code': data.transferCode || '',
      'Source Of Data': data.sourceOfData || '',
      'Agent Name': data.agentName || ''
    };

    // 5. Save to Agent Sheet
    const role = agentRow.get('Role');
    const isAdmin = role === 'Admin';
    const createIfMissing = !isAdmin;

    const sheet = await getAgentSheet(agentName, createIfMissing);

    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Sales Sheet not found for Admin. Auto-creation disabled.' }, { status: 400 });
    }

    // Add row with retry logic for rate limiting
    await withRetry(
      () => sheet.addRow(rowObject),
      { operationName: 'Add Sale Row', maxRetries: 3 }
    );

    // Soft invalidate - keeps stale data, triggers background refresh
    SalesCache.softInvalidate();

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Save Sale Error', error, {
      agentName: data?.agentName,
      dataMode: data?.dataMode,
      endpoint: '/api/sales/add'
    });

    console.error('Save Sale Error:', error);
    return NextResponse.json({ success: false, error: 'System Error: ' + error.message }, { status: 500 });
  }
}
