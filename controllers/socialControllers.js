const pool = require("../db");
const bycrypt = require("bcryptjs");
const jwtGenerator = require("../utils/jwtGenerator");
const jwt = require("jsonwebtoken");

// Define a pattern that matches the structure of JWT
const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;

const followUser = async (req, res) => {
    const { targetID } = req.body;
    let sourceID;

    try {
        sourceID = extract(req);
    } catch (error) {
        return res.status(401).json({ message: error.message });
    }

    // conditions met, proceed with db changes
    try {
        await pool.query("INSERT INTO followers (follower_id, following_id, since_date) VALUES ($1, $2, $3)",
            [sourceID, targetID, new Date()]);

        return res.status(200).json({ message: "Follow successful." });
    } catch (err) {
        if (err.code == '23505') {
            return res.status(409).json({ message: "User is already followed." });
        } else if (err.code == '23503') {
            return res.status(404).json({ message: "Source or target user does not exist." });
        }
        else if (err.code == 'P0001') { // following themselves
            return res.status(409).json({ message: err.message }); // msg handled by database trigger
        }

        // unexpected
        return res.status(500).json({ message: err.message });
    }
};

const unfollowUser = async (req, res) => {
    const { targetID } = req.body;
    let sourceID;

    try {
        sourceID = extract(req);
    } catch (error) {
        return res.status(401).json({ message: error.message });
    }

    // conditions met, proceed with db changes
    try {
        // try find the entry
        const followEntry = await pool.query("SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2", [
            sourceID, targetID
        ]);

        // exit early if trying to unfollow yourself
        if (targetID == sourceID) {
            return res.status(401).json({ message: "Cannot unfollow self." });
        }

        // if entry was found, unfollow
        if (followEntry.rows.length > 0) { // entry found
            await pool.query("DELETE FROM followers WHERE follower_id = $1 AND following_id = $2", [sourceID, targetID]);

            return res.status(200).json({ message: "User unfollowed successfully" });
        }

        // if user does not follow the target
        // note: no need to check the case where target does not exist because followers table will only contain users that exist
        return res.status(400).json({ message: "Unable to unfollow user." }); // not sure what error code to use here
    } catch (err) { // not sure what could trigger this
        console.log(err.code);

        return res.status(500).json({ message: err.message });
    }
};

const isFollowed = async (req, res) => {
    const { targetID } = req.query;
    let sourceID;

    try {
        sourceID = extract(req);
    } catch (error) {
        return res.status(401).json({ message: error.message });
    }

    try {
        const result = await pool.query(
            "SELECT 1 FROM followers WHERE follower_id = $1 AND following_id = $2",
            [sourceID, targetID]
        );

        if (result.rows.length > 0) {
            res.status(200).json({ isFollowed: true });
        } else {
            res.status(200).json({ isFollowed: false });
        }
    } catch (err) {
        res.status(500).json({ message: "Server error." });
    }
};

const extract = (req) => {
    const cookieHeader = req.headers.cookie;
    let jwtToken = null;
    let sourceID = null;

    if (cookieHeader) {
        const cookies = cookieHeader.split('; ');

        for (const cookie of cookies) {
            const parts = cookie.split('=');

            if (jwtPattern.test(parts[1])) {
                sourceID = parts[0];
                jwtToken = parts[1];
                break;
            }
        }
    } else {
        throw new Error("User is missing cookie!");
    }

    if (!jwtToken) {
        throw new Error("No Token Found");
    }

    try {
        jwt.verify(String(jwtToken), process.env.JWT_SECRET_KEY);
    } catch (err) {
        throw new Error(err.message);
    }

    return sourceID;
};

exports.followUser = followUser;
exports.unfollowUser = unfollowUser;
exports.isFollowed = isFollowed;
