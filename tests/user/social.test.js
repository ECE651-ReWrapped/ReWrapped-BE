const request = require("supertest"); // jest w/ supertest
const app = require("../../app");
const jwt = require("jsonwebtoken");
const pool = require("../../db");
const { v4: uuidv4 } = require('uuid');

// constants & variables
const emailOne = "testOne@gmail.com";
const emailTwo = "testTwo@gmail.com";

let regOne = null;
let regTwo = null;
let cookieOne = null;
let cookieTwo = null;

// Jest hook to run before tests
beforeAll(async () => {
  regOne = await request(app).post("/register").send({
    email: emailOne,
    name: "testOne",
    password: "test1234",
    confirmPassword: "test1234",
  });

  regTwo = await request(app).post("/register").send({
    email: emailTwo,
    name: "testTwo",
    password: "test1234",
    confirmPassword: "test1234",
  });

  // grab cookies
  cookieOne = regOne.headers['set-cookie'];
  cookieTwo = regTwo.headers['set-cookie'];
});

// Jest hook to run after tests have completed
afterAll(async () => {
  // delete test users
  await request(app).delete("/delete").send({ email: emailOne });
  await request(app).delete("/delete").send({ email: emailTwo });

  // Close the pool
  await pool.end();
});

// Function to generate test data
function generateTestData() {
  return {
    uuid: uuidv4() // The chance of generating a duplicate in a single generation is 1 in 5.3x10^36
    // Add other data generation here as needed
  };
}

