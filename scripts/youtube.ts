#!/usr/bin/env npx tsx

/**
 * YouTube CLI - Search, list videos, channels, and playlists
 */

import { google, youtube_v3 } from "googleapis";
import { loadToken, CREDENTIALS_PATH } from "./lib/auth.js";
import { output, fail, parseArgs } from "./lib/output.js";

// ============================================================================
// YouTube Client
// ============================================================================

async function getYouTubeClient(): Promise<youtube_v3.Youtube> {
  const auth = await loadToken();
  return google.youtube({ version: "v3", auth });
}

// ============================================================================
// YouTube Operations
// ============================================================================

interface ChannelInfo {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: number;
  thumbnailUrl?: string;
}

async function listMyChannels(
  youtube: youtube_v3.Youtube
): Promise<ChannelInfo[]> {
  const res = await youtube.channels.list({
    part: ["snippet", "statistics", "contentDetails"],
    mine: true,
  });

  return (res.data.items || []).map((c) => ({
    id: c.id!,
    title: c.snippet?.title || "",
    description: c.snippet?.description || "",
    customUrl: c.snippet?.customUrl,
    subscriberCount: c.statistics?.subscriberCount
      ? parseInt(c.statistics.subscriberCount)
      : undefined,
    videoCount: c.statistics?.videoCount
      ? parseInt(c.statistics.videoCount)
      : undefined,
    viewCount: c.statistics?.viewCount
      ? parseInt(c.statistics.viewCount)
      : undefined,
    thumbnailUrl: c.snippet?.thumbnails?.default?.url,
  }));
}

async function getChannel(
  youtube: youtube_v3.Youtube,
  channelId: string
): Promise<ChannelInfo> {
  const res = await youtube.channels.list({
    part: ["snippet", "statistics", "contentDetails"],
    id: [channelId],
  });

  const c = res.data.items?.[0];
  if (!c) {
    throw new Error(`Channel not found: ${channelId}`);
  }

  return {
    id: c.id!,
    title: c.snippet?.title || "",
    description: c.snippet?.description || "",
    customUrl: c.snippet?.customUrl,
    subscriberCount: c.statistics?.subscriberCount
      ? parseInt(c.statistics.subscriberCount)
      : undefined,
    videoCount: c.statistics?.videoCount
      ? parseInt(c.statistics.videoCount)
      : undefined,
    viewCount: c.statistics?.viewCount
      ? parseInt(c.statistics.viewCount)
      : undefined,
    thumbnailUrl: c.snippet?.thumbnails?.default?.url,
  };
}

interface VideoInfo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  duration?: string;
}

async function listMyVideos(
  youtube: youtube_v3.Youtube,
  maxResults: number = 10,
  channelId?: string
): Promise<VideoInfo[]> {
  // If no channel specified, get user's channel first
  let targetChannelId = channelId;
  if (!targetChannelId) {
    const channels = await listMyChannels(youtube);
    if (channels.length === 0) {
      throw new Error("No YouTube channel found for this account");
    }
    targetChannelId = channels[0].id;
  }

  // Search for videos in the channel
  const searchRes = await youtube.search.list({
    part: ["snippet"],
    channelId: targetChannelId,
    type: ["video"],
    order: "date",
    maxResults,
  });

  const videoIds = (searchRes.data.items || [])
    .map((item) => item.id?.videoId)
    .filter(Boolean) as string[];

  if (videoIds.length === 0) {
    return [];
  }

  // Get detailed video info
  const videosRes = await youtube.videos.list({
    part: ["snippet", "statistics", "contentDetails"],
    id: videoIds,
  });

  return (videosRes.data.items || []).map((v) => ({
    id: v.id!,
    title: v.snippet?.title || "",
    description: v.snippet?.description || "",
    publishedAt: v.snippet?.publishedAt || "",
    channelId: v.snippet?.channelId || "",
    channelTitle: v.snippet?.channelTitle || "",
    thumbnailUrl: v.snippet?.thumbnails?.medium?.url,
    viewCount: v.statistics?.viewCount
      ? parseInt(v.statistics.viewCount)
      : undefined,
    likeCount: v.statistics?.likeCount
      ? parseInt(v.statistics.likeCount)
      : undefined,
    commentCount: v.statistics?.commentCount
      ? parseInt(v.statistics.commentCount)
      : undefined,
    duration: v.contentDetails?.duration,
  }));
}

