import { NextResponse } from 'next/server';
import { getWalletData, updateWalletDay } from '@/lib/googleSheetsWallet';
import { uploadWalletProof } from '@/lib/googleDrive';
import { withRetry } from '@/lib/retryUtils';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    let body = {};
    let proofFile = null;

    // Handle FormData
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      for (const [key, value] of formData.entries()) {
        if (key === 'proofFile' && value instanceof File) {
          proofFile = value;
        } else {
             // Handle nested JSON strings if sent as form fields, or plain values
             try {
                body[key] = JSON.parse(value);
             } catch (e) {
                body[key] = value;
             }
        }
      }
    } else {
      body = await request.json();
    }

    const { action, agentName, wallets } = body;

    // Validate Common
    if (action !== 'fetch' && !agentName) {
        // Fetch might arguably need agentName too, but let logic below handle specific checks
    }

    if (action === 'fetch') {
      if (!agentName) return NextResponse.json({ success: false, error: 'Agent Name is required' }, { status: 400 });
      if (!wallets || !Array.isArray(wallets)) {
        return NextResponse.json({ success: false, error: 'Wallets array is required' }, { status: 400 });
      }
      const result = await getWalletData(agentName, wallets);
      return NextResponse.json(result);
    }

    if (action === 'updateDay') {
      const { walletIndex, data: dayData } = body;
      
      // Handle File Upload if present
      if (proofFile && proofFile.size > 0) {
          console.log('[API Wallet] Uploading file...', proofFile.name);
          
          // Get wallet number needed for folder structure
          // We need wallet number. But body only has index.
          // Retrieve wallet data to get the number? Or pass it from frontend?
          // To fetch wallet data again is expensive.
          // Better: Pass `walletNumber` from frontend in `body`.
          
          let walletNumber = body.walletNumber || `Index_${walletIndex}`;
          
          // Get Date from dayData
          // It might be inside dayData string or object
          // dayData from frontend is likely an object: { rowIndex, expenses, closedBalance, proof, dateStr }
          // We must ensure frontend sends 'dateStr' or we rely on "current date" logic in uploadWalletProof
          
          const arrayBuffer = await proofFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          const uploadRes = await uploadWalletProof(
              agentName,
              walletNumber,
              body.dateStr, // Expecting dateStr from frontend
              buffer,
              proofFile.type,
              proofFile.name
          );
          
          if (uploadRes.success) {
              dayData.proof = uploadRes.url;
          } else {
              console.error('[API Wallet] Upload Failed', uploadRes.error);
              // Fail or warning?
              return NextResponse.json({ success: false, error: 'Proof Upload Failed: ' + uploadRes.error }, { status: 500 });
          }
      }

      // Update with retry logic
      await withRetry(
        () => updateWalletDay(agentName, walletIndex, dayData),
        { operationName: 'Update Wallet Day' }
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[API Wallet Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
