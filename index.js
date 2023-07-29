const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

// Organize dependencies and imports
app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("mongodb is connected ...");
  } catch (err) {
    console.error("mongodb is not connected ...");
  }
})();

// Define schemas and models
const userSchema = new mongoose.Schema({
  username: String,
});
const User = mongoose.model("User", userSchema);

const exercisesSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  description: String,
  duration: Number,
  date: Date,
});
const Exercises = mongoose.model("Exercise", exercisesSchema);

// Define routes
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    if (!users.length) return res.status(404).json({ error: "No users found" });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Error fetching users" });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;
    const user = new User({ username });
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Error creating user" });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const exercises = new Exercises({
      user_id: user._id,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });

    const result = await exercises.save();

    res.json({
      _id: user._id,
      username: user.username,
      date: new Date(result.date).toDateString(),
      duration: result.duration,
      description: result.description,
    });
  } catch (err) {
    res.status(500).json({ error: "Error saving exercise" });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const { _id } = req.params;
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    let dateObj = {};
    if (from) {
      dateObj["$gte"] = new Date(from);
    }
    if (to) {
      dateObj["$lte"] = new Date(to);
    }
    let filter = {
      user_id: _id,
    };
    if (from || to) {
      filter.date = dateObj;
    }

    const exercises = await Exercises.find(filter).limit(+limit || 5000);
    const log = exercises.map((e) => ({
      description: e.description.toString(),
      duration: parseInt(e.duration),
      date: e.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log,
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching exercise logs" });
  }
});

// Start the server
const port = process.env.PORT || 3001;
const listener = app.listen(port, () => {
  console.log("Your app is listening on port " + port);
});
