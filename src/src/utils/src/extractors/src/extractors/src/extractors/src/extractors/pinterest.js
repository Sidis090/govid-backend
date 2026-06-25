const axios = require('axios');

/**
 * Pinterest extractor
 * Strategy: Pinterest pins embed a JSON blob in a <script id="__PWS_DATA__"> tag
 * containing the full-resolution image/video URL.
 */

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function resolveShortUrl(url) {
  if (/pin\.it\//.test(url)) {
    const res = await axios.get(url, {
      maxRedirects: 5,
      headers: { 'User-Agent': DESKTOP_UA },
      validateStatus: () => true,
    });
    return res.request?.res?.responseUrl || url;
  }
  return url;
}

function extractPinId(url) {
  const match = url.match(/\/pin\/(\d+)/);
  return match ? match[1] : null;
}

async function extractPinterest(originalUrl) {
  const resolvedUrl = await resolveShortUrl(originalUrl);
  const pinId = extractPinId(resolvedUrl);

  if (!pinId) {
    throw new Error('Could not resolve a Pinterest pin ID from the provided URL.');
  }

  const pageRes = await axios.get(resolvedUrl, {
    headers: {
      'User-Agent': DESKTOP_UA,
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  const html = pageRes.data;

  const scriptMatch = html.match(
    /<script id="__PWS_DATA__"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/
  );

  if (!scriptMatch) {
    throw new Error(
      'Could not find Pinterest page data. Pinterest may have changed their page structure.'
    );
  }

  let data;
  try {
    data = JSON.parse(scriptMatch[1]);
  } catch (e) {
    throw new Error('Failed to parse Pinterest page data as JSON.');
  }

  const pinResource = Object.values(data?.props?.initialReduxState?.pins || {}).find(
    (p) => String(p.id) === pinId
  );

  if (!pinResource) {
    throw new Error('Pinterest page data did not contain pin details.');
  }

  let downloadUrl = null;
  let mediaType = 'image';

  const videoVariants = pinResource?.videos?.video_list;
  if (videoVariants) {
    const best =
      videoVariants['V_HLSV4'] ||
      videoVariants['V_720P'] ||
      Object.values(videoVariants)[0];
    downloadUrl = best?.url;
    mediaType = 'video';
  }

  if (!downloadUrl) {
    const images = pinResource?.images;
    downloadUrl =
      images?.orig?.url ||
      images?.['736x']?.url ||
      Object.values(images || {})[0]?.url;
    mediaType = 'image';
  }

  if (!downloadUrl) {
    throw new Error('No downloadable media URL found in Pinterest response.');
  }

  return {
    platform: 'pinterest',
    pinId,
    title: pinResource.title || pinResource.description || '',
    mediaType,
    thumbnail: pinResource?.images?.['236x']?.url,
    downloadUrl,
    requiredHeaders: {
      'User-Agent': DESKTOP_UA,
      Referer: 'https://www.pinterest.com/',
    },
  };
}

module.exports = { extractPinterest };
