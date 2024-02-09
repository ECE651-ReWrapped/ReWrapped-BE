require("dotenv").config(); // should be the first thing that runs
const PORT = process.env.DATABASE_PORT || 5000; // Fallback to 5000 if DATABASE_PORT is not defined

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(cookieParser());
app.use(express.json());

app.use("/", userRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
