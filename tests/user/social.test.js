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

// Define a pattern that matches the structure of JWT
const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;

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
  const cookiesOne = regOne.headers['set-cookie'];
  const cookiesTwo = regTwo.headers['set-cookie'];

  // Search for the JWT token in the cookies
  for (const fullCookie of cookiesOne) {
    const cookies = fullCookie.split('; ');
    for (const cookie of cookies) {
      const parts = cookie.split('=');
      if (jwtPattern.test(parts[1])) {
        cookieOne = cookie; // Save the entire cookie string
        break;
      }
    }
  }

  for (const fullCookie of cookiesTwo) {
    const cookies = fullCookie.split('; ');
    for (const cookie of cookies) {
      const parts = cookie.split('=');
      if (jwtPattern.test(parts[1])) {
        cookieTwo = cookie; // Save the entire cookie string
        break;
      }
    }
  }

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
      const userTwoId = cookieTwo.split('=')[0];

      // follow user
      const followResponse = await request(app)
        .post("/followUser")
        .set('Cookie', cookieOne)
        .send({
          targetID: userTwoId,
        });

      expect(followResponse.statusCode).toBe(200);
      expect(followResponse.body).toHaveProperty("message");
      expect(followResponse.body.message).toBe("Follow successful.");

      // clean up
      await request(app)
        .delete("/unfollowUser")
        .set('Cookie', cookieOne)
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
      let testCookie = cookieOne.split('=')[0];

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
      let testCookie = cookieOne.replace('=', '=randomString');

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
      let testCookie = cookieOne;

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
      let testCookie = cookieOne;

      // get target's ID
      const userTwoId = cookieTwo.split('=')[0];

      // follow user
      const followResponse = await request(app)
        .post("/followUser")
        .set('Cookie', testCookie)
        .send({
          targetID: userTwoId,
        });

      expect(followResponse.statusCode).toBe(200); // make sure the test is set up correctly

      // follow user
      const followAgainResponse = await request(app)
        .post("/followUser")
        .set('Cookie', testCookie)
        .send({
          targetID: userTwoId,
        });

      expect(followAgainResponse.statusCode).toBe(409);
      expect(followAgainResponse.body).toHaveProperty("message");
      expect(followAgainResponse.body.message).toBe("User is already followed.");
    });
  });

  describe("SOCIAL007 - Following a user when source ID does not exist in DB", () => {
    test("Should return 401 response with error message", async () => {
      // modify the cookie (if needed)
      let testData = generateTestData();
      testCookie = testData.uuid + '=' + cookieOne.split("=")[1];

      // get target's ID
      const userTwoId = cookieTwo.split('=')[0];

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
      let testCookie = cookieOne;
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
      let testCookie = cookieOne;

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
      let testCookie = cookieOne;

      // get target's ID
      const userTwoId = cookieTwo.split('=')[0];

      // follow user
      const followResponse = await request(app)
        .post("/followUser")
        .set('Cookie', testCookie)
        .send({
          targetID: userTwoId,
        });

      // expected items
      expect(followResponse.statusCode).toBe(500);
      expect(followResponse._body.message).toBe("Unexpected error!");

      // restore the original implementation after the test
      querySpy.mockRestore();

      // clean up
      await request(app)
        .delete("/unfollowUser")
        .set('Cookie', cookieOne)
        .send({ targetID: userTwoId });
    });
  });
});

