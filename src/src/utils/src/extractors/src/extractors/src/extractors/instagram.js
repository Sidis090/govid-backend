const axios = require('axios');

/**
 * Instagram extractor
 *
 * IMPORTANT LIMITATION: Like Facebook, this only works for PUBLIC posts/reels from
 * public accounts. Instagram aggressively gates content behind login for anything
 * beyond the first few posts it'll serve to anonymous requests, and it rate-limits
 * unauthenticated scraping hard and quickly. A production app at scale will likely
 * need IP rotation / proxies or a paid extraction API provider.
 */

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function extractShortcode(url) {
  const match = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}

async function extractInstagram(originalUrl) {
  const shortcode = extractShortcode(originalUrl);

  if (!shortcode) {
    throw new Error('Could not resolve an Instagram post/reel shortcode from the URL.');
  }

  const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;

  const pageRes = await axios.get(embedUrl, {
    headers: {
      'User-Agent': DESKTOP_UA,
      'Accept-Language': 'en-US,en;q=0.9',
    },
    validateStatus: () => true,
  });

  const html = pageRes.data;

  if (typeof html !== 'string') {
    throw new Error('Unexpected response from Instagram.');
  }

  if (/Sorry, this page isn't available/i.test(html)) {
    throw new Error(
      'This post is unavailable — it may be private, deleted, or require login to view. Only public posts can be downloaded.'
    );
  }

  const videoMatch = html.match(/"video_url":"([^"]+)"/);
  const imageMatch = html.match(/"display_url":"([^"]+)"/);

  const rawUrl = videoMatch?.[1] || imageMatch?.[1];

  if (!rawUrl) {
    throw new Error(
      'Could not find downloadable media. The post may be private, or Instagram has changed their page structure.'
    );
  }

  const downloadUrl = rawUrl.replace(/\\u0026/g, '&').replace(/\\\//g, '/');

  const captionMatch = html.match(/"caption":"([^"]*)"/);

  return {
    platform: 'instagram',
    shortcode,
    mediaType: videoMatch ? 'video' : 'image',
    caption: captionMatch?.[1]?.replace(/\\n/g, ' ') || '',
    downloadUrl,
    requiredHeaders: {
      'User-Agent': DESKTOP_UA,
      Referer: 'https://www.instagram.com/',
    },
    note: 'Only public Instagram posts/reels are supported. Private accounts cannot be downloaded.',
  };
}

module.exports = { extractInstagram };
