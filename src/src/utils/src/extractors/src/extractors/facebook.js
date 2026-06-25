const axios = require('axios');

/**
 * Facebook extractor
 *
 * IMPORTANT LIMITATION: This only works reliably for PUBLIC video posts/reels that
 * don't require login to view. Facebook serves a stripped-down HTML page to
 * unauthenticated/non-JS clients (e.g. via the mbasic.facebook.com domain) which
 * embeds a direct, unobfuscated mp4 URL for public posts. Private posts, age-restricted
 * content, or anything requiring login will NOT work here.
 */

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

function toMbasicUrl(url) {
  return url
    .replace('www.facebook.com', 'mbasic.facebook.com')
    .replace('m.facebook.com', 'mbasic.facebook.com')
    .replace('facebook.com', 'mbasic.facebook.com')
    .replace('fb.watch', 'mbasic.facebook.com');
}

async function extractFacebook(originalUrl) {
  let targetUrl = originalUrl;

  if (/fb\.watch\//.test(originalUrl)) {
    const redirectRes = await axios.get(originalUrl, {
      maxRedirects: 5,
      headers: { 'User-Agent': MOBILE_UA },
      validateStatus: () => true,
    });
    targetUrl = redirectRes.request?.res?.responseUrl || originalUrl;
  }

  const mbasicUrl = toMbasicUrl(targetUrl);

  const pageRes = await axios.get(mbasicUrl, {
    headers: {
      'User-Agent': MOBILE_UA,
      'Accept-Language': 'en-US,en;q=0.9',
    },
    validateStatus: () => true,
  });

  const html = pageRes.data;

  if (typeof html !== 'string') {
    throw new Error('Unexpected response from Facebook.');
  }

  if (/log in|login|checkpoint/i.test(html) && !/playable_url/i.test(html)) {
    throw new Error(
      'This Facebook video appears to require login to view (private, restricted, or otherwise gated). Only public videos can be downloaded.'
    );
  }

  const hdMatch = html.match(/"playable_url_quality_hd":"([^"]+)"/);
  const sdMatch = html.match(/"playable_url":"([^"]+)"/);

  const rawUrl = hdMatch?.[1] || sdMatch?.[1];

  if (!rawUrl) {
    throw new Error(
      'Could not find a downloadable video URL. The post may not contain a public video, or Facebook has changed their page structure.'
    );
  }

  const downloadUrl = rawUrl.replace(/\\u0025/g, '%').replace(/\\\//g, '/');

  const titleMatch = html.match(/<title>([^<]*)<\/title>/);

  return {
    platform: 'facebook',
    title: titleMatch?.[1] || '',
    quality: hdMatch ? 'hd' : 'sd',
    downloadUrl,
    requiredHeaders: {
      'User-Agent': MOBILE_UA,
      Referer: 'https://mbasic.facebook.com/',
    },
    note: 'Only public Facebook videos are supported. Private or restricted videos cannot be downloaded.',
  };
}

module.exports = { extractFacebook };