describe("POST /followUser (testing following a user )", () => {
  describe("SOCIAL001 - Testing successful follow", () => {
    test("Should return 200 response code with successful follow message", async () => {
      // get target's ID
      const userTwoId = cookieTwo[0].split(';')[0].split('=')[0];

      // follow user
      const followResponse = await request(app)
        .post("/followUser")
        .set('Cookie', cookieOne[0].split(';')[0])
        .send({
          targetID: userTwoId,
        });

      expect(followResponse.statusCode).toBe(200);
      expect(followResponse.body).toHaveProperty("message");
      expect(followResponse.body.message).toBe("Follow successful.");

      // clean up
      await request(app)
        .delete("/unfollowUser")
        .set('Cookie', cookieOne[0].split(';')[0])
        .send({ targetID: userTwoId });
    });
  });

  describe("SOCIAL002 - Following a user with no cookie set", () => {
    test("Should return 401 response with error message", async () => {
      // follow user
      const followResponse = await request(app)
        .post("/followUser")
        .send({
          targetID: "",
        });

      expect(followResponse.statusCode).toBe(401);
      expect(followResponse.body).toHaveProperty("message");
      expect(followResponse.body.message).toBe("User is missing cookie!");
    });
  });

  describe("SOCIAL003 - Following a user with no token", () => {
    test("Should return 401 response with error message", async () => {
      // modify the cookie (if needed)
      let testCookie = cookieOne[0].split(';')[0];
      testCookie = testCookie.split('=')[0];

      console.log(testCookie);

      // follow user
      const followResponse = await request(app)
        .post("/followUser")
        .set('Cookie', testCookie)
        .send({
          targetID: "",
        });

      expect(followResponse.statusCode).toBe(401);
      expect(followResponse.body).toHaveProperty("message");
      expect(followResponse.body.message).toBe("No Token Found");
    });
  });

  describe("SOCIAL004 - Following a user with an invalid token", () => {
    test("Should return 401 response with error message", async () => {
      // modify the cookie (if needed)
      let testCookie = cookieOne[0].split(';')[0];
      testCookie = testCookie.replace('=', '=randomString');

      // follow user
      const followResponse = await request(app)
        .post("/followUser")
        .set('Cookie', testCookie)
        .send({
          targetID: "",
        });

      expect(followResponse.statusCode).toBe(401);
      expect(followResponse.body).toHaveProperty("message");
      expect(followResponse.body.message).toBe("invalid token");
    });
  });

  describe("SOCIAL005 - Following a user with an invalid signature", () => {
    test("Should return 401 response with error message", async () => {
      // modify the cookie (if needed)
      let testCookie = cookieOne[0].split(';')[0];

      // follow user
      const followResponse = await request(app)
        .post("/followUser")
        .set('Cookie', testCookie + 'randomString')
        .send({
          targetID: "",
        });

      expect(followResponse.statusCode).toBe(401);
      expect(followResponse.body).toHaveProperty("message");
      expect(followResponse.body.message).toBe("invalid signature");
    });
  });

  describe("SOCIAL006 - Following a user that is already followed", () => {
    test("Should return 401 response with error message", async () => {
      // modify the cookie (if needed)
      let testCookie = cookieOne[0].split(';')[0];

      // get target's ID
      const userTwoId = cookieTwo[0].split(';')[0].split('=')[0];

      // follow user
      const followResponse = await request(app)
        .post("/followUser")
        .set('Cookie', testCookie)
        .send({
          targetID: userTwoId,
        });

      // follow user
      const followAgainResponse = await request(app)
        .post("/followUser")
        .set('Cookie', testCookie)
        .send({
          targetID: userTwoId,
        });

      expect(followResponse.statusCode).toBe(200); // make sure the test is set up correctly

      expect(followAgainResponse.statusCode).toBe(409);
      expect(followAgainResponse.body).toHaveProperty("message");
      expect(followAgainResponse.body.message).toBe("User is already followed.");
    });
  });

  describe("SOCIAL007 - Following a user when source ID does not exist in DB", () => {
    test("Should return 401 response with error message", async () => {
      // modify the cookie (if needed)
      let testCookie = cookieOne[0].split(';')[0];
      let testData = generateTestData();
      testCookie = testData.uuid + '=' + testCookie.split("=")[1];

      // get target's ID
      const userTwoId = cookieTwo[0].split(';')[0].split('=')[0];

      // follow user
      const followResponse = await request(app)
        .post("/followUser")
        .set('Cookie', testCookie)
        .send({
          targetID: userTwoId,
        });

      expect(followResponse.statusCode).toBe(404);
      expect(followResponse.body).toHaveProperty("message");
      expect(followResponse.body.message).toBe("Source or target user does not exist.");
    });
  });

  describe("SOCIAL008 - Following a user when target ID does not exist in DB", () => {
    test("Should return 402 response with error message", async () => {
      // modify the cookie (if needed)
      let testCookie = cookieOne[0].split(';')[0];
      let testData = generateTestData();

      // follow user
      const followResponse = await request(app)
        .post("/followUser")
        .set('Cookie', testCookie)
        .send({
          targetID: testData.uuid,
        });

      expect(followResponse.statusCode).toBe(404);
      expect(followResponse.body).toHaveProperty("message");
      expect(followResponse.body.message).toBe("Source or target user does not exist.");
    });
  });

  describe("SOCIAL009 - User attempting to follow self", () => {
    test("Should return 401 response with error message", async () => {
      // modify the cookie (if needed)
      let testCookie = cookieOne[0].split(';')[0];

      // get target's ID
      const userOneId = testCookie.split('=')[0];

      // follow user
      const followResponse = await request(app)
        .post("/followUser")
        .set('Cookie', testCookie)
        .send({
          targetID: userOneId,
        });

      expect(followResponse.statusCode).toBe(409);
      expect(followResponse.body).toHaveProperty("message");
      expect(followResponse.body.message).toBe("User cannot follow itself.");
    });
  });

  describe("SOCIAL010 - Testing server/unexpected error", () => {
    test("Expect response code in error range", async () => {
      // Spy on pool.query and mock its implementation temporarily
      const querySpy = jest.spyOn(pool, "query");
      querySpy.mockRejectedValue(new Error("Unexpected error!"));

      // modify the cookie (if needed)
      let testCookie = cookieOne[0].split(';')[0];

      // get target's ID
      const userTwoId = cookieTwo[0].split(';')[0].split('=')[0];

      // follow user
      const followResponse = await request(app)
        .post("/followUser")
        .set('Cookie', testCookie)
        .send({
          targetID: userTwoId,
        });

      // expected items
      console.log(followResponse);
      expect(followResponse.statusCode).toBe(500);
      expect(followResponse._body.message).toBe("Unexpected error!");

      // restore the original implementation after the test
      querySpy.mockRestore();

      // clean up
      await request(app)
        .delete("/unfollowUser")
        .set('Cookie', cookieOne[0].split(';')[0])
        .send({ targetID: userTwoId });
    });
  });
});

describe("DELETE /unfollowUser (testing unfollowing a user )", () => {
  describe("Testing successful unfollow", () => {
    test("Should return 200 response code with successful unfollow message", async () => {
      // get target's ID
      const userTwoId = cookieTwo[0].split(';')[0].split('=')[0];

      // follow user
      await request(app)
        .post("/followUser")
        .set('Cookie', cookieOne[0].split(';')[0])
        .send({
          targetID: userTwoId,
        });

      // unfollow
      const unfollowResponse = await request(app)
        .delete("/unfollowUser")
        .set('Cookie', cookieOne[0].split(';')[0])
        .send({ targetID: userTwoId });

      expect(unfollowResponse.statusCode).toBe(200);
      expect(unfollowResponse.body).toHaveProperty("message");
      expect(unfollowResponse.body.message).toBe("User unfollowed successfully");
    });
  });
});
