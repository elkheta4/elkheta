import { NextResponse } from 'next/server';
import { getUsersSheet, getAgentSheet } from '@/lib/googleSheets';
import { withRetry } from '@/lib/retryUtils';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const data = await request.json();
    const { startDate, endDate, agentName } = data;

    let headers = [];
    let allRows = [];
    const agentsToFetch = [];

    // 1. Identify Agents to Fetch
    if (agentName === 'All') {
        const usersSheet = await getUsersSheet();
        const userRows = await usersSheet.getRows();
        // Collect all distinct Agent Names
        const distinctAgents = new Set();
        userRows.forEach(r => {
            const name = r.get('Agent Name');
            if (name && name !== 'Admin') distinctAgents.add(name);
        });
        agentsToFetch.push(...Array.from(distinctAgents));
    } else {
        agentsToFetch.push(agentName);
    }

    // 2. Iterate and Collect Data
    for (const agent of agentsToFetch) {
        try {
            // Do NOT create sheet if missing when exporting
            const sheet = await getAgentSheet(agent, false);
            if (!sheet) continue;

            // Load all rows
            const rows = await sheet.getRows();
            
            // Set Headers from the first sheet encountered
            if (headers.length === 0) {
                headers = [...sheet.headerValues]; // Copy headers
                if (agentName === 'All') headers.push('Agent Source');
            }

            // Filter and Process Rows
            rows.forEach(row => {
                const rowData = row._rawData; // Array of strings from the sheet
                if (!rowData || rowData.length === 0) return;

                // Date Filter Logic (Column Index 3: Activation Date)
                let includeRow = true;
                if (startDate && endDate) {
                    const activationDateVal = row.get('Activation Date');
                    if (!activationDateVal) {
                        includeRow = false;
                    } else {
                        // Parse Date
                        // Code.gs parsed 'yyyy-MM-dd'. Input from frontend is likely 'yyyy-MM-dd'.
                        // Sheet date might be '12/21/2025' or '2025-12-21'.
                        const cellDate = new Date(activationDateVal);
                        if (isNaN(cellDate.getTime())) {
                            includeRow = false;
                        } else {
                            // Comparison
                            // We construct a simple string YYYY-MM-DD for comparison
                            const y = cellDate.getFullYear();
                            const m = String(cellDate.getMonth() + 1).padStart(2, '0');
                            const d = String(cellDate.getDate()).padStart(2, '0');
                            const cellDateStr = `${y}-${m}-${d}`;
                            
                            if (cellDateStr < startDate || cellDateStr > endDate) {
                                includeRow = false;
                            }
                        }
                    }
                }

                if (includeRow) {
                    // Start with the raw data array
                    // Ensure it matches header length (pad with empty strings if needed)
                    // But usually we just want the values corresponding to headers.
                    
                    // Code.gs used getDisplayValues(). google-spreadsheet _rawData IS the display values strings usually.
                    
                    const rowOut = [...rowData];
                    
                    if (agentName === 'All') {
                        rowOut.push(agent);
                    }
                    allRows.push(rowOut);
                }
            });

        } catch (e) {
            console.warn(`[Export] Failed to fetch for agent ${agent}`, e);
        }
    }

    return NextResponse.json({ success: true, headers: headers, rows: allRows });

  } catch (error) {
    console.error('Export Data Error:', error);
    return NextResponse.json({ success: false, error: 'System Error: ' + error.message }, { status: 500 });
  }
}
