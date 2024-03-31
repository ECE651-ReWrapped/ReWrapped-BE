const pool = require("../db");

const createNewSharedPlaylist = async (req, res) => {
    const { playlist_name, createdByEmail, sharedWithUsername } = req.body;

    // validate the input before using it
    if (!playlist_name || !createdByEmail || !sharedWithUsername) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        // get user's email from sharedWithUsername
        const user = await pool.query("SELECT user_email FROM users WHERE user_name = $1", [
            sharedWithUsername,
        ]);

        if (user.rows.length === 0) {
            return res.status(401).json({ message: "User Does not Exist" });
        }
        // found the shared with user's email from db
        const sharedWithUserEmail = user.rows[0].user_email;

        await pool.query("INSERT INTO shared_playlists (playlist_name, createdbyemail, sharedwithemail) VALUES ($1, $2, $3)", [
            playlist_name,
            createdByEmail,
            sharedWithUserEmail
        ]);

        return res.status(200).json({ message: "Successfully added playlist!" });

    } catch (err) {
        console.error(err);
        return res.status(500).send("Server Error");
    }
};

// fetches the number of shared playlists between two users from the database 
const getSharedPlaylists = async (req, res) => {
    const { createdByUserEmail, sharedWithUsername } = req.query;

    if (sharedWithUsername === undefined) {
        // send back only logged in user's playlists with all friends
        try {
            const result = await pool.query(
                "SELECT * FROM shared_playlists WHERE (createdbyemail = $1 OR sharedwithemail = $1)",
                [createdByUserEmail]
            );

            if (result.rows.length === 0) {
                // No shared playlists yet
                return res.status(404).send("No existing playlists for this user");
            } else {
                // Return the number of shared playlists
                return res.status(200).json({ count: result.rows.length, playlists: result.rows });
            }

        } catch (err) {
            console.error(err);
            return res.status(500).send("Server Error");
        }
    } else {
        // send back playlists for two given users 
        try {
            // get user's email from sharedWithUsername
            const user = await pool.query("SELECT user_email FROM users WHERE user_name = $1", [
                sharedWithUsername,
            ]);

            // found the shared with user's email from db
            const sharedWithUserEmail = user.rows[0].user_email;

            const playlistsResult = await pool.query(
                "SELECT * FROM shared_playlists WHERE (createdbyemail = $1 AND sharedwithemail = $2) OR (createdbyemail = $2 AND sharedwithemail = $1)",
                [createdByUserEmail, sharedWithUserEmail]
            );

            if (playlistsResult.rows.length === 0) {
                // No shared playlists yet
                return res.status(404).send("No existing playlists between these two users");
            } else {
                // Return the number of shared playlists
                return res.status(200).json({ count: playlistsResult.rows.length, playlists: playlistsResult.rows });
            }

        } catch (err) {
            console.error(err);
            return res.status(500).send("Server Error");
        }
    }
};

// add a track details to a given playlist_name
const addTrackToPlaylist = async (req, res) => {
    const { playlist_name, track_name, artist_name } = req.body;

    try {
        // check if playlist exists, if yes, get playlist_id
        const playlistResult = await pool.query("SELECT playlist_id FROM shared_playlists WHERE playlist_name = $1", [
            playlist_name
        ]);

        if (playlistResult.rows.length === 0) {
            // No such playlist exists
            return res.status(404).json({ message: "Playlist not found" });
        }

        // Get the playlist_id
        const playlist_id = playlistResult.rows[0].playlist_id;

        // Insert track into shared_playlist_tracks
        await pool.query("INSERT INTO shared_playlist_tracks (track_name, artist_name, playlist_id) VALUES ($1, $2, $3)", [
            track_name,
            artist_name,
            playlist_id
        ]);
        res.status(200).json({ message: "Track added to playlist successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// fetch all tracks given a playlist_name
const getAllTracksFromPlaylist = async (req, res) => {
    const { playlist_name } = req.query;

    try {
        // Get the playlist_id from the shared_playlists table
        const playlistResult = await pool.query("SELECT playlist_id FROM shared_playlists WHERE playlist_name = $1", [
            playlist_name
        ]);

        if (playlistResult.rows.length === 0) {
            return res.status(404).json({ message: "Playlist not found" });
        }

        const playlist_id = playlistResult.rows[0].playlist_id;

        // Fetch all tracks from the shared_playlist_tracks table using the playlist_id
        const tracksResult = await pool.query("SELECT * FROM shared_playlist_tracks WHERE playlist_id = $1", [
            playlist_id
        ]);

        // Send the tracks as a response
        res.status(200).json({ tracks: tracksResult.rows });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// ---------------------------------------------------------------------------------------------
// test endpoint, not used by frontend
/* istanbul ignore next */
const deleteSharedPlaylistsContent = async (req, res) => {
    try {
        await pool.query("DELETE FROM shared_playlists");
        res.status(200).json({ message: "All shared playlists have been deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// test endpoint only
/* istanbul ignore next */
const deleteAllTracks = async (req, res) => {
    try {
        await pool.query("DELETE FROM shared_playlist_tracks");
        res.status(200).json({ message: "All tracks have been deleted from all playlists." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};


exports.createNewSharedPlaylist = createNewSharedPlaylist;
exports.getSharedPlaylists = getSharedPlaylists;
exports.addTrackToPlaylist = addTrackToPlaylist;
exports.getAllTracksFromPlaylist = getAllTracksFromPlaylist;

// only test
/* istanbul ignore next */
exports.deleteSharedPlaylistsContent = deleteSharedPlaylistsContent;
// curl -X DELETE http://localhost:6001/deleteAllSharedPlaylists
/* istanbul ignore next */
exports.deleteAllTracks = deleteAllTracks;
// curl -X DELETE http://localhost:6001/deleteAllTracks