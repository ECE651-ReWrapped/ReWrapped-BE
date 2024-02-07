const express = require("express");
const { register, login } = require("../controllers/userControllers");
const validInfo = require("../middleware/validInfo");
const router = express.Router();

router.post("/register", validInfo, register);
router.post("/login", validInfo, login);

module.exports = router;
