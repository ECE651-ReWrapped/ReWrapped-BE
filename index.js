// Import required modules
const express = require('express');
const { Client } = require('pg');
const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
const SpotifyWebApi = require('spotify-web-api-node');
const querystring = require('querystring');
const session = require('express-session');
const crypto = require('crypto');
const request = require('request');
const fs = require('fs');
const path = require('path');
//const fetch = require('node-fetch').default;

require('dotenv').config();
// Specify the file path in your project directory
const logFilePath = path.join(__dirname, 'log.txt');
const errorLogFilePath = path.join(__dirname, 'errorLog.txt');

// Create a writable stream to the log file
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
const errorLogStream = fs.createWriteStream(errorLogFilePath, { flags: 'a' });

// Override console.log to write to both console and file
const originalConsoleLog = console.log;
console.log = function (message) {
    originalConsoleLog.apply(console, arguments);
    logStream.write(`${new Date().toISOString()} - ${message}\n`);
};
// Override console.error to write to both console and error log file
const originalConsoleError = console.error;
console.error = function (...args) {
    originalConsoleError.apply(console, args);
    const formattedError = `${new Date().toISOString()} - ERROR: ${args.join(' ')}\n`;
    errorLogStream.write(formattedError);
};

const clientId = "6a9f417f4971486997e26fdcf43d3502";
const clientSecret = "2b7d1892b983458cb441ff4ba371dd7b";

// Create an Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure PostgreSQL client
const client = new Client({
    user: 'spotify_suser',
    host: 'localhost',
    database: 'db_spotify',
    password: 'securepassword123',
    port: 5432,
});

// Connect to PostgreSQL
client.connect()
    .then(() => console.log('Connected to PostgreSQL'))
    .catch(err => console.error(`PostgreSQL connection error: ${err}`));

// Configure Spotify API
const spotifyApi = new SpotifyWebApi({
    clientId: "6a9f417f4971486997e26fdcf43d3502",
    clientSecret: "2b7d1892b983458cb441ff4ba371dd7b",
    redirectUri: 'http://localhost:3000/callback' // Update with your redirect URI
});

const generateRandomStringcrypto = () => {
    return crypto.randomBytes(16).toString('hex');
};

const sessionSecret = generateRandomStringcrypto();
// Function to generate a random string for state
function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters.charAt(randomIndex);
    }

    return randomString;
}
passport.serializeUser(function (user, done) {
    done(null, user.spotifyId);
    // if you use Model.id as your idAttribute maybe you'd want
    // done(null, user.id);
});


// Passport configuration
//passport.serializeUser((user, done) => {
//    done(null, user);
//});

passport.deserializeUser(async function (id, done) {
    try {
        // Fetch user from the database based on the id
        const user = await getUserById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});
//Passport configuration
passport.use(new SpotifyStrategy({
    clientID: '6a9f417f4971486997e26fdcf43d3502',//process.env.SPOTIFY_CLIENT_ID,
    clientSecret: '2b7d1892b983458cb441ff4ba371dd7b',//process.env.SPOTIFY_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/callback' // Update with your redirect URI
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            spotifyApi.setAccessToken(accessToken);
            //      Return the user object to Passport
            const user = {
                spotifyId: 'abcd',//profile.id,
                displayName: '1234',//profile.displayName,
            };
            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }));

// Initialize Passport
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: sessionSecret, resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
// Global variable to store the generated state
//let expectedState;
const expectedState = generateRandomString(16);
// Login route with state generation
app.get('/login', function (req, res) {

    const scope = "user-read-private user-read-email user-read-recently-played user-top-read";
    //req.session.spotifyState = expectedState;
    return res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: '6a9f417f4971486997e26fdcf43d3502',
            scope: scope,
            redirect_uri: 'http://localhost:3000/callback',
            state: expectedState
        }));
        // Retrieve display name from the session
    

   
});

async function getProfile(accessToken) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: {
                Authorization: 'Bearer ' + accessToken
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('User Profile:', data);
            // You can further process the user profile data here
        } else {
            console.error('Error fetching user profile:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching user profile:', error.message);
    }
}
const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