async function getVideo(
  youtube: youtube_v3.Youtube,
  videoId: string
): Promise<VideoInfo> {
  const res = await youtube.videos.list({
    part: ["snippet", "statistics", "contentDetails"],
    id: [videoId],
  });

  const v = res.data.items?.[0];
  if (!v) {
    throw new Error(`Video not found: ${videoId}`);
  }

  return {
    id: v.id!,
    title: v.snippet?.title || "",
    description: v.snippet?.description || "",
    publishedAt: v.snippet?.publishedAt || "",
    channelId: v.snippet?.channelId || "",
    channelTitle: v.snippet?.channelTitle || "",
    thumbnailUrl: v.snippet?.thumbnails?.medium?.url,
    viewCount: v.statistics?.viewCount
      ? parseInt(v.statistics.viewCount)
      : undefined,
    likeCount: v.statistics?.likeCount
      ? parseInt(v.statistics.likeCount)
      : undefined,
    commentCount: v.statistics?.commentCount
      ? parseInt(v.statistics.commentCount)
      : undefined,
    duration: v.contentDetails?.duration,
  };
}

interface PlaylistInfo {
  id: string;
  title: string;
  description: string;
  itemCount: number;
  thumbnailUrl?: string;
  publishedAt: string;
}

async function listMyPlaylists(
  youtube: youtube_v3.Youtube,
  maxResults: number = 20
): Promise<PlaylistInfo[]> {
  const res = await youtube.playlists.list({
    part: ["snippet", "contentDetails"],
    mine: true,
    maxResults,
  });

  return (res.data.items || []).map((p) => ({
    id: p.id!,
    title: p.snippet?.title || "",
    description: p.snippet?.description || "",
    itemCount: p.contentDetails?.itemCount || 0,
    thumbnailUrl: p.snippet?.thumbnails?.medium?.url,
    publishedAt: p.snippet?.publishedAt || "",
  }));
}

interface PlaylistItem {
  id: string;
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  position: number;
  channelTitle: string;
}

async function getPlaylistItems(
  youtube: youtube_v3.Youtube,
  playlistId: string,
  maxResults: number = 50
): Promise<PlaylistItem[]> {
  const res = await youtube.playlistItems.list({
    part: ["snippet", "contentDetails"],
    playlistId,
    maxResults,
  });

  return (res.data.items || []).map((item) => ({
    id: item.id!,
    videoId: item.contentDetails?.videoId || "",
    title: item.snippet?.title || "",
    description: item.snippet?.description || "",
    thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
    position: item.snippet?.position || 0,
    channelTitle: item.snippet?.channelTitle || "",
  }));
}

interface SearchResult {
  id: string;
  kind: "video" | "channel" | "playlist";
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl?: string;
}

async function searchYouTube(
  youtube: youtube_v3.Youtube,
  query: string,
  maxResults: number = 10,
  type?: "video" | "channel" | "playlist"
): Promise<SearchResult[]> {
  const params: youtube_v3.Params$Resource$Search$List = {
    part: ["snippet"],
    q: query,
    maxResults,
    order: "relevance",
  };

  if (type) {
    params.type = [type];
  }

  const res = await youtube.search.list(params);

  return (res.data.items || []).map((item) => {
    let id = "";
    let kind: "video" | "channel" | "playlist" = "video";

    if (item.id?.videoId) {
      id = item.id.videoId;
      kind = "video";
    } else if (item.id?.channelId) {
      id = item.id.channelId;
      kind = "channel";
    } else if (item.id?.playlistId) {
      id = item.id.playlistId;
      kind = "playlist";
    }

    return {
      id,
      kind,
      title: item.snippet?.title || "",
      description: item.snippet?.description || "",
      channelTitle: item.snippet?.channelTitle || "",
      publishedAt: item.snippet?.publishedAt || "",
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
    };
  });
}

interface CommentInfo {
  id: string;
  authorDisplayName: string;
  authorChannelId?: string;
  textDisplay: string;
  textOriginal: string;
  likeCount: number;
  publishedAt: string;
  updatedAt: string;
}

