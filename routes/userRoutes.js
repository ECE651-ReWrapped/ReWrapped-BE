const express = require("express");
const {
  register,
  login,
  deleteUser,
  logout,
  verifyToken,
} = require("../controllers/userControllers");
const { checkUserEmail, setNewPassword, validateToken } = require('../controllers/dbControllers');
const { followUser } = require('../controllers/socialControllers');

// middleware
const validInfo = require("../middleware/validInfo");

// router
const router = express.Router();

// routes
router.post("/register", validInfo, register);
router.post("/login", validInfo, login);
router.delete("/delete", deleteUser);
router.post("/logout", logout);
router.get("/verifyToken", verifyToken);
router.post('/reset-password', validInfo, checkUserEmail);
router.put('/reset-password', setNewPassword);
router.get('/reset-password/:token', validateToken);
router.post('/followUser', followUser);

module.exports = router;
