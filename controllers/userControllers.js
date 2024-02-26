const pool = require("../db");
const bycrypt = require("bcryptjs");
const jwtGenerator = require("../utils/jwtGenerator");
const jwt = require('jsonwebtoken')

const register = async (req, res) => {
  const { email, name, password, confirmPassword } = req.body;

  try {
    const user = await pool.query("SELECT * FROM users WHERE user_email = $1 OR user_name = $2", [
      email,
      name
    ]);

    if (user.rows.length > 0) {
      return res.status(405).json({ message: "User already exists" });
    }

    if (password !== confirmPassword) {
      return res.status(401).json({ message: "Passwords do not match" });
    }

    const salt = await bycrypt.genSalt(10);
    const bcryptPassword = await bycrypt.hash(password, salt);

    let newUser = await pool.query(
      "INSERT INTO users (user_name, user_email, user_password) VALUES ($1, $2, $3) RETURNING *",
      [name, email, bcryptPassword],
    );

    const jwtToken = jwtGenerator(newUser.rows[0].user_id);

    return res.status(200).json({ token: jwtToken });
  } catch (err) {
    return res.status(500).send("Server Error");
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  console.log("Cookies in request: \n");
  console.log(req.cookies);

  try {
    const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [
      email,
    ]);

    if (user.rows.length === 0) {
      return res.status(401).json({ message: "User Does not Exist" });
    }

    const validPassword = await bycrypt.compare(
      password,
      user.rows[0].user_password,
    );

    if (!validPassword) {
      return res.status(401).json({ message: "Incorrect Password" });
    }

    const jwtToken = jwtGenerator(user.rows[0].user_id);
    res.cookie(String(user.rows[0].user_id), jwtToken, {
      domain: 'localhost',
      path: '/',
      expires: new Date(Date.now() + 1000 * 86400 * 7),
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    })

    console.log("Cookies set in response:");
    console.log(res.get('Set-Cookie'));

    return res.status(200).json({ message: 'Succefully Logged In', token: jwtToken, user });
  } catch (err) {
    return res.status(500).send("Server Error");
  }
};

const deleteUser = async (req, res) => {
  const { email } = req.body

  try {
    const user = await pool.query("SELECT * FROM users WHERE user_email = $1", [
      email,
    ]);

    if (user.rows.length == 0) {
      return res.status(401).json({ message: 'User does not Exist' })
    }

    //If User exists --> Delete
    const deleteUser = await pool.query("DELETE FROM users WHERE user_email = $1", [email])

    return res.status(200).json({ message: 'User successfully deleted' })

  } catch (err) {
    return res.status(500).send("Server Error")
  }
}

const logout = async (req, res, next) => {
  const cookies = req.headers.cookie
  const token = cookies ? cookies.split('=')[1] : null;

  console.log("Cookies in request: \n");
  console.log(req.cookies);

  if (!token) {
    // handle this scenario accordingly
    return res.status(404).json({ message: 'No Token Found' })
  }

  jwt.verify(String(token), process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      // handle scenario, flag suspicious activity?
      return res.status(400).json({ message: "Authentication Failed" })
    }

    // expected logout conditions; clear cookies and return
    res.clearCookie(`${user.user_id}`, {
      domain: 'localhost',
      path: '/',
      // Set the expires option to a past date to invalidate the cookie
      expires: new Date(0),
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    });
    req, cookies[`${user.user_id}`] = ''; // apparently this is read only, so this line might not be doing anything

    console.log("Cookies in response: \n");
    console.log(res.cookies);

    console.log("Cookies set in response:");
    console.log(res.get('Set-Cookie'));

    return res.status(200).json({ message: "Successfully Logged out" })
  })
}

exports.register = register;
exports.login = login;
exports.deleteUser = deleteUser
exports.logout = logout
