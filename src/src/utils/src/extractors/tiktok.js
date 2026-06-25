const axios = require('axios');

/**
 * TikTok extractor
 * Strategy: TikTok's mobile web page embeds a JSON blob (__UNIVERSAL_DATA_FOR_REHYDRATION__
 * or SIGI_STATE) inside the HTML containing the no-watermark "playAddr" / "downloadAddr" URLs.
 * We fetch the page with a mobile user-agent and parse that embedded JSON.
 *
 * NOTE: TikTok changes this structure periodically. If extraction starts failing,
 * the JSON key names below ("__DEFAULT_SCOPE__", "webapp.video-detail", etc.) are the
 * first thing to re-check by fetching a fresh video page and inspecting the HTML source.
 */

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

async function resolveShortUrl(url) {
  if (/vt\.tiktok\.com|vm\.tiktok\.com|tiktok\.com\/t\//.test(url)) {
    const res = await axios.get(url, {
      maxRedirects: 5,
      headers: { 'User-Agent': MOBILE_UA },
      validateStatus: () => true,
    });
    return res.request?.res?.responseUrl || url;
  }
  return url;
}

function extractVideoIdFromUrl(url) {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

async function extractTikTok(originalUrl) {
  const resolvedUrl = await resolveShortUrl(originalUrl);
  const videoId = extractVideoIdFromUrl(resolvedUrl);

  if (!videoId) {
    throw new Error(
      'Could not resolve a TikTok video ID from the provided URL. The link format may be unsupported.'
    );
  }

  const pageRes = await axios.get(resolvedUrl, {
    headers: {
      'User-Agent': MOBILE_UA,
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  const html = pageRes.data;

  const scriptMatch = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
  );

  if (!scriptMatch) {
    throw new Error(
      'Could not find TikTok page data. TikTok may have changed their page structure.'
    );
  }

  let data;
  try {
    data = JSON.parse(scriptMatch[1]);
  } catch (e) {
    throw new Error('Failed to parse TikTok page data as JSON.');
  }

  const videoDetail =
    data?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;

  if (!videoDetail) {
    throw new Error('TikTok page data did not contain video details.');
  }

  const video = videoDetail.video;
  const author = videoDetail.author;
  const stats = videoDetail.stats;

  const noWatermarkUrl = video?.downloadAddr || video?.playAddr;

  if (!noWatermarkUrl) {
    throw new Error('No downloadable video URL found in TikTok response.');
  }

  return {
    platform: 'tiktok',
    videoId,
    title: videoDetail.desc || '',
    author: {
      username: author?.uniqueId,
      nickname: author?.nickname,
      avatar: author?.avatarMedium,
    },
    stats: {
      likes: stats?.diggCount,
      comments: stats?.commentCount,
      shares: stats?.shareCount,
      plays: stats?.playCount,
    },
    thumbnail: video?.cover || video?.originCover,
    duration: video?.duration,
    downloadUrl: noWatermarkUrl,
    requiredHeaders: {
      'User-Agent': MOBILE_UA,
      Referer: 'https://www.tiktok.com/',
    },
  };
}

module.exports = { extractTikTok };
