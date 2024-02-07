const pool = require("../db");
const bycrypt = require("bcryptjs");
const jwtGenerator = require("../utils/jwtGenerator");

const register = async (req, res) => {
  const { email, name, password, confirmPassword } = req.body;

  try {
    const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [
      email,
    ]);

    if (user.rows.length > 0) {
      return res.status(401).json("User already exists");
    }

    if (password !== confirmPassword) {
      return res.status(401).json("Passwords do not match");
    }

    const salt = await bycrypt.genSalt(10);
    const bcryptPassword = await bycrypt.hash(password, salt);

    let newUser = await pool.query(
      "INSERT INTO users (user_name, user_email, user_password) VALUES ($1, $2, $3) RETURNING *",
      [name, email, bcryptPassword]
    );

    const jwtToken = jwtGenerator(newUser.rows[0].user_id);

    return res.json({ jwtToken });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

const login = async (req, res) => {
  console.log("here");
  const { email, password } = req.body;

  try {
    const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [
      email,
    ]);

    if (user.rows.length === 0) {
      return res.status(401).json("Invalid Credentials");
    }

    const validPassword = await bycrypt.compare(
      password,
      user.rows[0].user_password
    );

    if (!validPassword) {
      return res.status(401).json("Invalid Credentials");
    }

    const jwtToken = jwtGenerator(user.rows[0].user_id);
    return res.json({ jwtToken });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

exports.register = register;
exports.login = login;