require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express(); // ✅ Define app FIRST

app.use(cors());
app.use(express.json());

// ✅ Now it's safe to define routes


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
  const ingredients = req.body.ingredients;

  if (!ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: "No ingredients provided." });
  }

  const fakeReply = `Based on your ingredients (${ingredients.join(", ")}), try making a delicious stew!`;

  res.json({ reply: fakeReply });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
