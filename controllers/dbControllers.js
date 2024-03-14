const pool = require("../db");
const bycrypt = require("bcryptjs");
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_ID,  
        pass: process.env.EMAIL_PASSWORD
    }
});

const checkUserEmail = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [email]);

        if (user.rows.length === 0) {
            return res.status(401).json({message: "User Does not Exist"});
        }
        
        // user found, generate token and send an email
        crypto.randomBytes(32, (err, buff) => {
            if (err) {
                console.log(err);
                return res.redirect('/reset-password');
            } 
            const token = buff.toString('hex');
            // store token in database (resetToken: String)
            pool.query("UPDATE users SET user_reset_token = $1 WHERE user_email = $2", [
                token,
                email
            ]);
            // send link in an email to the user with token
            const mailOptions = {
                from: process.env.EMAIL_ID,
                to: email,
                subject: 'Reset Password',
                html: `<p>You requested a password reset!</p>
                    <p>Click this <a href="${process.env.CLIENT_LOCAL_URL}/reset-password/${token}">link</a> to set a new password.</p>`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ message: 'Error sending email' });
                }
                return res.status(200).json({ message: 'User has an account and email sent' });
            });
        });  
    } catch (err) {
        return res.status(500).send("Server Error");
    }
};

const validateToken = async (req, res) => {
    const token = req.params.token;
    
    // find token in db
    try {
        const user = await pool.query("SELECT * FROM users WHERE user_reset_token = $1", [ token ]);
        if (user.rows.length === 0) {
            return res.status(405).json({message: "Invalid token!"}); 
        }
        // token validated
        return res.status(200).json({ message: "Token is valid" });
    } catch (err) {
        return res.status(500).send("Server Error");
    }
};

const setNewPassword = async (req, res) => {
    const { urlToken, password, confirmPassword } = req.body;

    try {
        const user = await pool.query("SELECT * FROM users WHERE user_reset_token = $1", [urlToken]);

        if (user.rows.length === 0) {
            return res.status(405).json({message: "User Does not Exist"}); 
        }
        // user found, check if passwords match
        if (password !== confirmPassword) {
            return res.status(401).json({message: "Passwords do not match"});
        }
        
        // passwords match
        const salt = await bycrypt.genSalt(10);
        const bcryptPassword = await bycrypt.hash(password, salt);

        // Update the user's password in the database
        try {
            await pool.query("UPDATE users SET user_password = $1 WHERE user_reset_token = $2", [
                bcryptPassword,
                urlToken,
            ]);
            // remove token from database upon successful update
            await pool.query("UPDATE users SET user_password = $1, user_reset_token = NULL WHERE user_reset_token = $2", [
                bcryptPassword,
                urlToken,
            ]);
        } catch (err) {
            return res.status(500).send("Server Error");
        }
        
        return res.status(200).json({ message: "Password updated successfully" });
    } catch (err) {
        return res.status(500).send("Server Error");
    }
};

exports.checkUserEmail = checkUserEmail;
exports.setNewPassword = setNewPassword;
exports.validateToken = validateToken;