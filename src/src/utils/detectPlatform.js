/**
 * Detects which platform a given URL belongs to.
 * Returns one of: 'tiktok' | 'facebook' | 'instagram' | 'pinterest' | null
 */
function detectPlatform(url) {
  if (!url || typeof url !== 'string') return null;

  const lower = url.toLowerCase();

  if (/tiktok\.com/.test(lower)) return 'tiktok';
  if (/facebook\.com|fb\.watch/.test(lower)) return 'facebook';
  if (/instagram\.com/.test(lower)) return 'instagram';
  if (/pinterest\.com|pin\.it/.test(lower)) return 'pinterest';

  return null;
}

module.exports = { detectPlatform };
