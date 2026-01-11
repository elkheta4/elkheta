import { google } from 'googleapis';

// Config Variables from env


// OAuth2 Configuration (uses YOUR Google account, not service account)
const OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;



if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) {
  console.error('[GoogleDrive] Missing OAuth credentials');
}

// Create OAuth2 client with refresh token
const oauth2Client = new google.auth.OAuth2(
  OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET
);

// Set refresh token (this allows us to get new access tokens automatically)
if (REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN
  });
}

const drive = google.drive({ version: 'v3', auth: oauth2Client });

/**
 * Sanitize folder name (remove special characters)
 */
const sanitizeFolderName = (name) => {
  if (!name) return 'Unknown';
  return String(name).trim().replace(/[<>:"/\\|?*]/g, '_');
};



/**
 * Get the next available file name with versioning
 * @param {string} folderId - The folder to check
 * @param {string} baseName - Base name without extension (e.g., "01124957212")
 * @param {string} extension - File extension (e.g., "jpg")
 * @returns {Promise<string>} - The next available filename
 */
export const getNextFileName = async (folderId, baseName, extension) => {
  // Search for files starting with this baseName
  const searchResponse = await drive.files.list({
    q: `name contains '${baseName}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(name)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existingFiles = searchResponse.data.files || [];

  if (existingFiles.length === 0) {
    return `${baseName}.${extension}`;
  }

  // Find the highest version number
  let maxVersion = 1;
  const versionPattern = new RegExp(`^${baseName}(_V(\\d+))?\\.`);

  existingFiles.forEach(file => {
    const match = file.name.match(versionPattern);
    if (match) {
      if (match[2]) {
        const version = parseInt(match[2], 10);
        if (version >= maxVersion) {
          maxVersion = version + 1;
        }
      } else {
        // Base file exists without version, so next is V2
        if (maxVersion < 2) maxVersion = 2;
      }
    }
  });

  if (maxVersion === 1) {
    return `${baseName}.${extension}`;
  }

  return `${baseName}_V${maxVersion}.${extension}`;
};

/**
 * Upload a file to Google Drive
 * @param {string} folderId - Parent folder ID
 * @param {string} fileName - File name
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<{id: string, webViewLink: string}>}
 */
export const uploadFile = async (folderId, fileName, fileBuffer, mimeType) => {
  const { Readable } = await import('stream');

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: 'id, webViewLink',
    supportsAllDrives: true,  // Required for Shared Drives
  });

  return {
    id: response.data.id,
    webViewLink: response.data.webViewLink,
  };
};

/**
 * Set file permission to "Anyone with link can view"
 * @param {string} fileId - The file ID
 */
export const setPublicViewPermission = async (fileId) => {
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true,  // Required for Shared Drives
  });
};

/**
 * Get public view link for a file
 * @param {string} fileId - The file ID
 * @returns {string} - The public view URL
 */
export const getViewLink = (fileId) => {
  return `https://drive.google.com/file/d/${fileId}/view`;
};

/**
 * Find or create a Month folder inside Agent folder
 * @param {string} parentFolderId - The Agent Folder ID
 * @param {string} monthName - Month Name (e.g., "Dec 2025")
 * @returns {Promise<string>} - The folder ID
 */
export const findOrCreateMonthFolder = async (parentFolderId, monthName) => {
  const folderName = sanitizeFolderName(monthName);

  // Search for existing folder
  const searchResponse = await drive.files.list({
    q: `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id; // Return existing ID
  }

  // Create new folder
  const createResponse = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  return createResponse.data.id;
};



/**
 * Upload Wallet Proof
 * Structure: Wallets Proof Folder -> Agent Folder -> Month Folder -> Wallet_Date.ext
 */
export const uploadWalletProof = async (agentName, walletNumber, dateStr, fileBuffer, mimeType, originalFileName) => {
  try {
    const WALLETS_PROOF_FOLDER_ID = process.env.WALLETS_PROOF_SCREEN_FOLDER_ID;

    if (!WALLETS_PROOF_FOLDER_ID) {
      throw new Error('Missing WALLETS_PROOF_SCREEN_FOLDER_ID in .env.local');
    }

    // 1. Find or create Agent Folder (Inside Wallets Folder)
    // We reuse findOrCreateAgentFolder logic but with a different parent
    const agentFolderId = await findOrCreateFolder(WALLETS_PROOF_FOLDER_ID, agentName);

    // 2. Determine Month Folder Name (e.g., "Dec 2025") from dateStr
    let dateObj = new Date(); // Default to today

    if (dateStr) {
      // Try parsing "DD/MM/YYYY" common in this app
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        // new Date(y, mIndex, d)
        // parts[2] = Year, parts[1] = Month (1-12), parts[0] = Day
        dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        // Try standard parse
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) dateObj = parsed;
      }
    }

    const monthName = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' }); // "Dec 2025"

    // 3. Find or Create Month Folder
    const monthFolderId = await findOrCreateMonthFolder(agentFolderId, monthName);

    // 4. File Name: WalletNumber_(Date).ext
    // Clean wallet number
    const safeWallet = sanitizeFolderName(walletNumber);

    // Clean Date for Filename (e.g., 15 Dec 2025)
    // Use the parsed dateObj
    const formattedDate = dateObj.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    // Get extension
    let extension = 'jpg';
    if (originalFileName) {
      const parts = originalFileName.split('.');
      if (parts.length > 1) extension = parts[parts.length - 1].toLowerCase();
    } else if (mimeType) {
      if (mimeType.includes('jpeg')) extension = 'jpg';
      else if (mimeType.includes('png')) extension = 'png';
      else if (mimeType.includes('webp')) extension = 'webp';
    }

    const baseName = `${safeWallet}_(${formattedDate})`;
    const fileName = `${baseName}.${extension}`; // No versioning logic requested, but we can add if needed. File overwrites? No, Google Drive allows duplicates.

    // Check if file exists to avoid duplicates? getNextFileName logic can be reused if "versioning" is desired.
    // User didn't explicitly ask for versions, but "same name" in Drive creates duplicates.
    // Let's use getNextFileName to be safe and avoid confusion.
    const finalFileName = await getNextFileName(monthFolderId, baseName, extension);

    // 5. Upload
    const { id: fileId } = await uploadFile(monthFolderId, finalFileName, fileBuffer, mimeType);

    // 6. Permission
    await setPublicViewPermission(fileId);

    // 7. URL
    const url = getViewLink(fileId);
    return { success: true, url };

  } catch (error) {
    console.error('[GoogleDrive] Wallet Upload Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * GENERIC HELPER: Find or Create Folder
 */
const findOrCreateFolder = async (parentId, name) => {
  const folderName = sanitizeFolderName(name);
  const searchResponse = await drive.files.list({
    q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id;
  }

  const createResponse = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  return createResponse.data.id;
};
