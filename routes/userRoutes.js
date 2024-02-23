const express = require("express");
const { register, login } = require("../controllers/userControllers");

// middleware
const validInfo = require("../middleware/validInfo");

// router
const router = express.Router();

// routes
router.post("/register", validInfo, register);
router.post("/login", validInfo, login);

module.exports = router;
