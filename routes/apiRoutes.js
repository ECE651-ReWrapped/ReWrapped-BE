// routes/authRoutes.js

const express = require('express');
const authController = require('../controllers/authController');
//const { getRecentlyPlayed, getRecommended } = require('../controllers/authController'); // Import the new API endpoint handlers

const router = express.Router();

// Authentication routes
router.get('/loginSpotify', authController.login);
router.get('/callback', authController.callback);

// API endpoints for recently played and recommended tracks
router.get('/api/recently-played/:userId', authController.getRecentlyPlayed);
router.get('/api/recommended/:userId', authController.getRecommended);

module.exports = router;
