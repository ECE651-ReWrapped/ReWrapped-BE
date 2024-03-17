const pool = require("../db");
const bycrypt = require("bcryptjs");
const jwtGenerator = require("../utils/jwtGenerator");
const jwt = require("jsonwebtoken");

const followUser = async (req, res) => {
    const { targetID } = req.body;

    // grab requesting user's ID from cookie
    const cookie = req.headers.cookie;
    let sourceID = null;

    if (cookie) {
        sourceID = cookie.split("=")[0];
    }
    else {
        // user has no ID in cookie for some reason; handle accordingly
        return res.status(401).json({ message: "User is missing cookie!" });
    }

    // verify token
    const token = cookie ? cookie.split("=")[1] : null;

    if (!token) {
        // handle this scenario accordingly
        return res.status(404).json({ message: "No Token Found" });
    }

    try {
        jwt.verify(String(token), process.env.JWT_SECRET_KEY);
    } catch(err) {
        // handle scenarios accordingly
        return res.status(404).json({ message: err.message });
    }

    // conditions met, proceed with db changes
    try {
        await pool.query("INSERT INTO followers (follower_id, following_id, since_date) VALUES ($1, $2, $3)",
            [sourceID, targetID, new Date()]);

        return res.status(200).json({ message: "Follow successful." });
    } catch (err) {
        if (err.code == '23505') {
            return res.status(401).json({ message: "User is already followed." });
        } else if (err.code == '23503') {
            return res.status(401).json({ message: "Source or target user does not exist." });
        }
        else if (err.code == 'P0001') { // following themselves
            return res.status(401).json({ message: err.message }); // msg handled by database trigger
        }

        return res.status(401).json({ message: "Something went wrong!" });
    }
};

const unfollowUser = async (req, res) => {
    const { targetID } = req.body;

    // grab requesting user's ID from cookie
    const cookie = req.headers.cookie;
    let sourceID = null;

    if (cookie) {
        sourceID = cookie.split("=")[0];
    }
    else {
        // user has no ID in cookie for some reason; handle accordingly
        return res.status(401).json({ message: "Something went wrong!" });
    }

    // verify token
    const token = cookie ? cookie.split("=")[1] : null;

    if (!token) {
        // handle this scenario accordingly
        return res.status(404).json({ message: "No Token Found" });
    }

    try {
        jwt.verify(String(token), process.env.JWT_SECRET_KEY);
    } catch(err) {
        // handle scenarios accordingly
        return res.status(404).json({ message: err.message });
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
        return res.status(200).json({ message: "Unable to unfollow user." });
    } catch (err) { // not sure what could trigger this
        console.log(err.code);

        return res.status(401).json({ message: "Something went wrong!" });
    }
};

exports.followUser = followUser;
exports.unfollowUser = unfollowUser;
