const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

function authMiddleware(req, res, next) {
    const authHeader = req.headers['auth-token'];

    if (!authHeader) {
        return res.status(201).json({ message: 'No token, authorization denied' });
    }

    const accessToken = authHeader.split(' ')[1];

    if (!accessToken) {
        return res.status(201).json({ message: 'No token, authorization denied' });
    }

    try {
        var decoded = jwt.verify(accessToken, process.env.JWTSECRET_KEY);

        if (decoded) {
            next()
        }
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
}

function generateTokens(payload) {
    const accessToken = jwt.sign(payload, process.env.JWTSECRET_KEY);
    const accessTokenExpires = 60 * 15;
    const refreshToken = jwt.sign(payload, process.env.JWTSECRET_KEY);
    const refreshTokenExpires = 60 * 60 * 24;

    return { "accessToken": accessToken, "refreshToken": refreshToken, "accessTokenExpires": accessTokenExpires, "refreshTokenExpires": refreshTokenExpires };
}

const appRouter = (app) => {
    app.get('/', (req, res) => {
        res.send('server running properly');
    });

    app.post('/api/user/refresh', (req, res) => {
        const authHeader = req.headers['auth-token'];

        if (!authHeader) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const refreshToken = authHeader.split(' ')[1];

        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token is missing' });
        }

        try {
            const decoded = jwt.verify(refreshToken, process.env.JWTSECRET_KEY);

            if (decoded) {
                let payload = { username: decoded.username, email: decoded.email };
                const tokens = generateTokens(payload);

                res.status(200).json({ "user": { username: decoded.username, email: decoded.email }, "tokens": tokens });
            }
        } catch (err) {
            console.log(err);
            return res.status(400).json({ message: 'Invalid refresh token' });
        }
    });

    app.post("/api/signup", async (req, res) => {
        try {
            const { user } = req.body;
            const sql = "SELECT * FROM users WHERE username = $1";

            pool.query(sql, [user.username], (error, results) => {
                if (error) {
                    throw error;
                }

                if (results.rows.length > 0) {
                    res.status(201).send({ message: "username already in use!" });
                } else {
                    const sql = "SELECT * FROM users WHERE email = $1";

                    pool.query(sql, [user.email], async (error, results) => {
                        if (error) {
                            throw error;
                        }

                        if (results.rows.length > 0) {
                            res.status(201).send({ message: "email already in use!" });
                        } else {
                            const sql = "INSERT INTO users (username, email, password) VALUES($1, $2, $3)";
                            const salt = await bcrypt.genSalt(10);
                            const encryptedPwd = await bcrypt.hash(user.password, salt);

                            pool.query(sql, [user.username, user.email, encryptedPwd], (error, results) => {
                                if (error) {
                                    throw error;
                                }

                                res.status(200).send({ message: "User created successfully!" });
                            });
                        }
                    });
                }
            });
        } catch (err) {
            console.log(err.message);
        }
    });

    //login user
    app.post("/api/login", async (req, res) => {
        try {
            const { email, password } = req.body;
            const sql = "SELECT * FROM users WHERE email = $1";

            pool.query(sql, [email], async (error, results) => {
                if (error) {
                    throw error;
                }

                if (results.rows.length > 0) {
                    const comparison = await bcrypt.compare(password, results.rows[0].password);

                    if (comparison) {
                        let payload = { username: results.rows[0].username, email: results.rows[0].email }
                        const tokens = generateTokens(payload);

                        res.status(200).json({ "username": results.rows[0].username, "email": results.rows[0].email, "tokens": tokens });
                    } else {
                        res.status(401).json({ message: "Incorrect email or password!" });
                    }
                } else {
                    res.status(401).json({ message: "Incorrect email or password!" });
                }
            });
        } catch (err) {
            console.log(err.message);
        }
    });

    //get favourited drinks
    app.post("/api/user/favourites", authMiddleware, async (req, res) => {
        try {
            const { email } = req.body;
            const sql = "SELECT cocktail_id FROM favourites WHERE email = $1";

            pool.query(sql, [email], async (error, results) => {
                if (error) {
                    throw error;
                }

                if (results.rows.length > 0) {
                    res.status(200).json({ "favourites": results.rows });
                } else {
                    res.status(201).send({ message: "You haven't saved any cocktails yet!" });
                }
            });
        } catch (error) {
            console.log(error.message);
        }
    });

    //check cocktail saved state
    app.post("/api/cocktail/state", authMiddleware, async (req, res) => {
        try {
            const { cocktail, email } = req.body;
            const sql = "SELECT * FROM favourites WHERE cocktail_id = $1 AND email = $2";

            pool.query(sql, [cocktail, email], async (error, results) => {
                if (error) {
                    throw error;
                }

                if (results.rows.length > 0) {
                    res.status(200).send({ message: "Already saved!" });
                } else {
                    res.status(201).send({ message: "Not saved!" });
                }
            });
        } catch (error) {
            console.log(error.message);
        }
    });

    //save cocktail
    app.post("/api/cocktail/save", authMiddleware, async (req, res) => {
        try {
            const { cocktail, email } = req.body;
            const sql = "INSERT INTO favourites (cocktail_id, email) VALUES($1, $2)";

            pool.query(sql, [cocktail, email], async (error, results) => {
                if (error) {
                    throw error;
                }

                res.status(200).send({ message: "Cocktail saved!" });
            });
        } catch (error) {
            console.log(error.message);
        }
    });

    //remove cocktail
    app.post("/api/cocktail/remove", authMiddleware, async (req, res) => {
        try {
            const { cocktail, email } = req.body;
            const sql = "DELETE FROM favourites WHERE cocktail_id = $1 and email = $2";

            pool.query(sql, [cocktail, email], async (error, results) => {
                if (error) {
                    throw error;
                }

                res.status(200).send({ message: "Cocktail removed!" });
            });
        } catch (error) {
            console.log(error.message);
        }
    });

    //get cocktail ratings
    app.post("/api/cocktail/rating", async (req, res) => {
        try {
            const { cocktail } = req.body;
            const sql = "SELECT rating FROM ratings WHERE cocktail_id = $1";

            pool.query(sql, [cocktail], async (error, results) => {
                if (error) {
                    throw error;
                }

                if (results.rows.length > 0) {
                    res.json({ "ratings": results.rows });
                } else {
                    res.status(201).json({ "ratings": 0 });
                }
            });
        } catch (error) {
            console.log(error.message);
        }
    });

    //update cocktail rating
    app.post("/api/cocktail/rating/update", authMiddleware, async (req, res) => {
        try {
            const { rating, cocktail, email } = req.body;
            const sql = "SELECT * FROM ratings where cocktail_id = $1 AND email = $2";

            pool.query(sql, [cocktail, email], async (error, results) => {
                if (error) {
                    throw error;
                }

                if (results.rows.length > 0) {
                    const sql = "UPDATE ratings SET rating = $1 WHERE cocktail_id = $2 AND email = $3";

                    pool.query(sql, [rating, cocktail, email], async (error, results) => {
                        if (error) {
                            throw error;
                        }

                        res.status(200).send({ message: "Updated cocktail rating!" });
                    });
                } else {
                    const sql = "INSERT INTO ratings (rating, cocktail_id, email) VALUES($1, $2, $3)";

                    pool.query(sql, [rating, cocktail, email], async (error, results) => {
                        if (error) {
                            throw error;
                        }

                        res.status(200).send({ message: "Updated cocktail rating!" });
                    });
                }
            });


        } catch (error) {
            console.log(error.message);
        }
    });

    //get cocktail comments
    // app.get("/api/cocktail/comments", authMiddleware, async (req, res) => {
    //     try {
    //         const { cocktail } = req.body;
    //         const sql = "SELECT * FROM comments WHERE cocktail_id = $1";

    //         pool.query(sql, [cocktail], async (error, results) => {
    //             if (error) {
    //                 throw error;
    //             }

    //             if (results.rows.length > 0) {
    //                 res.json({ "comments": results.rows });
    //             } else {
    //                 res.status(400).send({ message: "Cocktail has no comments!" });
    //             }
    //         });
    //     } catch (error) {
    //         console.log(error.message);
    //     }
    // });

    // //add comment
    // app.put("/api/cocktail/comments/add", authMiddleware, async (req, res) => {
    //     try {
    //         const { cocktail, comment } = req.body;
    //         const sql = "INSERT INTO comments (cocktail_id, comment_user, comment_date, parent_id, comment_message) VALUES($1, $2, $3, $4, $5)";

    //         pool.query(sql, [cocktail, comment.user, comment.date, comment.parent_id, comment.message], async (error, results) => {
    //             if (error) {
    //                 throw error;
    //             }

    //             if (results.rows.length > 0) {
    //                 res.status(200).send({ message: "Comment added" });
    //             } else {
    //                 res.status(400).send({ message: "Couldn't add comment!" });
    //             }
    //         });
    //     } catch (error) {
    //         console.log(error.message);
    //     }
    // });

    // //delete comment
    // app.delete("/api/cocktail/comments/remove", authMiddleware, async (req, res) => {
    //     try {
    //         const { cocktail, comment, username } = req.body;
    //         const sql = "DELETE FROM comments WHERE cocktail_id = $1 AND comment_id = $2 AND comment_user = $3)";

    //         pool.query(sql, [cocktail, comment.id, username], async (error, results) => {
    //             if (error) {
    //                 throw error;
    //             }

    //             if (results.rows.length > 0) {
    //                 res.status(200).send({ message: "Comment removed" });
    //             } else {
    //                 res.status(400).send({ message: "Couldn't remove comment!" });
    //             }
    //         });
    //     } catch (error) {
    //         console.log(error.message);
    //     }
    // });

    // //edit comment
    // app.delete("/api/cocktail/comments/edit", authMiddleware, async (req, res) => {
    //     try {
    //         const { cocktail, comment, username } = req.body;
    //         const sql = "UPDATE comments SET comment_message = $1 WHERE cocktail_id = $2 AND comment_user = $3";

    //         pool.query(sql, [cocktail, comment.message, username], async (error, results) => {
    //             if (error) {
    //                 throw error;
    //             }

    //             if (results.rows.length > 0) {
    //                 res.status(200).send({ message: "Updated comment!" });
    //             } else {
    //                 res.status(400).send({ message: "Couldn't update comment!" });
    //             }
    //         });
    //     } catch (error) {
    //         console.log(error.message);
    //     }
    // });
}

module.exports = appRouter;