describe("DELETE /unfollowUser (testing unfollowing a user )", () => {
  describe("SOCIAL011 - Testing successful unfollow", () => {
    test("Should return 200 response code with successful unfollow message", async () => {
      // get target's ID
      const userTwoId = cookieTwo.split('=')[0];

      // follow user
      await request(app)
        .post("/followUser")
        .set('Cookie', cookieOne)
        .send({
          targetID: userTwoId,
        });

      // unfollow
      const unfollowResponse = await request(app)
        .delete("/unfollowUser")
        .set('Cookie', cookieOne)
        .send({ targetID: userTwoId });

      expect(unfollowResponse.statusCode).toBe(200);
      expect(unfollowResponse.body).toHaveProperty("message");
      expect(unfollowResponse.body.message).toBe("User unfollowed successfully");
    });
  });

  describe("SOCIAL012 - Unfollowing a user that is not followed", () => {
    test("Should return error code 400 and message", async () => {
      // get target's ID
      let testData = generateTestData();
      const userTwoId = testData.uuid;

      // unfollow
      const unfollowResponse = await request(app)
        .delete("/unfollowUser")
        .set('Cookie', cookieOne)
        .send({ targetID: userTwoId });

      expect(unfollowResponse.statusCode).toBe(400);
      expect(unfollowResponse.body).toHaveProperty("message");
      expect(unfollowResponse.body.message).toBe("Unable to unfollow user.");
    });
  });

  describe("SOCIAL013 - Unfollowing a user with no cookie set", () => {
    test("Should return 401 response with error message", async () => {
      // unfollow user
      const unfollowResponse = await request(app)
        .delete("/unfollowUser")
        .send({
          targetID: "",
        });

      expect(unfollowResponse.statusCode).toBe(401);
      expect(unfollowResponse.body).toHaveProperty("message");
      expect(unfollowResponse.body.message).toBe("User is missing cookie!");
    });
  });

  describe("SOCIAL014 - Unfollowing a user with no token", () => {
    test("Should return 401 response with error message", async () => {
      // modify the cookie (if needed)
      let testCookie = cookieOne;
      testCookie = testCookie.split('=')[0];

      // unfollow user
      const unfollowResponse = await request(app)
        .delete("/unfollowUser")
        .set('Cookie', testCookie)
        .send({
          targetID: "",
        });

      expect(unfollowResponse.statusCode).toBe(401);
      expect(unfollowResponse.body).toHaveProperty("message");
      expect(unfollowResponse.body.message).toBe("No Token Found");
    });
  });

  describe("SOCIAL015 - Unfollowing a user with an invalid token", () => {
    test("Should return 401 response with error message", async () => {
      // modify the cookie (if needed)
      let testCookie = cookieOne;
      testCookie = testCookie.replace('=', '=randomString');

      // unfollow user
      const unfollowResponse = await request(app)
        .delete("/unfollowUser")
        .set('Cookie', testCookie)
        .send({
          targetID: "",
        });

      expect(unfollowResponse.statusCode).toBe(401);
      expect(unfollowResponse.body).toHaveProperty("message");
      expect(unfollowResponse.body.message).toBe("invalid token");
    });
  });

  describe("SOCIAL016 - Unfollowing a user with an invalid signature", () => {
    test("Should return 401 response with error message", async () => {
      // modify the cookie (if needed)
      let testCookie = cookieOne;

      // unfollow user
      const unfollowResponse = await request(app)
        .delete("/unfollowUser")
        .set('Cookie', testCookie + 'randomString')
        .send({
          targetID: "",
        });

      expect(unfollowResponse.statusCode).toBe(401);
      expect(unfollowResponse.body).toHaveProperty("message");
      expect(unfollowResponse.body.message).toBe("invalid signature");
    });
  });

  describe("SOCIAL017 - Attempting to unfollow self", () => {
    test("Should return error code 401 and message", async () => {
      // get target's ID
      const userTwoId = cookieOne.split('=')[0];

      // unfollow
      const unfollowResponse = await request(app)
        .delete("/unfollowUser")
        .set('Cookie', cookieOne)
        .send({ targetID: userTwoId });

      expect(unfollowResponse.statusCode).toBe(401);
      expect(unfollowResponse.body).toHaveProperty("message");
      expect(unfollowResponse.body.message).toBe("Cannot unfollow self.");
    });
  });

  describe("SOCIAL018 - Testing server/unexpected error", () => {
    test("Expect response code in error range", async () => {
      // Spy on pool.query and mock its implementation temporarily
      const querySpy = jest.spyOn(pool, "query");
      querySpy.mockRejectedValue(new Error("Unexpected error!"));

      // modify the cookie (if needed)
      let testCookie = cookieOne;

      // get target's ID
      const userTwoId = cookieTwo.split('=')[0];

      // unfollow
      const unfollowResponse = await request(app)
        .delete("/unfollowUser")
        .set('Cookie', cookieOne)
        .send({ targetID: userTwoId });

      // expected items
      expect(unfollowResponse.statusCode).toBe(500);
      expect(unfollowResponse._body.message).toBe("Unexpected error!");

      // restore the original implementation after the test
      querySpy.mockRestore();
    });
  });
});
