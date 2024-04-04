// Import required modules
const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
const SpotifyWebApi = require('spotify-web-api-node');
const querystring = require('querystring');
const request = require('request');
const { Pool } = require('pg');
const pool = require('../db'); // Reuse the existing pool
const moment = require('moment-timezone');
const { generateRandomString, shuffleArray } = require('../utils/spotifyUtils');
const { getRecommendedTracks, getRecentlyPlayedTracks, getTopGenres, getListeningTrends } = require('./trackServices');

// Other imports (like getUserById) should be added based on your application structure

// Authentication route handlers
const authController = {
  login: (req, res) => {
    const scope = "user-read-private user-read-email user-read-recently-played user-top-read";
    const expectedState = generateRandomString(16);
    req.session.spotifyState = expectedState;

    return res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: '6a9f417f4971486997e26fdcf43d3502',
        scope: scope,
        redirect_uri: 'http://localhost:6001/callback',
        state: expectedState
      }));

    //res.redirect(redirectUrl);
  },

  callback: async (req, res) => {
    const { code, state } = req.query;
    const expectedState = req.session.spotifyState;

    if (state === null || state !== expectedState) {
      return res.redirect('/loginSpotify?' +
        querystring.stringify({
          error: 'state_mismatch'
        }));
    }

    try {
      const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
          code: code,
          redirect_uri: 'http://localhost:6001/callback',
          grant_type: 'authorization_code'
        },
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + (new Buffer.from('6a9f417f4971486997e26fdcf43d3502' + ':' + '2b7d1892b983458cb441ff4ba371dd7b').toString('base64'))
        },
        json: true
      };

      //const { body } = await request.post(authOptions);
      request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {

          var access_token = body.access_token,
            refresh_token = body.refresh_token;

          // Fetch user's profile information
          const profileOptions = {
            url: 'https://api.spotify.com/v1/me',
            headers: { Authorization: 'Bearer ' + access_token },
            json: true,
          };

          //const { body: profileBody } = await request.get(profileOptions);
          request.get(profileOptions, function (error, profileResponse, profileBody) {
            if (!error && profileResponse.statusCode === 200) {

              // Store user ID in your database
              const userId = profileBody.display_name;
              req.session.userId = userId;

              // Fetch recently played tracks
              const recentlyPlayedOptions = {
                url: 'https://api.spotify.com/v1/me/player/recently-played',
                headers: { Authorization: 'Bearer ' + access_token },
                json: true,
              };

              request.get(recentlyPlayedOptions, async function (error, recentlyPlayedResponse, recentlyPlayedBody) {
                if (!error && recentlyPlayedResponse.statusCode === 200) {

                  // Extract relevant information from recently played tracks
                  const items = recentlyPlayedBody.items || [];
                  const recentlyPlayedTracks = [];
                  const truncateRecentlyPlayedQuery = `TRUNCATE TABLE recently_played_tracks;`; // deletes the data in table, but not the table itself

                  // Execute the truncate query
                  pool.query(truncateRecentlyPlayedQuery, (err) => {
                    if (err) {
                      console.error('Error truncating recently_played_tracks table:', err);
                    } else {
                      console.log('recently_played_tracks table truncated successfully.');
                    }
                  });

                  // Track Names and Artist Names
                  items.forEach((item, index) => {
                    let track = item.track;
                    let trackName = track.name;
                    let trackID = track.id;
                    let artists = track.artists.map(artist => artist.name).join(', ');
                    let artistID = track.artists[0].id; // first artist for simplicity

                    console.log("Track Name:", trackName);
                    console.log(item.played_at);
                    // console.log("Artists:", artists);

                    // Fetch artist information to get genres
                    const artistOptions = {
                      url: `https://api.spotify.com/v1/artists/${artistID}`,
                      headers: { Authorization: 'Bearer ' + access_token },
                      json: true,
                    };

                    request.get(artistOptions, function (error, artistResponse, artistBody) {
                      if (!error && artistResponse.statusCode === 200) {
                        const genres = artistBody.genres;

                        // Insert track information into the database
                        const insertQuery = `
                          INSERT INTO recently_played_tracks (user_name, track_name, artists, genres)
                          VALUES ($1, $2, $3, $4)`;

                        const values = [userId, trackName, artists, genres.join(', ')];

                        pool.query(insertQuery, values, (err) => {
                          if (err) {
                            console.error('Error inserting into database:', err);
                          }
                        });
                      }
                    });

                    // Update listening trends
                    const trackDate = moment.utc(item.played_at).format('YYYY-MM-DD'); // Ensures the date is interpreted in UTC

                    const checkQuery = `
        SELECT 1
        FROM recently_played_tracks
        WHERE user_name = $1 AND track_name = $2`;
                    const checkValues = [userId, item.track.name];

                    const { rows } = pool.query(checkQuery, checkValues);

                    console.log(rows);

                    if (!rows) {
                      // Track has not been counted yet, update listening trends
                      const updateListeningTrendsQuery = `
          INSERT INTO listening_trends (user_name, date, track_count)
          VALUES ($1, $2, 1)
          ON CONFLICT (user_name, date)
          DO UPDATE SET track_count = listening_trends.track_count + 1;`;
                      const trendValues = [userId, trackDate];

                      pool.query(updateListeningTrendsQuery, trendValues, (err) => {
                        if (err) {
                          console.error('Error updating listening trends:', err);
                        }
                      });
                    }

                    // Store the track information along with genres
                    recentlyPlayedTracks.push({
                      trackID: trackID,
                      //trackName: trackName,
                      artists: artists,
                      //genres: genres
                    });
                  });

                  // -------------------------------------------------------------------
                  // Log the recently played tracks
                  // console.log('Recently Played Tracks:', recentlyPlayedTracks);
                  shuffleArray(recentlyPlayedTracks);

                  // Use the recentlyPlayedTracks to get recommended songs
                  // Take the first 5 tracks as seed tracks
                  const seedTracks = recentlyPlayedTracks.slice(0, 5).map(track => track.trackID);

                  const recommendedOptions = {
                    url: "https://api.spotify.com/v1/recommendations",
                    headers: { Authorization: "Bearer " + access_token },
                    qs: {
                      seed_tracks: seedTracks.join(','),
                      limit: 10 // Adjust the limit as needed
                    },
                    json: true,
                  };

                  request.get(recommendedOptions, function (error, recommendedResponse, recommendedBody) {
                    if (!error && recommendedResponse.statusCode === 200) {
                      const recommendedTracks = recommendedBody.tracks || [];

                      // Log the recommended tracks
                      // console.log('Recommended Tracks:', recommendedTracks);
                      const truncateRecommendedQuery = `TRUNCATE TABLE recommended_tracks;`;

                      // Execute the truncate query
                      pool.query(truncateRecommendedQuery, (err) => {
                        if (err) {
                          console.error('Error truncating recommended_tracks table:', err);
                        } else {
                          console.log('recommended_tracks table truncated successfully.');
                        }
                      });

                      // Store recommended tracks in PostgreSQL database
                      recommendedTracks.forEach((track, index) => {
                        const insertRecommendedQuery = `
                          INSERT INTO recommended_tracks (user_name, track_name, artists) VALUES ($1, $2, $3)`;

                        const recommendedValues = [userId, track.name, track.artists.map(artist => artist.name).join(', ')];

                        // Execute the insert query for recommended tracks
                        pool.query(insertRecommendedQuery, recommendedValues, (err) => {
                          if (err) {
                            console.error('Error inserting recommended track into database:', err);
                          }
                        });
                      });
                      // Successful authentication, redirect to the home page or perform additional actions
                      // Send a JSON response with the display name
                      //const displayName = req.session.userId;

                      res.redirect('http://localhost:3000/dashboard/?displayName=' + encodeURIComponent(userId));
                    } else {
                      // Handle the case where access_token is not present in the response
                      res.redirect('/error?' +
                        querystring.stringify({
                          error: 'invalid_token'
                        }));
                    }
                  });
                } else {
                  console.error('Error in the OAuth callback1:', error.message);
                  // Handle the error or redirect to an error page
                  res.redirect('/error?' +
                    querystring.stringify({
                      error: 'internal_error'
                    }));
                }
              });

            }
          });

        }
      });
    }
    catch (error) {
      console.error('Error in the OAuth callback2:', error.message);
      // Handle the error or redirect to an error page
      res.redirect('/error?' +
        querystring.stringify({
          error: 'internal_error'
        }));
    }
  },

  // API endpoint to get recently played tracks
  getRecentlyPlayed: async (req, res) => {
    try {
      const userId = req.params.userId; // User ID parameter from the request

      // Fetch recently played tracks from the database
      const recentlyPlayedTracks = await getRecentlyPlayedTracks(userId);

      res.json(recentlyPlayedTracks);
    } catch (error) {
      console.error('Error fetching recently played tracks:', error.message);
      res.status(500).json({ error: 'internal_server_error' });
    }
  },

  // API endpoint to get recommended tracks
  getRecommended: async (req, res) => {
    try {
      const userId = req.params.userId; // User ID parameter from the request

      // Fetch recommended tracks from the database
      const recommendedTracks = await getRecommendedTracks(userId);

      res.json(recommendedTracks);
    } catch (error) {
      console.error('Error fetching recommended tracks:', error.message);
      res.status(500).json({ error: 'internal_server_error' });
    }
  },

  // API endpoint to get top genres
  getTop: async (req, res) => {
    try {
      const userId = req.params.userId; // User ID parameter from the request

      // Fetch genres from the database
      const topGenres = await getTopGenres(userId);

      res.json(topGenres);
    } catch (error) {
      console.error('Error fetching top genres:', error.message);
      res.status(500).json({ error: 'internal_server_error' });
    }
  },

  // API endpoint to get listening trends
  getListeningTrend: async (req, res) => {
    try {
      const userId = req.params.userId; // User ID parameter from the request

      // Fetch trends from the database
      const listeningTrends = await getListeningTrends(userId);

      res.json(listeningTrends);
    } catch (error) {
      console.error('Error fetching listening trends:', error.message);
      res.status(500).json({ error: 'internal_server_error' });
    }
  },

  //logout: (req, res) => {
  //req.logout();
  //res.redirect('/');
  //},

  //isAuthenticated: (req, res, next) => {
  //if (req.isAuthenticated()) {
  //return next();
  //} else {
  //res.redirect('/login');
  //}
  //}
};

// Passport configuration
passport.serializeUser((user, done) => {
  done(null, user.spotifyId);
});

passport.deserializeUser(async (id, done) => {
  try {
    // You should have a function like getUserById to fetch user from the database
    // const user = await getUserById(id);
    // done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Create a SpotifyWebApi instance
const spotifyApi = new SpotifyWebApi({
  clientId: "6a9f417f4971486997e26fdcf43d3502",
  clientSecret: "2b7d1892b983458cb441ff4ba371dd7b",
  redirectUri: 'http://localhost:6001/callback'
});

// Passport SpotifyStrategy configuration
passport.use(new SpotifyStrategy({
  clientID: '6a9f417f4971486997e26fdcf43d3502',
  clientSecret: '2b7d1892b983458cb441ff4ba371dd7b',
  callbackURL: 'http://localhost:6001/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    spotifyApi.setAccessToken(accessToken);
    // Return the user object to Passport
    const user = {
      spotifyId: 'abcd', // profile.id,
      displayName: '1234', // profile.displayName,
    };
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

module.exports = authController;
