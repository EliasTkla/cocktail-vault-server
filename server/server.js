const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

//cors setup
var corsOptions = {
    origin: 'http://localhost:3000',
    optionSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

//routes
const routes = require('./routes/routes.js')(app);

//start the server
const server = app.listen(process.env.PORT || 3001, () => {
    console.log('listening on port %s...', server.address().port);
});

