// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fetch = require("node-fetch");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/recipes", async (req, res) => {
  const ingredient = req.query.ingredient;

  if (!process.env.SPOONACULAR_API_KEY) {
    return res.status(500).json({ error: "Missing Spoonacular API key." });
  }

  try {
    const apiUrl = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredient}&number=6&apiKey=${process.env.SPOONACULAR_API_KEY}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    res.json({ results: data });
  } catch (err) {
    console.error("🔥 Recipe Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch recipes." });
  }
});

app.post("/api/chat", async (req, res) => {
  const ingredients = req.body.ingredients;

  if (!ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: "No ingredients provided." });
  }

  // Example mock AI response
  const fakeReply = `Based on your ingredients (${ingredients.join(", ")}), try making a delicious stew!`;

  res.json({ reply: fakeReply });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