async function getVideoComments(
  youtube: youtube_v3.Youtube,
  videoId: string,
  maxResults: number = 20
): Promise<CommentInfo[]> {
  const res = await youtube.commentThreads.list({
    part: ["snippet"],
    videoId,
    maxResults,
    order: "relevance",
  });

  return (res.data.items || []).map((thread) => {
    const comment = thread.snippet?.topLevelComment?.snippet;
    return {
      id: thread.id!,
      authorDisplayName: comment?.authorDisplayName || "",
      authorChannelId: comment?.authorChannelId?.value,
      textDisplay: comment?.textDisplay || "",
      textOriginal: comment?.textOriginal || "",
      likeCount: comment?.likeCount || 0,
      publishedAt: comment?.publishedAt || "",
      updatedAt: comment?.updatedAt || "",
    };
  });
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): void {
  console.log(`
YouTube CLI

COMMANDS:
  channels                List your YouTube channels

  channel <channelId>     Get channel details

  videos                  List your videos
    --channel=ID          Channel ID (default: your channel)
    --max=N               Max results (default: 10)

  video <videoId>         Get video details

  playlists               List your playlists
    --max=N               Max results (default: 20)

  playlist <playlistId>   Get playlist items
    --max=N               Max results (default: 50)

  search                  Search YouTube
    --query=QUERY         Search query (required)
    --max=N               Max results (default: 10)
    --type=TYPE           Filter by: video, channel, playlist

  comments <videoId>      Get video comments
    --max=N               Max results (default: 20)

EXAMPLES:
  # List your channels
  npx tsx scripts/youtube.ts channels

  # Get channel info
  npx tsx scripts/youtube.ts channel UC...

  # List your recent videos
  npx tsx scripts/youtube.ts videos
  npx tsx scripts/youtube.ts videos --max=20

  # Get video details
  npx tsx scripts/youtube.ts video dQw4w9WgXcQ

  # List your playlists
  npx tsx scripts/youtube.ts playlists

  # Get playlist videos
  npx tsx scripts/youtube.ts playlist PL...

  # Search YouTube
  npx tsx scripts/youtube.ts search --query="typescript tutorial"
  npx tsx scripts/youtube.ts search --query="coding" --type=video --max=5

  # Get video comments
  npx tsx scripts/youtube.ts comments dQw4w9WgXcQ

Credentials: ${CREDENTIALS_PATH}
Token:       .claude/google-skill.local.json (per-project)
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const { flags, positional } = parseArgs(args.slice(1));

  if (!command || command === "help" || command === "--help") {
    printUsage();
    process.exit(0);
  }

  try {
    const youtube = await getYouTubeClient();

    switch (command) {
      case "channels": {
        const channels = await listMyChannels(youtube);
        output({ success: true, data: { channels, count: channels.length } });
        break;
      }

      case "channel": {
        const channelId = positional[0];
        if (!channelId) fail("Channel ID required. Usage: youtube.ts channel <channelId>");
        const channel = await getChannel(youtube, channelId);
        output({ success: true, data: channel });
        break;
      }

      case "videos": {
        const max = parseInt(flags.max || "10", 10);
        const channelId = flags.channel;
        const videos = await listMyVideos(youtube, max, channelId);
        output({ success: true, data: { videos, count: videos.length } });
        break;
      }

      case "video": {
        const videoId = positional[0];
        if (!videoId) fail("Video ID required. Usage: youtube.ts video <videoId>");
        const video = await getVideo(youtube, videoId);
        output({ success: true, data: video });
        break;
      }

      case "playlists": {
        const max = parseInt(flags.max || "20", 10);
        const playlists = await listMyPlaylists(youtube, max);
        output({ success: true, data: { playlists, count: playlists.length } });
        break;
      }

      case "playlist": {
        const playlistId = positional[0];
        if (!playlistId) fail("Playlist ID required. Usage: youtube.ts playlist <playlistId>");
        const max = parseInt(flags.max || "50", 10);
        const items = await getPlaylistItems(youtube, playlistId, max);
        output({ success: true, data: { items, count: items.length } });
        break;
      }

      case "search": {
        const query = flags.query;
        if (!query) fail("Query required. Usage: youtube.ts search --query=QUERY");
        const max = parseInt(flags.max || "10", 10);
        const type = flags.type as "video" | "channel" | "playlist" | undefined;
        const results = await searchYouTube(youtube, query, max, type);
        output({ success: true, data: { results, count: results.length } });
        break;
      }

      case "comments": {
        const videoId = positional[0];
        if (!videoId) fail("Video ID required. Usage: youtube.ts comments <videoId>");
        const max = parseInt(flags.max || "20", 10);
        const comments = await getVideoComments(youtube, videoId, max);
        output({ success: true, data: { comments, count: comments.length } });
        break;
      }

      default:
        output({ success: false, error: `Unknown command: ${command}. Run with --help for usage.` });
        process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fail(message);
  }
}

main();
