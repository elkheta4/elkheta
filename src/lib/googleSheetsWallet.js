import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Config Variables from env (reusing existing auth)
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const SHEET_ID_WALLETS = process.env.SHEET_ID_WALLETS;


// Wallet Configuration
const WALLET_STRIDE = 4; // Columns per wallet
const HEADER_ROWS = 6;
const DAY_ROWS = 9;

if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY || !SHEET_ID_WALLETS) {
  throw new Error('Missing Google Sheets Environment Variables (Check .env.local)');
}

const serviceAccountAuth = new JWT({
  email: SERVICE_ACCOUNT_EMAIL,
  key: PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export const getWalletSheet = async (agentName) => {
  const doc = new GoogleSpreadsheet(SHEET_ID_WALLETS, serviceAccountAuth);
  await doc.loadInfo();

  if (!agentName) return null;
  
  const targetName = String(agentName).trim().toLowerCase();
  const sheet = doc.sheetsByIndex.find(s => s.title.trim().toLowerCase() === targetName);

  return sheet || null; // Return null if not found instead of throwing
};

const excelDateToJSDate = (serial) => {
  if (!serial) return '';
  // Convert Excel serial date to JS Date
  // Excel base date is Dec 30, 1899
  // 25569 is the difference between Excel epoch and Unix epoch
  if (typeof serial === 'number') {
     const utc_days  = Math.floor(serial - 25569);
     const utc_value = utc_days * 86400;                                        
     const date_info = new Date(utc_value * 1000);
     
     // Format as DD/MM/YYYY
     const d = date_info.getDate();
     const m = date_info.getMonth() + 1;
     const y = date_info.getFullYear();
     return `${d}/${m}/${y}`;
  }
  return String(serial); // Return as is if already string
};

const formatNumber = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val.toLocaleString();
  return val;
};

export const getWalletData = async (agentName, wallets) => {
  const sheet = await getWalletSheet(agentName);
  
  // Handle missing sheet gracefully
  if (!sheet) {
    return { success: false, error: `لم يتم العثور على محفظة لـ ${agentName} برجاء التواصل مع المسؤول` };
  }
  
  // Load all cells - this might be heavy, but necessary for reading scattered data
  // Limit to reasonable rang e.g. 1000 rows? 
  // User mentions "until the end" - let's load used range
  await sheet.loadCells(); 
  
  const rowCount = sheet.rowCount;
  const walletData = [];

  for (let wIdx = 0; wIdx < wallets.length; wIdx++) {
    const colStart = wIdx * WALLET_STRIDE;
    
    // Read Header
    const walletInfo = {
      walletNumber: wallets[wIdx],
      revenueDetails: sheet.getCell(1, colStart + 1).value, 
      fromLastMonth: formatNumber(sheet.getCell(2, colStart + 1).value), 
      totalIncome: formatNumber(sheet.getCell(3, colStart + 1).value), 
      totalExpenses: formatNumber(sheet.getCell(4, colStart + 1).value), 
      currentBalance: formatNumber(sheet.getCell(5, colStart + 1).value), 
      days: []
    };

    // Read Days
    for (let r = HEADER_ROWS; r < rowCount; r += DAY_ROWS) {
      // Check if day block exists (check Date cell)
      // Row 1 of block is empty padding
      // Row 2 is Date: Cell (r + 1, colStart + 1)
      const dateCell = sheet.getCell(r + 1, colStart + 1);
      if (!dateCell.value) break; // End of data

      const dayBlock = {
        date: excelDateToJSDate(dateCell.value), 
        rowIndex: r, // Start of block (empty row)
        dailyIncome: formatNumber(sheet.getCell(r + 2, colStart + 1).value), 
        dailyExpenses: formatNumber(sheet.getCell(r + 3, colStart + 1).value), 
        expenses: [],
        closed: false,
        closedBalance: null
      };

      // Read 4 Expense Rows (Row 5-8 of block)
      for (let e = 0; e < 4; e++) {
        const expRow = r + 4 + e;
        const name = sheet.getCell(expRow, colStart).value;
        const amount = sheet.getCell(expRow, colStart + 1).value;
        const link = sheet.getCell(expRow, colStart + 2).value;
        
        if (amount || name) {
          // Strict filter for phantom "Expencess" rows with 0 amount
          const isPhantom = String(name).trim().toLowerCase().includes('expences') || 
                           String(name).trim().toLowerCase().includes('expens') ||
                           String(name).trim().toLowerCase() === 'expencess';
          
          const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/,/g, ''));
          const isZero = !amount || numAmount === 0;

          if (!(isPhantom && isZero)) {
            dayBlock.expenses.push({ 
              name: name || '', 
              amount: formatNumber(amount), 
              link: link || '' 
            });
          }
        }
      }

      // Read Closed Status (Row 9 of block)
      const closedRow = r + 8;
      // "Wallet closed" label is at colStart
      const balanceVal = sheet.getCell(closedRow, colStart + 1).value;
      const proofVal = sheet.getCell(closedRow, colStart + 2).value;
      
      if (balanceVal !== null && balanceVal !== undefined && balanceVal !== '') {
        dayBlock.closed = true;
        dayBlock.closedBalance = formatNumber(balanceVal);
        dayBlock.proof = proofVal;
      }

      walletInfo.days.push(dayBlock);
    }
    
    walletData.push(walletInfo);
  }

  return { success: true, wallets: walletData };
};

export const updateWalletDay = async (agentName, walletIndex, dayData) => {
  const sheet = await getWalletSheet(agentName);
  
  if (!sheet) {
    return { success: false, error: `لم يتم العثور على محفظة لـ "${agentName}"` };
  }
  
  await sheet.loadCells(); // Need to load to write specific cells efficiently
  
  const colStart = walletIndex * WALLET_STRIDE;
  const { rowIndex, expenses, closedBalance, proof } = dayData;
  
  // rowIndex passed from frontend is the start of the block (the empty row)
  
  // Write Expenses (Rows 5-8 of block -> indices r+4 to r+7)
  // Clear existing first
  for (let e = 0; e < 4; e++) {
    const r = rowIndex + 4 + e;
    // Don't clear Name (colStart)
    sheet.getCell(r, colStart + 1).value = ''; // Amount
    sheet.getCell(r, colStart + 2).value = ''; // Link
  }

  // Write new
  expenses.forEach((exp, idx) => {
    if (idx < 4) {
      const r = rowIndex + 4 + idx;
      // Format amount to number if string
      let amt = exp.amount;
      if (typeof amt === 'string') {
        amt = parseFloat(amt.replace(/,/g, ''));
      }
      
      // Don't write Name (colStart)
      sheet.getCell(r, colStart + 1).value = isNaN(amt) ? 0 : amt;
      sheet.getCell(r, colStart + 2).value = exp.link || '';
    }
  });

  // Write Close Data (Row 9 of block -> index r+8)
  if (closedBalance !== undefined) {
    const r = rowIndex + 8;
    // sheet.getCell(r, colStart).value = 'Wallet closed'; // Don't touch label
    sheet.getCell(r, colStart + 1).value = closedBalance;
    sheet.getCell(r, colStart + 2).value = proof;
  }

  await sheet.saveUpdatedCells();
  return { success: true };
};
