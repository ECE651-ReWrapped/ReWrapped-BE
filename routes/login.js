const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send("logging in test route");
    
    // access database

    // authenticate user

    // approve/deny

});

module.exports = router;