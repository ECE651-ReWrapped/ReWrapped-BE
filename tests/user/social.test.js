const request = require("supertest"); // jest w/ supertest
const app = require("../../app");
const jwt = require("jsonwebtoken");
const pool = require("../../db");

// Jest hook to run after tests have completed
afterAll(async () => {
  // Close the pool
  await pool.end();
});

describe("POST /followUser (testing following a user )", () => {
  describe("Testing successful follow", () => {
    test("Should return 200 response code with successful follow message", async () => {
      // create test users
      const emailOne = "testOne@gmail.com";
      const emailTwo = "testTwo@gmail.com";

      const regOne = await request(app).post("/register").send({
        email: emailOne,
        name: "testOne",
        password: "test1234",
        confirmPassword: "test1234",
      });

      const regTwo = await request(app).post("/register").send({
        email: emailTwo,
        name: "testTwo",
        password: "test1234",
        confirmPassword: "test1234",
      });

      // grab cookies
      const cookieOne = regOne.headers['set-cookie'];
      const cookieTwo = regTwo.headers['set-cookie'];

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

      await request(app).delete("/delete").send({ email: emailOne });
      await request(app).delete("/delete").send({ email: emailTwo });
    });
  });

  describe("Following a user with no cookie set", () => {
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

  
});

describe("DELETE /unfollowUser (testing unfollowing a user )", () => {
  describe("Testing successful unfollow", () => {
    test("Should return 200 response code with successful unfollow message", async () => {
      // create test users
      const emailOne = "testThree@gmail.com";
      const emailTwo = "testFour@gmail.com";

      const regOne = await request(app).post("/register").send({
        email: emailOne,
        name: "testThree",
        password: "test1234",
        confirmPassword: "test1234",
      });

      const regTwo = await request(app).post("/register").send({
        email: emailTwo,
        name: "testFour",
        password: "test1234",
        confirmPassword: "test1234",
      });

      // grab cookies
      const cookieOne = regOne.headers['set-cookie'];
      const cookieTwo = regTwo.headers['set-cookie'];

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

      // clean-up
      await request(app).delete("/delete").send({ email: emailOne });
      await request(app).delete("/delete").send({ email: emailTwo });
    });
  });


});
