const Pool = require("pg").Pool;
require("dotenv").config();

//local developement
// const pool = new Pool({
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT,
//     database: process.env.DB_NAME
// });

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL + "?sslmode=require",
})

pool.connect((err) => {
    if (err) {
        throw err;
    } else {
        console.log("Connected to PostgreSQL DB!");
    }
})

module.exports = pool;