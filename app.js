require("dotenv").config(); // should be the first thing that runs

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Use the REACT_APP_CLIENT environment variable for the CORS origin
app.use(cors({ credentials: true, origin: process.env.REACT_APP_CLIENT }));
app.use(cookieParser());
app.use(express.json());

app.use("/", userRoutes);

module.exports = app;
