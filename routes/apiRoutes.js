// routes/authRoutes.js

const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Authentication routes
router.get('/loginSpotify', authController.login);
router.get('/callback', authController.callback);

// API endpoints for recently played and recommended tracks
router.get('/api/recently-played/:userId', authController.getRecentlyPlayed);
router.get('/api/recommended/:userId', authController.getRecommended);
router.get('/api/top-genres/:userId', authController.getTop);

module.exports = router;
