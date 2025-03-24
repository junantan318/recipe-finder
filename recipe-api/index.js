require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");


const app = express(); // ✅ Define app FIRST

app.use(cors());
app.use(express.json());

const mongoose = require("mongoose");

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

app.get("/api/recipes", async (req, res) => {
  const ingredient = req.query.ingredient;

  if (!process.env.TASTY_API_KEY) {
    return res.status(500).json({ error: "Missing Tasty API key." });
  }

  const apiUrl = `https://tasty.p.rapidapi.com/recipes/list?from=0&size=10&q=${ingredient}`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": process.env.TASTY_API_KEY,
        "X-RapidAPI-Host": "tasty.p.rapidapi.com",
      },
    });

    const data = await response.json();

    const results = data.results.map((item, index) => ({
      id: item.id || index,
      title: item.name || "Untitled",
      image: item.thumbnail_url || "",
      sourceUrl: item.original_video_url || "#",
    }));

    res.json({ results });
  } catch (err) {
    console.error("🔥 Tasty Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch recipes from Tasty." });
  }
});
app.post("/api/chat", async (req, res) => {
    const API_KEY = process.env.COHERE_API_KEY;
  
    if (!API_KEY) {
      console.error("🚨 Cohere API key is missing!");
      return res.status(500).json({ error: "Cohere API key missing" });
    }
  
    try {
      const { ingredients } = req.body;
  
      if (!ingredients || ingredients.length === 0) {
        return res.status(400).json({ error: "No ingredients provided" });
      }
  
      const prompt = `
        I have the following ingredients: ${ingredients.join(", ")}.
        Suggest a creative recipe I can make with these.
        Provide a recipe name, a short description, and key preparation steps.
      `;
  
      const response = await fetch("https://api.cohere.ai/v1/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "command",
          prompt,
          max_tokens: 300,
        }),
      });
  
      if (!response.ok) {
        console.error("Cohere API Error:", await response.text());
        return res.status(500).json({ error: "Cohere API request failed" });
      }
  
      const data = await response.json();
      res.json({ reply: data.generations[0]?.text?.trim() });
    } catch (error) {
      console.error("API Error:", error);
      res.status(500).json({ error: "Failed to generate recipe" });
    }
  });
  
  const PORT = process.env.PORT || 10000;

console.log("🌐 Attempting to bind to port:", PORT);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});

//register
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashedPassword });
    res.status(201).json({ message: "User registered", userId: user._id });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

//login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

