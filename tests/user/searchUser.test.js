const { searchUser } = require("../../controllers/userControllers");

//Mock DB calls
const pool = require("../../db");

jest.mock("../../db", () => ({
  query: jest.fn(),
}));

describe("searchUser", () => {
  it("Should return 200 and a list of users", async () => {
    //Mocking Pool.query
    const users = [
      { id: 1, user_name: "testing", user_email: "testing@gmail.com" },
    ];
    pool.query.mockResolvedValue({ rows: users });

    const req = {
      body: {
        query: "John",
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await searchUser(req, res);

    //Assertions
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(users);
  });

  it("Should return 500 on error", async () => {
    pool.query.mockRejectedValue(new Error("Database Error"));

    const req = {
      body: {
        query: "error",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await searchUser(req, res);

    //Assertions
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Server Error");
  });
});
