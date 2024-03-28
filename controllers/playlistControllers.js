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
};

// test endpoint, not used in by frontend
const deleteSharedPlaylistsContent = async (req, res) => {
    try {
        await pool.query("DELETE FROM shared_playlists");
        res.status(200).json({ message: "All shared playlists have been deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

exports.createNewSharedPlaylist = createNewSharedPlaylist;
exports.getSharedPlaylists = getSharedPlaylists;

// only test
exports.deleteSharedPlaylistsContent = deleteSharedPlaylistsContent; 
// curl -X DELETE http://localhost:6001/deleteAllSharedPlaylists