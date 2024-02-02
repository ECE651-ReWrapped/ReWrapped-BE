const express = require('express');
const router = express.Router();

const users = [
    { name: "Kyle" },
    { name: "Daniel" }
];

// the order of the post/get functions matter; always place static routes above dynamic routes

router.post('/new', (req, res) => {
    res.status(420).json({ message: "post response" }); // return json
});

router.route("/:id")
    .get((req, res) => { // when u want to grab from url
        //res.send("getting user: " + req.params.id);
        console.log(req.user);
        res.send(`get user with id: ${req.params.id}`);
    })
    .put((req, res) => { // when u want to grab from url
        //res.send("getting user: " + req.params.id);
        res.send(`put user with id: ${req.params.id}`);
    })
    .delete((req, res) => { // when u want to grab from url
        //res.send("getting user: " + req.params.id);
        res.send(`delete user with id: ${req.params.id}`);
    });

// router.get('/:id', (req, res) => { // when u want to grab from url
//     //res.send("getting user: " + req.params.id);
//     res.send(`get user with id: ${req.params.id}`);
// });

// router.put('/:id', (req, res) => { // when u want to grab from url
//     //res.send("getting user: " + req.params.id);
//     res.send(`get user with id: ${req.params.id}`);
// });

// router.delete('/:id', (req, res) => { // when u want to grab from url
//     //res.send("getting user: " + req.params.id);
//     res.send(`get user with id: ${req.params.id}`);
// });

router.param("id", (req, res, next, id) => { // middleware: runs between request and response
    req.user = users[id];
    next(); // runs next piece of middleware
});

module.exports = router;