# google-skill

Full Google services integration for Claude Code: Gmail, Calendar, Sheets, Docs, and YouTube.

## Features

- **Gmail**: Read, send, search emails. Manage labels. Download as EML.
- **Calendar**: List, create, delete events. Multiple calendar support.
- **Sheets**: Create spreadsheets, read/write cells, append rows.
- **Docs**: Create documents, read content, insert/append text, find/replace.
- **YouTube**: Search, list videos/channels/playlists, view comments.

All services share a single OAuth authentication.

## Installation

### Via Marketplace

```bash
/plugin install The-Focus-AI/google-skill
```

### Direct Install

```bash
/plugin install https://github.com/The-Focus-AI/google-skill
```

Then restart Claude Code.

## First-Time Setup

After installation, run:

```bash
npx tsx scripts/gmail.ts auth
```

If this is your first time, you'll see setup instructions to create Google OAuth credentials. This is a one-time setup stored in `~/.config/google-skill/`.

### Required Google APIs

Enable these APIs in Google Cloud Console:
- Gmail API
- Google Calendar API
- Google Sheets API
- Google Docs API
- YouTube Data API v3
- Google Drive API

### OAuth Scopes

The skill requests these scopes:
- Gmail: read, send, modify
- Calendar: read, events
- Sheets: full access
- Docs: full access
- YouTube: read, upload
- Drive: read-only (for listing files)

### Token Storage

```
~/.config/google-skill/
└── credentials.json   # OAuth client (you create once, shared across projects)

.claude/
└── google-skill.local.json   # Per-project refresh token (auto-created)
```

## Usage

Once authenticated, Claude can:

- **Gmail**: "check my unread emails", "send an email to...", "search for emails from..."
- **Calendar**: "what's on my calendar today", "create a meeting for..."
- **Sheets**: "list my spreadsheets", "read cells A1:D10 from...", "create a spreadsheet"
- **Docs**: "list my documents", "read document...", "create a doc called..."
- **YouTube**: "list my videos", "search YouTube for...", "get comments on..."

### Manual Commands

```bash
# Gmail
npx tsx scripts/gmail.ts list
npx tsx scripts/gmail.ts list --query="is:unread"
npx tsx scripts/gmail.ts read <message-id>
npx tsx scripts/gmail.ts send --to=x@y.com --subject="Hi" --body="Hello"
npx tsx scripts/gmail.ts --help

# Calendar
npx tsx scripts/gmail.ts calendars
npx tsx scripts/gmail.ts events
npx tsx scripts/gmail.ts create --summary="Meeting" --start="2026-01-15T10:00:00" --end="2026-01-15T11:00:00"

# Sheets
npx tsx scripts/gsheets.ts list
npx tsx scripts/gsheets.ts read <spreadsheetId> "Sheet1!A1:D10"
npx tsx scripts/gsheets.ts write <spreadsheetId> "Sheet1!A1" --values='[["Hello","World"]]'
npx tsx scripts/gsheets.ts create --title="My Data"
npx tsx scripts/gsheets.ts --help

# Docs
npx tsx scripts/gdocs.ts list
npx tsx scripts/gdocs.ts read <documentId>
npx tsx scripts/gdocs.ts create --title="My Document"
npx tsx scripts/gdocs.ts append <documentId> --text="New paragraph"
npx tsx scripts/gdocs.ts --help

# YouTube
npx tsx scripts/youtube.ts channels
npx tsx scripts/youtube.ts videos
npx tsx scripts/youtube.ts search --query="typescript tutorial"
npx tsx scripts/youtube.ts comments <videoId>
npx tsx scripts/youtube.ts --help
```

## Project Structure

```
google-skill/
├── .claude-plugin/
│   ├── plugin.json
│   └── skills/
│       ├── gmail/SKILL.md
│       ├── gsheets/SKILL.md
│       ├── gdocs/SKILL.md
│       └── youtube/SKILL.md
├── scripts/
│   ├── lib/
│   │   ├── auth.ts        # Shared OAuth
│   │   └── output.ts      # Shared CLI helpers
│   ├── gmail.ts           # Gmail + Calendar
│   ├── gsheets.ts         # Google Sheets
│   ├── gdocs.ts           # Google Docs
│   └── youtube.ts         # YouTube
├── package.json
└── README.md
```

## Local Development

### Test Without Installing

```bash
git clone https://github.com/The-Focus-AI/google-skill
cd google-skill
pnpm install

# Test commands
npx tsx scripts/gmail.ts --help
npx tsx scripts/gsheets.ts --help
npx tsx scripts/gdocs.ts --help
npx tsx scripts/youtube.ts --help
```

### Test as Plugin

```bash
claude --plugin-dir /path/to/google-skill
```

## Troubleshooting

### "Credentials not found"

Run `npx tsx scripts/gmail.ts auth` and follow the setup instructions.

### "Token expired" or "Invalid credentials"

```bash
rm .claude/google-skill.local.json
npx tsx scripts/gmail.ts auth
```

### "No refresh token received"

The app was already authorized. Revoke access and retry:

1. Go to https://myaccount.google.com/permissions
2. Remove access for the app
3. Run auth again

### "Access blocked" during OAuth

Check:
- All required APIs are enabled
- Your email is added as a test user
- Scopes are configured in OAuth consent screen

### Upgrading from gmail-skill

The skill will automatically detect and use old token/credential locations:
- `~/.config/gmail-skill/credentials.json` → still works
- `.claude/gmail-skill.local.json` → still works

New auth will use the new locations.

## License

MIT
