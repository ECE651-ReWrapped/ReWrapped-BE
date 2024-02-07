const pool = require("../db");
const jwt = require("jsonwebtoken");
const bycrypt = require("bcryptjs");

const register = async (req, res, next) => {
  const { email, name, password, confirmPassword } = req.body;

  try {
    const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [
      email,
    ]);

    if (user.rows.length > 0) {
      return res.status(401).json("User already exists");
    }
  } catch (error) {}
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
  } catch (error) {}
};

exports.register = register;
exports.login = login;
