const express = require("express");
const { register, login, deleteUser } = require("../controllers/userControllers");
const { checkUserEmail, setNewPassword, validateToken } = require('../controllers/dbControllers');

// middleware
const validInfo = require("../middleware/validInfo");

// router
const router = express.Router();

// routes
router.post("/register", validInfo, register);
router.post("/login", validInfo, login);
router.delete('/delete', deleteUser)
router.post('/reset-password', validInfo, checkUserEmail);
router.put('/reset-password', setNewPassword);
router.get('/reset-password/:token', validateToken);

module.exports = router;
