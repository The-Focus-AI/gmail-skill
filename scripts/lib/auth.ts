/**
 * Shared OAuth and token management for Google services
 */

import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import http from "node:http";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import open from "open";

// ============================================================================
// Configuration
// ============================================================================

// Global config for OAuth client credentials (same across all projects)
export function getGlobalConfigDir(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(xdgConfig, "google-skill");
}

// Legacy global config dir for backwards compatibility
function getLegacyGlobalConfigDir(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(xdgConfig, "gmail-skill");
}

export const GLOBAL_CONFIG_DIR = getGlobalConfigDir();
export const CREDENTIALS_PATH = path.join(GLOBAL_CONFIG_DIR, "credentials.json");

// Legacy credentials path for backwards compatibility
const LEGACY_CREDENTIALS_PATH = path.join(getLegacyGlobalConfigDir(), "credentials.json");

// Project-local token storage (different Google account per project)
const PROJECT_TOKEN_DIR = ".claude";
const PROJECT_TOKEN_FILE = "google-skill.local.json";
const LEGACY_PROJECT_TOKEN_FILE = "gmail-skill.local.json";

export function getProjectTokenPath(): string {
  return path.join(process.cwd(), PROJECT_TOKEN_DIR, PROJECT_TOKEN_FILE);
}

function getLegacyProjectTokenPath(): string {
  return path.join(process.cwd(), PROJECT_TOKEN_DIR, LEGACY_PROJECT_TOKEN_FILE);
}

// Legacy global token path (for backwards compatibility)
function getGlobalTokenPath(): string {
  return path.join(GLOBAL_CONFIG_DIR, "token.json");
}

function getLegacyGlobalTokenPath(): string {
  return path.join(getLegacyGlobalConfigDir(), "token.json");
}

// All scopes for Google services
export const SCOPES = [
  // Gmail
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  // Calendar
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  // Sheets
  "https://www.googleapis.com/auth/spreadsheets",
  // Docs
  "https://www.googleapis.com/auth/documents",
  // YouTube
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
  // Drive (for listing files across services)
  "https://www.googleapis.com/auth/drive.readonly",
];

// ============================================================================
// Setup Instructions
// ============================================================================

export const SETUP_INSTRUCTIONS = `
═══════════════════════════════════════════════════════════════════════════════
                       GOOGLE SKILL - FIRST TIME SETUP
═══════════════════════════════════════════════════════════════════════════════

This skill needs Google OAuth credentials to access Google services.

CREDENTIALS (one-time setup, shared across all projects):
  ${CREDENTIALS_PATH}

TOKENS (per-project, stores which Google account to use):
  .claude/google-skill.local.json (in your project directory)

STEP 1: Create a Google Cloud Project
──────────────────────────────────────
1. Go to: https://console.cloud.google.com/
2. Click the project dropdown (top left) → "New Project"
3. Name it anything (e.g., "Google Skill") → Create
4. Wait for it to be created, then select it

STEP 2: Enable the APIs
───────────────────────
1. Go to: https://console.cloud.google.com/apis/library
2. Search and enable these APIs:
   - Gmail API
   - Google Calendar API
   - Google Sheets API
   - Google Docs API
   - YouTube Data API v3
   - Google Drive API

STEP 3: Configure OAuth Consent Screen
──────────────────────────────────────
1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Select "External" → Create
3. Fill in:
   - App name: Google Skill (or anything)
   - User support email: your email
   - Developer contact: your email
4. Click "Save and Continue"
5. Click "Add or Remove Scopes" → Add these scopes:
   - Gmail: .../auth/gmail.readonly, .../auth/gmail.send, .../auth/gmail.modify
   - Calendar: .../auth/calendar.readonly, .../auth/calendar.events
   - Sheets: .../auth/spreadsheets
   - Docs: .../auth/documents
   - YouTube: .../auth/youtube.readonly, .../auth/youtube.upload
   - Drive: .../auth/drive.readonly
6. Click "Update" → "Save and Continue"
7. Add your email as a test user → "Save and Continue"
8. Click "Back to Dashboard"

STEP 4: Create OAuth Credentials
────────────────────────────────
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Desktop app"
4. Name: anything (e.g., "Google Skill CLI")
5. Click "Create"
6. Click "Download JSON"
7. Save the file to: ${CREDENTIALS_PATH}

   Or copy the values and create the file manually:
   {
     "installed": {
       "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
       "client_secret": "YOUR_CLIENT_SECRET"
     }
   }

STEP 5: Run auth again
──────────────────────
Once credentials.json is in place, run:
  npx tsx scripts/gmail.ts auth

This will open a browser to authenticate with Google. The token will be saved
to your project's .claude/ directory, allowing different projects to use
different Google accounts.

═══════════════════════════════════════════════════════════════════════════════
`;

// ============================================================================
// Authentication
// ============================================================================

interface Credentials {
  client_id: string;
  client_secret: string;
}

