require("dotenv").config(); // should be the first thing that runs

const express = require("express");
const session = require("express-session");
const passport = require('passport');
const sessionSecret = process.env.SESSION_SECRET || "your-secret-key";
const cors = require("cors");
const cookieParser = require("cookie-parser");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require('./routes/apiRoutes');

const app = express();

// Use the REACT_APP_CLIENT environment variable for the CORS origin
app.use(cors({ credentials: true, origin: process.env.REACT_APP_CLIENT }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    session({ secret: sessionSecret, resave: true, saveUninitialized: true })
  );
app.use(passport.initialize());
app.use(passport.session());

app.use("/", userRoutes);
app.use("/", authRoutes);

module.exports = app;
