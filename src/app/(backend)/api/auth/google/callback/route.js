import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return new NextResponse(`
      <html>
        <head><title>Auth Error</title></head>
        <body style="font-family: system-ui; padding: 2rem; direction: ltr;">
          <h1 style="color: red;">❌ Authorization Failed</h1>
          <p>Error: ${error}</p>
          <p>Please try again.</p>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });
  }

  if (!code) {
    return new NextResponse(`
      <html>
        <head><title>Auth Error</title></head>
        <body style="font-family: system-ui; padding: 2rem; direction: ltr;">
          <h1 style="color: red;">❌ No Authorization Code</h1>
          <p>No code received from Google.</p>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      'http://localhost:3000/api/auth/google/callback'
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      return new NextResponse(`
        <html>
          <head><title>Auth Error</title></head>
          <body style="font-family: system-ui; padding: 2rem; direction: ltr;">
            <h1 style="color: orange;">⚠️ No Refresh Token</h1>
            <p>Google didn't return a refresh token.</p>
            <p>This might happen if you already authorized this app before.</p>
            <h3>To fix:</h3>
            <ol>
              <li>Go to <a href="https://myaccount.google.com/permissions" target="_blank">Google Account Permissions</a></li>
              <li>Find "Sales Dashboard" and click "Remove Access"</li>
              <li>Try again: <a href="/api/auth/google">Authorize Again</a></li>
            </ol>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    return new NextResponse(`
      <html>
        <head>
          <title>Auth Success</title>
          <style>
            body { font-family: system-ui; padding: 2rem; direction: ltr; max-width: 800px; margin: 0 auto; }
            .token-box { background: #f0f0f0; padding: 1rem; border-radius: 8px; word-break: break-all; margin: 1rem 0; }
            .copy-btn { background: #4285f4; color: white; border: none; padding: 0.5rem 1rem; cursor: pointer; border-radius: 4px; }
            .steps { background: #e8f5e9; padding: 1rem; border-radius: 8px; margin-top: 1.5rem; }
            .steps li { margin: 0.5rem 0; }
          </style>
        </head>
        <body>
          <h1 style="color: green;">✅ Authorization Successful!</h1>
          
          <h3>Your Refresh Token:</h3>
          <div class="token-box" id="token">${refreshToken}</div>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('${refreshToken}'); this.innerText='Copied! ✓';">
            Copy Token
          </button>
          
          <div class="steps">
            <h3>Next Steps:</h3>
            <ol>
              <li>Copy the token above</li>
              <li>Open <code>.env.local</code> file</li>
              <li>Replace <code>GOOGLE_REFRESH_TOKEN=""</code> with:<br>
                <code>GOOGLE_REFRESH_TOKEN="${refreshToken}"</code>
              </li>
              <li>Restart the dev server (<code>npm run dev</code>)</li>
              <li>Test uploading a proof image!</li>
            </ol>
          </div>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });

  } catch (err) {
    console.error('[OAuth Callback] Error:', err);
    return new NextResponse(`
      <html>
        <head><title>Auth Error</title></head>
        <body style="font-family: system-ui; padding: 2rem; direction: ltr;">
          <h1 style="color: red;">❌ Token Exchange Failed</h1>
          <p>Error: ${err.message}</p>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });
  }
}
