const request = require('supertest'); // jest w/ supertest
const app = require('./app');
const jwt = require('jsonwebtoken');
const pool = require("./db");

// Test registration
describe("POST /register (testing user registration)", () => {
    describe("Testing new user", () => {
        test("Response code 200 and returns a JWT", async () => {
            // make sure test@gmail.com doesn't exist in test database
            await pool.query('DELETE FROM users WHERE user_email = $1', ['test@gmail.com']);

            const resp = await request(app).post("/register").send({
                email: "test@gmail.com",
                name: "test",
                password: "test1234",
                confirmPassword: "test1234"

            });

            // expected items
            expect(resp.statusCode).toBe(200);
            expect(resp.body).toHaveProperty('token');

            // verify JWT token
            const decoded = jwt.verify(resp.body.token, process.env.JWT_SECRET_KEY);
            expect(decoded.user).toHaveProperty('id');
            expect(decoded.user.id).toBeTruthy(); // we don't know the value, but expect to exist and be truthy

            // optionally, we could query the db to find out exactly what the next ID would be?
        })
    });

    describe("Testing user already exists", () => {
        test("Response code 401 and json with response message", async () => {
            const resp = await request(app).post("/register").send({
                email: "test@gmail.com",
                name: "test",
                password: "test1234",
                confirmPassword: "test1234"

            });

            // expected items
            expect(resp.statusCode).toBe(401);
            expect(resp.body.message).toBe("User already exists");
        });
    });

    describe("Testing blank email", () => {
        test("Response code 401 and json with message", async () => {
            // make sure test@gmail.com doesn't exist in test database
            await pool.query('DELETE FROM users WHERE user_email = $1', ['test@gmail.com']);

            const resp = await request(app).post("/register").send({
                email: "",
                name: "test",
                password: "test1234",
                confirmPassword: "test1234"
            });

            // expected items
            expect(resp.statusCode).toBe(401);
            expect(resp.body.message).toBe("Please provide an email");
        })
    });

    describe("Testing blank username", () => {
        test("Response code 401 and json with message", async () => {
            // make sure test@gmail.com doesn't exist in test database
            await pool.query('DELETE FROM users WHERE user_email = $1', ['test@gmail.com']);

            const resp = await request(app).post("/register").send({
                email: "test@gmail.com",
                name: "",
                password: "test1234",
                confirmPassword: "test1234"
            });

            // expected items
            expect(resp.statusCode).toBe(401);
            expect(resp.body.message).toBe("Please provide a username");
        })
    });

    describe("Testing passwords not matching", () => {
        test("Response code 401 and json with message", async () => {
            // make sure test@gmail.com doesn't exist in test database
            await pool.query('DELETE FROM users WHERE user_email = $1', ['test@gmail.com']);

            const resp = await request(app).post("/register").send({
                email: "test@gmail.com",
                name: "test",
                password: "test1234",
                confirmPassword: "test123"
            });

            // expected items
            expect(resp.statusCode).toBe(401);
            expect(resp.body.message).toBe("Passwords do not match");
        })
    });

    describe("Testing server error", () => {
        test("Response code 500 and text/html response", async () => {
            // Spy on pool.query and mock its implementation temporarily
            const querySpy = jest.spyOn(pool, 'query');
            querySpy.mockRejectedValue(new Error("Database Error"));

            const resp = await request(app).post("/register").send({
                email: "test@gmail.com",
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