// Callback route with state validation
app.get('/callback', function (req, res) {
    const code1 = req.query.code || null;
    const state = req.query.state || null;
    //const expectedState1 = req.session.spotifyState;

    if (state === null) {
        return res.redirect('/#' +
            querystring.stringify({
                error: 'state_null'
            }));
    } else if (state !== expectedState) {
        return res.redirect('/#' +
            querystring.stringify({
                error: state, expectedState
            }));
    }

    else {
        try {
            // Exchange the authorization code for an access token
            authOptions = {
                url: "https://accounts.spotify.com/api/token",
                form: {
                    code: code1,
                    redirect_uri: "http://localhost:3000/callback",
                    grant_type: "authorization_code"
                },
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + (new Buffer.from('6a9f417f4971486997e26fdcf43d3502' + ':' + '2b7d1892b983458cb441ff4ba371dd7b').toString('base64'))
                },
                json: true
            };

            request.post(authOptions, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    // got a token
                    var access_token = body.access_token,
                        refresh_token = body.refresh_token;

                    // Fetch user's profile information
                    const profileOptions = {
                        url: "https://api.spotify.com/v1/me",
                        headers: { Authorization: "Bearer " + access_token },
                        json: true,
                    };
                    try {
                        request.get(profileOptions, function (error, profileResponse, Profilebody) {
                            if (!error && profileResponse.statusCode === 200) {
                                //const profile = JSON.parse(body);

                                // Store user ID in your database
                                const userId = Profilebody.display_name;
                                // Store userId in your database or perform other actions
                                req.session.userId = userId;
                                console.log('User ID:', userId);

                                // Fetch recently played tracks
                                const recentlyPlayedOptions = {
                                    url: "https://api.spotify.com/v1/me/player/recently-played",
                                    headers: { Authorization: "Bearer " + access_token },
                                    json: true,
                                };

                                request.get(recentlyPlayedOptions, function (error, recentlyPlayedResponse, recentlyPlayedBody) {
                                    // use the access token to access the Spotify Web API
                                    if (!error && recentlyPlayedResponse.statusCode === 200) {

                                        // Extract relevant information from recently played tracks
                                        const items = recentlyPlayedBody.items || [];
                                        const recentlyPlayedTracks = [];
                                        const truncateRecentlyPlayedQuery = `
                                        TRUNCATE TABLE recently_played_tracks;
                                        `;

                                        // Execute the truncate query
                                        client.query(truncateRecentlyPlayedQuery, (err) => {
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
                                            console.log("Track Name:", trackName);
                                            console.log("Artists:", artists);


                                            const insertQuery = `
                                        INSERT INTO recently_played_tracks (user_id, track_name, artists)
                                        VALUES ($1, $2, $3)
                                    `;

                                            const values = [userId, trackName, artists];

                                            // Execute the insert query
                                            client.query(insertQuery, values, (err) => {
                                                if (err) {
                                                    console.error('Error inserting into database:', err);
                                                }
                                            });

                                            // Store the track information in the recentlyPlayedTracks array
                                            recentlyPlayedTracks.push({
                                                trackID: trackID,
                                                artists: artists
                                            });
                                        });



                                        // Log the recently played tracks
                                        console.log('Recently Played Tracks:', recentlyPlayedTracks);
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
                                                console.log('Recommended Tracks:', recommendedTracks);
                                                const truncateRecommendedQuery = `
                                                TRUNCATE TABLE recommended_tracks;
                                                `;

                                                // Execute the truncate query
                                                client.query(truncateRecommendedQuery, (err) => {
                                                    if (err) {
                                                        console.error('Error truncating recommended_tracks table:', err);
                                                    } else {
                                                        console.log('recommended_tracks table truncated successfully.');
                                                    }
                                                });

                                                // Store recommended tracks in PostgreSQL database
                                                recommendedTracks.forEach((track, index) => {
                                                    const insertRecommendedQuery = `
                                                    INSERT INTO recommended_tracks (user_id, track_name, artists)
                                                    VALUES ($1, $2, $3)
                                                `;

                                                    const recommendedValues = [userId, track.name, track.artists.map(artist => artist.name).join(', ')];

                                                    // Execute the insert query for recommended tracks
                                                    client.query(insertRecommendedQuery, recommendedValues, (err) => {
                                                        if (err) {
                                                            console.error('Error inserting recommended track into database:', err);
                                                        }
                                                    });
                                                });
                                                const displayName = req.session.userId;

                                                // Send a JSON response with the display name
                                                res.json({ displayName: displayName });


                                            }
                                        });

                                    }

                                    else {
                                        // Handle the error or redirect to an error page
                                        res.redirect('/error?' +
                                            querystring.stringify({
                                                error: 'invalid_token'
                                            }));
                                    }
                                });

                            }
                        })
                    }
                    catch (error) {
                        console.error('Error exchanging code for access token:', error.message);
                        // Handle the error or redirect to an error page
                        res.redirect('/error?' +
                            querystring.stringify({
                                error: 'internal_error'
                            }));
                    }

                }


                // Successful authentication, redirect to the home page or perform additional actions
                res.redirect('/');
            });

        } catch (error) {
            console.error('Error exchanging code for access token:', error.message);
            // Handle the error or redirect to an error page
            res.redirect('/error?' +
                querystring.stringify({
                    error: 'internal_error'
                }));
        }
    }

});
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
// Define the authenticate middleware
const authenticate = (req, res, next) => {
    // Passport adds the `isAuthenticated` method to the request object
    // You can use it to check if the user is authenticated
    if (req.isAuthenticated()) {
        return next();
    } else {
        // If not authenticated, redirect to login or send an unauthorized response
        res.status(401).json({ error: 'unauthorized' });
    }
};

