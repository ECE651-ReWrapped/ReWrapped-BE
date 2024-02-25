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
            const email = "login100@gmail.com"
            // create user
            const userCreation = await request(app).post("/register").send({
                email: email,
                name: "testing100",
                password: "test1234",
                confirmPassword: "test1234"
            });

            // expected items
            expect(userCreation.statusCode).toBe(200);

            // login attempt
            const resp = await request(app).post("/login").send({
                email: email,
                password: "",
            });

            // expected items
            expect(resp.statusCode).toBe(401);
            expect(resp.body.message).toBe("Missing Credentials");

            const deleteUser = await request(app).delete("/delete").send({
                email: email
            });

            expect(deleteUser.body.message).toBe("User successfully deleted");
        })
    });

    describe("Testing user not found during login attempt", () => {
        test("Expect response code 401 and json with error message on use login", async () => {
            const resp = await request(app).post("/login").send({
                email: "login12312313@gmail.com",
                password: "test1234",
            });

            // expected items
            expect(resp.statusCode).toBe(401);
            expect(resp.body.message).toBe("User Does not Exist");
        })
    });

    describe("Testing successful user login", () => {
        test("Response code 200 for user creation and for successful login + token returned", async () => {
            // create user
            const email = "logintesting@gmail.com"

            await request(app).post("/register").send({
                email: email,
                name: "testablebaby",
                password: "test1234",
                confirmPassword: "test1234"

            });

            // login
            const resp = await request(app).post("/login").send({
                email: email,
                password: "test1234"
            });

            // expected items
            expect(resp.statusCode).toBe(200);
            expect(resp.body).toHaveProperty('token');

            // verify JWT token
            const decoded = jwt.verify(resp.body.token, process.env.JWT_SECRET_KEY);
            expect(decoded.user).toHaveProperty('id');
            expect(decoded.user.id).toBeTruthy(); // we don't know the value, but expect to exist and be truthy

            const deleteUser = await request(app).delete("/delete").send({
                email: email
            });

            expect(deleteUser.body.message).toBe("User successfully deleted");
            
        });
    });

    describe("Testing incorrect password on user login", () => {
        test("Expect response code 200 for user creation. Response code 401 for invalid password + error message", async () => {
            // create user
            const email = "login100000@gmail.com"

            await request(app).post("/register").send({
                email: email,
                name: "login100000",
                password: "test1234",
                confirmPassword: "test1234"

            });

            // login
            const resp = await request(app).post("/login").send({
                email: email,
                password: "test4321"
            });

            // expected items
            expect(resp.statusCode).toBe(401);
            expect(resp.body.message).toBe("Incorrect Password");

            const deleteUser = await request(app).delete("/delete").send({
                email: email
            });

            expect(deleteUser.body.message).toBe("User successfully deleted");
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
