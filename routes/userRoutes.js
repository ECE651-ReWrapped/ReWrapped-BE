const express = require("express");
const { register, login, deleteUser } = require("../controllers/userControllers");

// middleware
const validInfo = require("../middleware/validInfo");

// router
const router = express.Router();

// routes
router.post("/register", validInfo, register);
router.post("/login", validInfo, login);
router.delete('/delete', deleteUser)

module.exports = router;
