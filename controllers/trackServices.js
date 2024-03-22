const { Pool } = require('pg');
const pool = require('../db'); // Reuse the existing pool

async function getRecentlyPlayedTracks(userId) {
  const query = `
    SELECT track_name, artists
    FROM recently_played_tracks
    WHERE user_name = $1
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
}

async function getRecommendedTracks(userId) {
  const query = `
    SELECT track_name, artists
    FROM recommended_tracks
    WHERE user_name = $1
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
}

module.exports = { getRecentlyPlayedTracks, getRecommendedTracks };