const request = require('supertest'); // jest w/ supertest
const app = require('./app');

// example of a test
describe("POST /users/new", () => {
    describe("username password test", () => {
        
        test("response 200 code", async () => {
            const resp = await request(app).post("/users/new").send({
                username: "username",
                password: "password"
            })
            expect(resp.statusCode).toBe(200)
        });
    })
});