const express = require('express'); // using the express library installed
const app = express(); // sets up the server

const userRouter = require('./routes/users');
app.use('/users', userRouter);

const loginRouter = require('./routes/login');
app.use('/login', loginRouter);

// app.use(logger); // middleware; placement of this line matters

app.get('/', logger, (req, res) => {
    console.log('Here');
    res.json({ message: "Error" }); // return json
    // res.download('server.js'); // download stuff
    // res.send('Hi'); // simple message
    // res.render('index', { text: "Yeah"}); // load html file; requires view engine, but don't need to use this since we're using React
});

function logger(req, res, next) {
    console.log(req.originalUrl);
    next();
};

module.exports = app;