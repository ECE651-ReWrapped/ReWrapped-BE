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

async function getTopGenres(userId) {
  const query = `
    SELECT genres
    FROM recently_played_tracks
    WHERE user_name = $1
  `;

  const result = await pool.query(query, [userId]);

  // Create a map to count the occurrences of each genre.
  const genreCounts = new Map();

  // Loop through each row, split the genres string, and count each genre.
  result.rows.forEach(row => {
    row.genres.split(', ').forEach(genre => {
      if (genre) { // Check if the genre is not an empty string.
        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
      }
    });
  });

  // Convert the map to an array, sort by count, and then limit to top 5.
  const sortedGenres = Array.from(genreCounts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Take the top 5 genres.

  return sortedGenres;
}

module.exports = { getRecentlyPlayedTracks, getRecommendedTracks, getTopGenres };