export async function loadCredentials(): Promise<Credentials> {
  // Try new location first
  for (const credPath of [CREDENTIALS_PATH, LEGACY_CREDENTIALS_PATH]) {
    try {
      const content = await fs.readFile(credPath, "utf-8");
      const data = JSON.parse(content);

      // Handle both formats: {installed: {client_id, client_secret}} or {client_id, client_secret}
      const creds = data.installed || data.web || data;

      if (!creds.client_id || !creds.client_secret) {
        continue;
      }

      return {
        client_id: creds.client_id,
        client_secret: creds.client_secret,
      };
    } catch {
      // Try next path
    }
  }

  console.error(SETUP_INSTRUCTIONS);
  throw new Error(`Credentials not found at ${CREDENTIALS_PATH}`);
}

export async function findTokenPath(): Promise<string | null> {
  // Check project-local first (new name)
  const projectPath = getProjectTokenPath();
  try {
    await fs.access(projectPath);
    return projectPath;
  } catch {
    // Not found
  }

  // Check project-local (legacy name)
  const legacyProjectPath = getLegacyProjectTokenPath();
  try {
    await fs.access(legacyProjectPath);
    return legacyProjectPath;
  } catch {
    // Not found
  }

  // Fall back to global (new name)
  const globalPath = getGlobalTokenPath();
  try {
    await fs.access(globalPath);
    return globalPath;
  } catch {
    // Not found
  }

  // Fall back to global (legacy name)
  const legacyGlobalPath = getLegacyGlobalTokenPath();
  try {
    await fs.access(legacyGlobalPath);
    return legacyGlobalPath;
  } catch {
    // Not found anywhere
  }

  return null;
}

export async function loadToken(): Promise<OAuth2Client> {
  const credentials = await loadCredentials();
  const tokenPath = await findTokenPath();

  if (!tokenPath) {
    throw new Error(
      `Token not found. Run: npx tsx scripts/gmail.ts auth\n` +
      `Token will be saved to: ${getProjectTokenPath()}`
    );
  }

  const content = await fs.readFile(tokenPath, "utf-8");
  const tokenData = JSON.parse(content);

  const oauth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    "http://localhost:3000/callback"
  );

  oauth2Client.setCredentials({
    refresh_token: tokenData.refresh_token,
  });

  return oauth2Client;
}

export async function ensureGitignore(): Promise<void> {
  const gitignorePath = path.join(process.cwd(), ".gitignore");
  const pattern = ".claude/*.local.*";

  try {
    const content = await fs.readFile(gitignorePath, "utf-8");
    if (content.includes(pattern)) {
      return; // Already configured
    }
    // Append the pattern
    const newContent = content.endsWith("\n")
      ? content + `\n# Google skill tokens (per-project auth)\n${pattern}\n`
      : content + `\n\n# Google skill tokens (per-project auth)\n${pattern}\n`;
    await fs.writeFile(gitignorePath, newContent);
    console.error(`✓ Added ${pattern} to .gitignore`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      // No .gitignore, create one
      await fs.writeFile(gitignorePath, `# Google skill tokens (per-project auth)\n${pattern}\n`);
      console.error(`✓ Created .gitignore with ${pattern}`);
    } else {
      throw err;
    }
  }
}

export async function performAuth(): Promise<void> {
  const credentials = await loadCredentials();
  const tokenPath = getProjectTokenPath();
  const tokenDir = path.dirname(tokenPath);

  // Ensure .claude directory exists
  await fs.mkdir(tokenDir, { recursive: true });

  // Ensure .gitignore is configured to exclude tokens
  await ensureGitignore();

  const oauth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    "http://localhost:3000/callback"
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.error("\nOpening browser for authentication...");
  console.error("If browser doesn't open, visit:\n", authUrl, "\n");

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:3000`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h1>Error: ${error}</h1><p>You can close this window.</p>`);
        server.close();
        reject(new Error(error));
        return;
      }

      if (code) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
              <div style="text-align: center;">
                <h1 style="color: #22c55e;">✓ Authentication Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
              </div>
            </body>
          </html>
        `);
        server.close();
        resolve(code);
        return;
      }

      res.writeHead(404);
      res.end();
    });

    server.listen(3000, () => {
      open(authUrl).catch(() => {
        console.error("Could not open browser automatically.");
      });
    });

    setTimeout(() => {
      server.close();
      reject(new Error("Authentication timeout (5 minutes)"));
    }, 300000);
  });

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh token received.\n" +
      "This can happen if you've already authorized this app.\n" +
      "Fix: Go to https://myaccount.google.com/permissions\n" +
      "     Remove access for this app, then run auth again."
    );
  }

  const tokenData = {
    refresh_token: tokens.refresh_token,
    scope: tokens.scope,
    token_type: tokens.token_type,
  };

  await fs.writeFile(tokenPath, JSON.stringify(tokenData, null, 2));
  console.error(`\n✓ Token saved to ${tokenPath}`);
}

export async function getAuthClient(): Promise<OAuth2Client> {
  return loadToken();
}