// API endpoint to get recently played tracks
app.get('/api/recently-played/:userId', async (req, res) => {
    try {
        const userId = req.params.userId; // User ID parameter from the request

        // Fetch recently played tracks from the database
        const recentlyPlayedTracks = await getRecentlyPlayedTracks(userId);

        res.json(recentlyPlayedTracks);
    } catch (error) {
        console.error('Error fetching recently played tracks:', error.message);
        res.status(500).json({ error: 'internal_server_error' });
    }
});

// API endpoint to get recommended tracks
app.get('/api/recommended/:userId', async (req, res) => {
    try {
        const userId = req.params.userId; // User ID parameter from the request

        // Fetch recommended tracks from the database
        const recommendedTracks = await getRecommendedTracks(userId);

        res.json(recommendedTracks);
    } catch (error) {
        console.error('Error fetching recommended tracks:', error.message);
        res.status(500).json({ error: 'internal_server_error' });
    }
});

// Helper function to fetch recently played tracks from the database
async function getRecentlyPlayedTracks(userId) {
    const query = `
        SELECT track_name, artists
        FROM recently_played_tracks
        WHERE user_id = $1
    `;

    const result = await client.query(query, [userId]);
    return result.rows;
}

// Helper function to fetch recommended tracks from the database
async function getRecommendedTracks(userId) {
    const query = `
        SELECT track_name, artists
        FROM recommended_tracks
        WHERE user_id = $1
    `;

    const result = await client.query(query, [userId]);
    return result.rows;
}
process.on('exit', () => {
    logStream.end();
    errorLogStream.end();
});
// Close the log stream when your program exits
// Function to set up the database (create user, database, etc.)
async function setupDatabase() {
    try {
        // Check if the user exists, create if not
        const checkUserQuery = "SELECT 1 FROM pg_user WHERE usename = 'spotify_suser';";
        const userExists = (await client.query(checkUserQuery)).rows.length > 0;

        if (!userExists) {
            // Create the superuser with the desired password
            await client.query("CREATE USER spotify_suser WITH PASSWORD 'securepassword123' SUPERUSER;");
        }

        // Check if the database exists, create if not
        const checkDbQuery = "SELECT 1 FROM pg_database WHERE datname = 'db_spotify';";
        const dbExists = (await client.query(checkDbQuery)).rows.length > 0;

        if (!dbExists) {
            // Create the database and set spotify_suser as the owner
            await client.query("CREATE DATABASE db_spotify WITH OWNER = spotify_suser;");
        }

        console.log('Database setup completed successfully.');
    } catch (error) {
        throw new Error(`Error setting up the database: ${error.message}`);
    }
}

// Function to create tables in the specified database
async function createTables() {
    // Create recently_played_tracks table
    await client.query(`
        CREATE TABLE IF NOT EXISTS recently_played_tracks (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            track_name VARCHAR(255) NOT NULL,
            artists VARCHAR(255) NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create recommended_tracks table
    await client.query(`
        CREATE TABLE IF NOT EXISTS recommended_tracks (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            track_name VARCHAR(255) NOT NULL,
            artists VARCHAR(255) NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// Function to setup database, create tables, and start the application
async function startApp() {
    try {
        // Setup the database (create user, database, etc.)
        await setupDatabase();

        // Create tables in the database
        await createTables();

        // Start the application
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Error starting the application:', error.message);
    }
}
// Start the server
// Run the application
startApp();