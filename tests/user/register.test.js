const request = require("supertest"); // jest w/ supertest
const app = require("../../app");
const jwt = require("jsonwebtoken");
const pool = require("../../db");

// Jest hook to run after tests have completed
afterAll(async () => {
  // Close the pool
  await pool.end();
});

// Test registration
describe("POST /register (testing user registration)", () => {
  describe("Testing registration of new user with valid details", () => {
    test("Should return 200 OK response and valid JWT when registering new user", async () => {
      const email = "registerasdsadaasdad@gmail.com";

      const resp = await request(app).post("/register").send({
        email: email,
        name: "test10000asdsd",
        password: "test1234",
        confirmPassword: "test1234",
      });

      // expected items
      // expect(resp.statusCode).toBe(200);
      // expect(resp.body).toHaveProperty('token');

      // verify JWT token
      const decoded = jwt.verify(resp.body.token, process.env.JWT_SECRET_KEY);
      expect(decoded.user).toHaveProperty("id");
      expect(decoded.user.id).toBeTruthy(); // we don't know the value, but expect to exist and be truthy

      // optionally, we could query the db to find out exactly what the next ID would be?
      // should we even be returning a token on sign up? shouldn't we only do it on login?
      // make sure register@gmail.com doesn't exist in test database
      const deleteUser = await request(app)
        .delete("/delete")
        .send({ email: email });
      expect(deleteUser.body.message).toBe("User successfully deleted");
    });
  });

  describe("Testing user already exists on user registration", () => {
    test("Return response code 401 and json with error response message for already existing user on registration", async () => {
      // create user
      const userCreation = await request(app).post("/register").send({
        email: "registe2@gmail.com",
        name: "testabcd",
        password: "test1234",
        confirmPassword: "test1234",
      });

      // expected items
      // console.log(userCreation)
      // expect(userCreation.statusCode).toBe(200);

      // registration attempt
      const resp = await request(app).post("/register").send({
        email: "registe2@gmail.com",
        name: "testabcd",
        password: "test1234",
        confirmPassword: "test1234",
      });

      // expected items
      expect(resp.statusCode).toBe(401);
      expect(resp.body.message).toBe("User already exists");

      // make sure register@gmail.com doesn't exist in test database
      const deleteUser = await request(app).delete("/delete").send({
        email: "registe2@gmail.com",
      });

      expect(deleteUser.body.message).toBe("User successfully deleted");
    });
  });

  describe("Testing blank email during user registration", () => {
    test("Expect response code 401 and json with error message on user registration with blank email", async () => {
      const resp = await request(app).post("/register").send({
        email: "",
        name: "test",
        password: "test1234",
        confirmPassword: "test1234",
      });

      // expected items
      expect(resp.statusCode).toBe(401);
      expect(resp.body.message).toBe("Missing Credentials");
    });
  });

  describe("Testing blank username during registration", () => {
    test("Expect response code 401 and json with error message on user registration with blank username", async () => {
      const resp = await request(app).post("/register").send({
        email: "register100@gmail.com",
        name: "",
        password: "test1234",
        confirmPassword: "test1234",
      });

      // expected items
      expect(resp.statusCode).toBe(401);
      expect(resp.body.message).toBe("Missing Credentials");
    });
  });

  describe("Testing blank password during user registration", () => {
    test("Expect response code 401 and json with error message during blank password user registration", async () => {
      const resp = await request(app).post("/register").send({
        email: "register@gmail.com",
        name: "test",
        password: "",
        confirmPassword: "test1234",
      });

      // expected items
      expect(resp.statusCode).toBe(401);
      expect(resp.body.message).toBe("Missing Credentials");
    });
  });

  describe("Testing invalid email on user registration", () => {
    test("Expect response code 401 and json error message on invalid email during user registration", async () => {
      const resp = await request(app).post("/register").send({
        email: "test@gmail..com",
        name: "test",
        password: "test1234",
        confirmPassword: "test1234",
      });

      // expected items
      expect(resp.statusCode).toBe(401);
      expect(resp.body.message).toBe("Invalid Email");
    });
  });

  describe("Testing passwords not matching during user registration", () => {
    test("Expect response code 401 and json error message for non-matching passwords during user registration", async () => {
      const resp = await request(app).post("/register").send({
        email: "register@gmail.com",
        name: "testgooble",
        password: "test1234",
        confirmPassword: "",
      });

      // expected items
      expect(resp.statusCode).toBe(401);
      expect(resp.body.message).toBe("Passwords do not match");
    });
  });

  describe("Testing server error on user registration", () => {
    test("Expect response code 500 and text/html error response for error response during user registration", async () => {
      // Spy on pool.query and mock its implementation temporarily
      const querySpy = jest.spyOn(pool, "query");
      querySpy.mockRejectedValue(new Error("Database Error"));

      const resp = await request(app).post("/register").send({
        email: "register@gmail.com",
        name: "test",
        password: "test1234",
        confirmPassword: "test123",
      });

      // expected items
      expect(resp.statusCode).toBe(500);
      expect(resp.text).toBe("Server Error");

      // restore the original implementation after the test
      querySpy.mockRestore();
    });
  });
});
