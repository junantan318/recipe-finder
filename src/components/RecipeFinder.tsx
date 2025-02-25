"use client";

import { useState } from "react";
import { Search, Trash2, PlusCircle, XCircle, Loader } from "lucide-react";
import Image from "next/image";

// ✅ Define a TypeScript interface for recipes
interface Recipe {
  id: string;
  title: string;
  image: string;
  sourceUrl: string;
}

export default function RecipeFinder() {
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiRecipe, setAiRecipe] = useState<string | null>(null); // AI-generated recipe
  const [aiLoading, setAiLoading] = useState(false); // AI loading state

  const [savedIngredients, setSavedIngredients] = useState<string[]>([]);

  // ✅ Fetch Recipes from API
  const fetchRecipes = async () => {
    if (savedIngredients.length === 0) {
      setError("Please add at least one ingredient!");
      return;
    }
  
    setLoading(true);
    setError("");
  
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"; // ✅ Define baseUrl
    const ingredientQuery = savedIngredients.join(",");
  
    try {
      console.log("Fetching from Local API:", `${baseUrl}/api/recipes?ingredient=${ingredientQuery}`);
  
      const response = await fetch(`${baseUrl}/api/recipes?ingredient=${ingredientQuery}`);
  
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
  
      const data = await response.json();
  
      if (!data.results || data.results.length === 0) {
        setError("No recipes found! Try different ingredients.");
        setRecipes([]);
        return;
      }
  
      const updatedRecipes = data.results.map((recipe: Recipe) => ({
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        sourceUrl: recipe.sourceUrl,
      }));
  
      setRecipes(updatedRecipes);
    } catch (error) {
      console.error("Fetch Error:", error);
      setError("Failed to fetch recipes. Please try again.");
    }
  
    setLoading(false);
  };

  // ✅ Add an ingredient to the saved list
  const addIngredient = () => {
    if (query.trim() && !savedIngredients.includes(query.toLowerCase())) {
      setSavedIngredients([...savedIngredients, query.toLowerCase()]);
      setQuery(""); // ✅ Clears input after adding
    }
  };

  // ✅ Remove a single ingredient
  const removeIngredient = (ingredient: string) => {
    setSavedIngredients(savedIngredients.filter((item) => item !== ingredient));
  };

  // ✅ Clear all ingredients
  const clearIngredients = () => {
    setSavedIngredients([]);
  };

  // ✅ Function to ask AI (Cohere) for a recommended recipe
  const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"; // ✅ Define baseUrl

  const askAiForRecipe = async () => {
    if (savedIngredients.length === 0) {
      setAiRecipe("Please add ingredients first!");
      return;
    }
  
    setAiLoading(true);
    setAiRecipe(null);
  
    try {
      const response = await fetch(`${baseUrl}/api/chat`, { // ✅ Now baseUrl is defined
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: savedIngredients }),
      });
  
      const data = await response.json();
      setAiRecipe(data.reply);
    } catch (error) {
      console.error("Error fetching AI recipe:", error);
      setAiRecipe("Sorry, I couldn't generate a recipe.");
    }
  
    setAiLoading(false);
  };
  

  return (
    <div className="flex">
      {/* Sidebar for Saved Ingredients */}
      <div className="w-80 min-h-screen bg-gray-100 shadow-md p-4">
        <h3 className="text-xl font-semibold mb-4">Saved Ingredients</h3>

        {savedIngredients.length === 0 ? (
          <p className="text-gray-500">No ingredients saved</p>
        ) : (
          <>
            <ul className="space-y-2">
              {savedIngredients.map((ingredient) => (
                <li key={ingredient} className="flex justify-between items-center bg-white p-2 rounded-lg shadow">
                  <span className="text-gray-800">{ingredient}</span>
                  <button onClick={() => removeIngredient(ingredient)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
            {/* Clear All Button */}
            <button
              onClick={clearIngredients}
              className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg mt-4 flex items-center gap-2 justify-center"
            >
              <XCircle className="w-5 h-5" />
              Clear All
            </button>
          </>
        )}

        {/* AI Recommendation Section */}
        <button
          onClick={askAiForRecipe}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg mt-4 flex items-center gap-2"
        >
          {aiLoading ? <Loader className="w-5 h-5 animate-spin" /> : "AI Recommend"}
        </button>

        {/* Display AI Recommendation */}
        {aiRecipe && (
          <div className="bg-gray-100 p-4 rounded-lg shadow-md mt-4 text-left">
            <h3 className="text-lg font-semibold">🤖 AI Suggested Recipe:</h3>
            <p className="text-gray-800 whitespace-pre-line">{aiRecipe}</p>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto p-6 bg-white shadow-lg rounded-lg mt-10 text-center flex-1">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">🍽️ Recipe Finder</h2>

        {/* ✅ Search Input + Add Ingredient Button */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="Enter an ingredient..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addIngredient();
            }}
            className="flex-1 border border-gray-300 p-3 rounded-lg text-lg focus:outline-none"
          />
          <button onClick={addIngredient} className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center gap-2">
            <PlusCircle className="w-5 h-5" /> Add
          </button>
          <button onClick={fetchRecipes} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg">
            <Search className="w-5 h-5" />
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : "Search"}
          </button>
        </div>

        {/* Display Error Message */}
        {error && <p className="text-red-500 text-lg">{error}</p>}

        {/* Recipe Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="bg-gray-100 p-4 rounded-lg shadow-md">
              <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                <Image src={recipe.image} alt={recipe.title} width={500} height={300} className="rounded-lg w-full h-48 object-cover" />
                <h3 className="text-lg font-semibold mt-3 text-gray-800">{recipe.title}</h3>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
