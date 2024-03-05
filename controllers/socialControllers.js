const pool = require("../db");

const followUser = async (req, res) => {
    const { targetID } = req.body;

    // grab requesting user's ID from cookie
    const cookie = req.headers.cookie;
    const sourceID = cookie.split("=")[0];

    try {
        await pool.query("INSERT INTO followers (follower_id, following_id, since_date) VALUES ($1, $2, $3)",
            [sourceID, targetID, new Date()]);

        return res.status(200).json( { message: "Follow successful."});
    } catch (err) {
        console.log(err.message);

        if (err.code == '23505') {
            return res.status(401).json({ message: "User is already followed."});
        }

        return res.status(401).json({ message: "Something went wrong!"});
    }
};

exports.followUser = followUser;
