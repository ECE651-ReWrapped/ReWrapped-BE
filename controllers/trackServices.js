const { Pool } = require('pg');
const pool = require('../db'); // Reuse the existing pool
const moment = require('moment-timezone');

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

async function getListeningTrends(userId) {
  try {
    const results = await pool.query(
      `SELECT DATE_TRUNC('month', date) as month, SUM(track_count) as total_streams
       FROM listening_trends
       WHERE user_name = $1
       GROUP BY month
       ORDER BY month ASC;`,
      [userId]
    );

    console.log(results.rows);

    // Map through each row and transform the data
    const formattedResults = results.rows.map(row => {
      // Parse the date as UTC to ensure the correct date is maintained
      const monthName = moment.utc(row.month).format('MMM'); // Forces UTC

      return {
        month: monthName,
        streams: Number(row.total_streams)
      };
    });

    return formattedResults;

  } catch (error) {
    console.error('Error getting listening trends:', error);
    throw error;
  }
}

module.exports = { getRecentlyPlayedTracks, getRecommendedTracks, getTopGenres, getListeningTrends };
