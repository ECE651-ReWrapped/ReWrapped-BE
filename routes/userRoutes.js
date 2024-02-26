const express = require("express");
const { register, login, deleteUser, logout } = require("../controllers/userControllers");

// middleware
const validInfo = require("../middleware/validInfo");

// router
const router = express.Router();

// routes
router.post("/register", validInfo, register);
router.post("/login", validInfo, login);
router.delete('/delete', deleteUser)
router.post('/logout', logout)

module.exports = router;
