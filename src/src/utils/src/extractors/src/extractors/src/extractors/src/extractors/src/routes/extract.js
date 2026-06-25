const express = require('express');
const router = express.Router();

const { detectPlatform } = require('../utils/detectPlatform');
const { extractTikTok } = require('../extractors/tiktok');
const { extractFacebook } = require('../extractors/facebook');
const { extractInstagram } = require('../extractors/instagram');
const { extractPinterest } = require('../extractors/pinterest');

const extractors = {
  tiktok: extractTikTok,
  facebook: extractFacebook,
  instagram: extractInstagram,
  pinterest: extractPinterest,
};

/**
 * POST /api/extract
 * Body: { url: string }
 */
router.post('/extract', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid "url" field in request body.',
    });
  }

  const platform = detectPlatform(url);

  if (!platform) {
    return res.status(400).json({
      success: false,
      error:
        'Unsupported link. Please paste a valid TikTok, Facebook, Instagram, or Pinterest link.',
    });
  }

  const extractor = extractors[platform];

  try {
    const result = await extractor(url);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error(`[extract:${platform}] ${err.message}`);
    return res.status(422).json({
      success: false,
      platform,
      error: err.message || 'Failed to extract media from the provided URL.',
    });
  }
});

module.exports = router;
