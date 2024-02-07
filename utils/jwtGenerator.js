const jwt = require("jsonwebtoken");

const jwtGenerator = (user_id) => {
  const payload = {
    user: {
      id: user_id,
    },
  };

  return jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: "1hr" });
};

module.exports = jwtGenerator;
