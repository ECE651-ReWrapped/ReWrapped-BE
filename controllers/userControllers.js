const pool = require("../db");
const bycrypt = require("bcryptjs");
const jwtGenerator = require("../utils/jwtGenerator");
const jwt = require("jsonwebtoken");

const queryEmailAndName = async (email, name) => {
  const user = await pool.query(
    "SELECT * FROM users WHERE user_email = $1 OR user_name = $2",
    [email, name]
  );
  return user;
};

const singleQueryEmail = async (email) => {
  const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [
    email,
  ]);
  return user;
};

const register = async (req, res) => {
  const { email, name, password, confirmPassword } = req.body;

  try {
    const user = await queryEmailAndName(email, name);

    if (user.rows.length > 0) {
      return res.status(401).json({ message: "User already exists" });
    }

    if (password !== confirmPassword) {
      return res.status(401).json({ message: "Passwords do not match" });
    }

    const salt = await bycrypt.genSalt(10);
    const bcryptPassword = await bycrypt.hash(password, salt);

    await pool.query(
      "INSERT INTO users (user_name, user_email, user_password) VALUES ($1, $2, $3) RETURNING *",
      [name, email, bcryptPassword]
    );

    const newUser = await queryEmailAndName(email, name);

    const jwtToken = jwtGenerator(newUser.rows[0].user_id);

    res.cookie(String(newUser.rows[0].user_id), jwtToken, {
      domain: "localhost",
      path: "/",
      expires: new Date(Date.now() + 1000 * 60 * 60), // Set expiration to 1 hour
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });

    return res
      .status(200)
      .json({ message: "Successfully Created Account", token: jwtToken, user });
  } catch (err) {
    return res.status(500).send("Server Error");
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await singleQueryEmail(email);

    if (user.rows.length === 0) {
      return res.status(401).json({ message: "User Does not Exist" });
    }

    const validPassword = await bycrypt.compare(
      password,
      user.rows[0].user_password
    );

    if (!validPassword) {
      return res.status(401).json({ message: "Incorrect Password" }); // We should probably not say the password is wrong specifically
    }

    const jwtToken = jwtGenerator(user.rows[0].user_id);
    
    res.cookie(String(user.rows[0].user_id), jwtToken, {
      domain: "localhost",
      path: "/",
      expires: new Date(Date.now() + 1000 * 60 * 60), // Set expiration to 1 hour
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });

    return res
      .status(200)
      .json({ message: "Successfully Logged In", token: jwtToken, user });
  } catch (err) {
    return res.status(500).send("Server Error");
  }
};

const deleteUser = async (req, res) => { // although we will want to mask the user preferably
  const { email } = req.body;

  try {
    const user = await singleQueryEmail(email);

    if (user.rows.length == 0) {
      return res.status(401).json({ message: "User does not Exist" });
    }

    //If User exists --> Delete
    await pool.query("DELETE FROM users WHERE user_email = $1", [email]);

    return res.status(200).json({ message: "User successfully deleted" });
  } catch (err) {
    return res.status(500).send("Server Error");
  }
};

const logout = async (req, res) => {
  const cookies = req.headers.cookie;
  const token = cookies ? cookies.split("=")[1] : null;

  if (!token) {
    // handle this scenario accordingly
    return res.status(401).json({ message: "No Token Found" });
  }

  jwt.verify(String(token), process.env.JWT_SECRET_KEY, (err, user) => { // should we even verify token on logout?
    if (err) {
      // handle scenario, flag suspicious activity?
      return res.status(400).json({ message: "Authentication Failed" });
    }

    // expected logout conditions met; clear cookies and return
    res.clearCookie(`${user.user.id}`, {
      domain: "localhost",
      path: "/",
      // Set the expires option to a past date to invalidate the cookie
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });

    req.cookies[`${user.user.id}`] = ""; // apparently this is read only, so this line might not be doing anything

    return res.status(200).json({ message: "Successfully Logged out" });
  });
};

const verifyToken = async (req, res) => {
  const cookies = req.headers.cookie;

  if (!cookies) {
    return res.status(404).json({ message: "No Token Found" });
  }

  // REGFEX FOR A JWT
  const jwtPattern = /[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/;
  const matches = cookies.match(jwtPattern);
  const token = matches ? matches[0] : null;

  if (!token) {
    return res.status(404).json({ message: "No Token Found" });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(400).json({ auth: false, message: "Invalid Token" });
    }
    return res.status(200).json({ auth: true, user });
  });
};

const searchUser = async (req, res) => {
  try {
    const { query } = req.body;

    const sql =
      "SELECT * FROM users WHERE user_name ILIKE $1 OR user_email ILIKE $1";
    const values = [`%${query}%`];

    const results = await pool.query(sql, values);

    return res.status(200).json(results.rows);
  } catch (err) {
    return res.status(500).send("Server Error");
  }
};

exports.register = register;
exports.login = login;
exports.deleteUser = deleteUser;
exports.logout = logout;
exports.verifyToken = verifyToken;
exports.searchUser = searchUser;
