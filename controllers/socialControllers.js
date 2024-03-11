const pool = require("../db");

const followUser = async (req, res) => {
    const { targetID } = req.body;

    // grab requesting user's ID from cookie
    const cookie = req.headers.cookie;
    let sourceID = null;

    if (cookie) {
        sourceID = cookie.split("=")[0];
    }
    else {
        // user has no ID in cookie for some reason
        return res.status(401).json({ message: "Something went wrong!" });
    }

    try {
        await pool.query("INSERT INTO followers (follower_id, following_id, since_date) VALUES ($1, $2, $3)",
            [sourceID, targetID, new Date()]);

        return res.status(200).json({ message: "Follow successful." });
    } catch (err) {
        if (err.code == '23505') {
            return res.status(401).json({ message: "User is already followed." });
        } else if (err.code == '23503') {
            return res.status(401).json({ message: "User does not exist." });
        }
        else if (err.code == 'P0001') { // following themselves
            return res.status(401).json({ message: err.message }); // msg handled by trigger
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
        // user has no ID in cookie for some reason
        return res.status(401).json({ message: "Something went wrong!" });
    }

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
        // note: no need to check the case where target does not exist because followers will only contain users that exist
        return res.status(200).json({ message: "Unable to unfollow user." });
    } catch (err) { // not sure what could trigger this
        console.log(err.code);

        return res.status(401).json({ message: "Something went wrong!" });
    }
};

exports.followUser = followUser;
exports.unfollowUser = unfollowUser;