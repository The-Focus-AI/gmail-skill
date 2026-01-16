---
name: youtube
description: This skill should be used when the user asks about "youtube", "my videos", "my channel", "youtube search", "video comments", "playlists", "list videos", "channel stats", "video details", or mentions YouTube operations. Provides YouTube Data API integration for searching, listing videos, channels, and playlists.
version: 0.1.0
---

# YouTube Skill

Search YouTube, list videos, channels, playlists, and view comments.

## First-Time Setup

Run `npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/gmail.ts auth` to authenticate. This grants access to all Google services including YouTube.

## Commands

```bash
# List your YouTube channels
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/youtube.ts channels

# Get channel details
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/youtube.ts channel <channelId>

# List your videos
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/youtube.ts videos
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/youtube.ts videos --max=20
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/youtube.ts videos --channel=UC...

# Get video details
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/youtube.ts video <videoId>

# List your playlists
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/youtube.ts playlists

# Get playlist items
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/youtube.ts playlist <playlistId>

# Search YouTube
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/youtube.ts search --query="typescript tutorial"
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/youtube.ts search --query="coding" --type=video --max=5
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/youtube.ts search --query="tech" --type=channel

# Get video comments
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/youtube.ts comments <videoId>
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/youtube.ts comments <videoId> --max=50
```

## Search Options

| Option | Description |
|--------|-------------|
| `--query` | Search query (required) |
| `--max` | Max results (default: 10) |
| `--type` | Filter by: `video`, `channel`, `playlist` |

## Video IDs

Video IDs are the 11-character code in YouTube URLs:
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ` → ID is `dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ` → ID is `dQw4w9WgXcQ`

## Data Returned

**Video details include:**
- Title, description, publish date
- View count, like count, comment count
- Duration, channel info, thumbnail

**Channel details include:**
- Title, description, custom URL
- Subscriber count, video count, view count

**Playlist items include:**
- Video ID, title, description, position

## Output

All commands return JSON with `success` and `data` fields.

## Help

```bash
npx tsx ${CLAUDE_PLUGIN_ROOT}/scripts/youtube.ts --help
```
