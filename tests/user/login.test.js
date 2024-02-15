const request = require('supertest'); // jest w/ supertest
const app = require('../../app');
const jwt = require('jsonwebtoken');
const pool = require("../../db");

// Jest hook to run after tests have completed
afterAll(async () => {
    // Close the pool
    await pool.end();
});

describe("POST /login (testing user login/authentication)", () => {
    describe("Testing user login with blank email", () => {
        test("Expect response code 401 and json with error message after failed login", async () => {
            // make sure login@gmail.com doesn't exist in test database
            await pool.query('DELETE FROM users WHERE user_email = $1', ['login@gmail.com']);

            // create user
            const userCreation = await request(app).post("/register").send({
                email: "login@gmail.com",
                name: "test",
                password: "test1234",
                confirmPassword: "test1234"

            });

            // expected items
            expect(userCreation.statusCode).toBe(200);

            // login attempt
            const resp = await request(app).post("/login").send({
                email: "",
                password: "test1234",
            });

            // expected items
            expect(resp.statusCode).toBe(401);
            expect(resp.body.message).toBe("Missing Credentials");
        })
    });

    describe("Testing user login with blank password", () => {
        test("Expect response code 401 and json with error message after failed login", async () => {
            // make sure login@gmail.com doesn't exist in test database
            await pool.query('DELETE FROM users WHERE user_email = $1', ['login@gmail.com']);

            // create user
            const userCreation = await request(app).post("/register").send({
                email: "login@gmail.com",
                name: "test",
                password: "test1234",
                confirmPassword: "test1234"

            });

            // expected items
            expect(userCreation.statusCode).toBe(200);

            // login attempt
            const resp = await request(app).post("/login").send({
                email: "login@gmail.com",
                password: "",
            });

            // expected items
            expect(resp.statusCode).toBe(401);
            expect(resp.body.message).toBe("Missing Credentials");
        })
    });

    describe("Testing user not found during login attempt", () => {
        test("Expect response code 401 and json with error message on use login", async () => {
            // make sure login@gmail.com doesn't exist in test database
            await pool.query('DELETE FROM users WHERE user_email = $1', ['login@gmail.com']);

            const resp = await request(app).post("/login").send({
                email: "login@gmail.com",
                password: "test1234",
            });

            // expected items
            expect(resp.statusCode).toBe(401);
            expect(resp.body.message).toBe("Invalid Credentials");
        })
    });

    describe("Testing successful user login", () => {
        test("Response code 200 for user creation and for successful login + token returned", async () => {
            // make sure login@gmail.com doesn't exist in test database
            await pool.query('DELETE FROM users WHERE user_email = $1', ['login@gmail.com']);

            // create user
            const userCreation = await request(app).post("/register").send({
                email: "login@gmail.com",
                name: "test",
                password: "test1234",
                confirmPassword: "test1234"

            });

            // expected items
            expect(userCreation.statusCode).toBe(200);

            // login
            const resp = await request(app).post("/login").send({
                email: "login@gmail.com",
                password: "test1234"
            });

            // expected items
            expect(resp.statusCode).toBe(200);
            expect(resp.body).toHaveProperty('token');

            // verify JWT token
            const decoded = jwt.verify(resp.body.token, process.env.JWT_SECRET_KEY);
            expect(decoded.user).toHaveProperty('id');
            expect(decoded.user.id).toBeTruthy(); // we don't know the value, but expect to exist and be truthy
        });
    });

    describe("Testing incorrect password on user login", () => {
        test("Expect response code 200 for user creation. Response code 401 for invalid password + error message", async () => {
            // make sure login@gmail.com doesn't exist in test database
            await pool.query('DELETE FROM users WHERE user_email = $1', ['login@gmail.com']);

            // create user
            const userCreation = await request(app).post("/register").send({
                email: "login@gmail.com",
                name: "test",
                password: "test1234",
                confirmPassword: "test1234"

            });

            // expected items
            expect(userCreation.statusCode).toBe(200);

            // login
            const resp = await request(app).post("/login").send({
                email: "login@gmail.com",
                password: "test4321"
            });

            // expected items
            expect(resp.statusCode).toBe(401);
            expect(resp.body.message).toBe("Invalid Credentials");
        });
    });

    describe("Testing server error on user login", () => {
        test("Expect response code 500 and text/html response on server error during user login", async () => {
            // Spy on pool.query and mock its implementation temporarily
            const querySpy = jest.spyOn(pool, 'query');
            querySpy.mockRejectedValue(new Error("Database Error"));

            const resp = await request(app).post("/login").send({
                email: "login@gmail.com",
                name: "test",
                password: "test1234",
                confirmPassword: "test123"
            });

            // expected items
            expect(resp.statusCode).toBe(500);
            expect(resp.text).toBe("Server Error");

            // restore the original implementation after the test
            querySpy.mockRestore();
        })
    });
});
