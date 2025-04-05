"use client";

import { useState,useEffect } from "react";
import { Search, Trash2, PlusCircle, XCircle, Loader, User } from "lucide-react";
import Image from "next/image";
import Link from 'next/link';


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
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => {
    setOpenId(prev => (prev === id ? null : id));
  };


  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
  
    fetch('/api/ingredients', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async res => {
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setSavedIngredients(data.ingredients || []);
      })
      .catch(err => {
        console.error("Failed to load ingredients:", err);
      });
  }, []);
  
  const saveFavorite = async (recipe) => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(recipe)
    });
  
    if (res.ok) {
      alert("✅ Recipe saved to favorites!");
    } else {
      alert("❌ Failed to save. Please try again.");
    }
  };
  
  

  // ✅ Fetch Recipes from API
  const fetchRecipes = async () => {
    if (savedIngredients.length === 0) {
      setError("Please add at least one ingredient!");
      return;
    }
  
    setLoading(true);
    setError("");
  
    // ✅ Define baseUrl inside the function
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  
    const ingredientQuery = savedIngredients.join(",");
  
    try {
      console.log("🔍 Fetching from Local API:", `${baseUrl}/api/recipes?ingredient=${ingredientQuery}`);
  
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
      console.error("🚨 Fetch Error:", error);
      setError("Failed to fetch recipes. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  

  // ✅ Add an ingredient to the saved list
  const addIngredient = () => {
    if (query.trim() && !savedIngredients.includes(query.toLowerCase())) {
      const updated = [...savedIngredients, query.toLowerCase()];
      updateIngredients(updated);
      setQuery(""); // ✅ Clears input after adding
    }
  };

  // ✅ Remove a single ingredient
  const removeIngredient = (ingredient: string) => {
    const updated = savedIngredients.filter((item) => item !== ingredient);
    updateIngredients(updated);

  };

  const updateIngredients = (ingredients: string[]) => {
    setSavedIngredients(ingredients);
    const token = localStorage.getItem('token');
    fetch('/api/ingredients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ingredients }),
    });
  };
  

  // ✅ Clear all ingredients
  const clearIngredients = () => {
    setSavedIngredients([]);
  };

  // ✅ Function to ask AI (Cohere) for a recommended recipe
  const askAiForRecipe = async () => {
    if (savedIngredients.length === 0) {
      setAiRecipe("Please add ingredients first!");
      return;
    }
    
  
    setAiLoading(true);
    setAiRecipe(null);
  
    // ✅ Define baseUrl inside the function
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  
    try {
      console.log("🔍 Sending request to AI:", `${baseUrl}/api/chat`);
  
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST", // ✅ Ensure this is POST
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: savedIngredients }),
      });
  
      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }
  
      const data = await response.json();
      setAiRecipe(data.reply);
    } catch (error) {
      console.error("🚨 AI Fetch Error:", error);
      setAiRecipe("Sorry, I couldn't generate a recipe.");
    } finally {
      setAiLoading(false);
    }
  };
  
  return (
  <div className="flex flex-col min-h-screen pt-[72px]">  {/* push content below navbar */}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar for Saved Ingredients */}
        <div className="w-80 bg-white border-r border-gray-200 p-6 space-y-6 overflow-y-auto">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Saved Ingredients</h3>

          {savedIngredients.length === 0 ? (
            <p className="text-gray-500 text-center">No ingredients saved</p>
          ) : (
            <>
              <div className="space-y-3">
                {savedIngredients.map((ingredient) => (
                  <div 
                    key={ingredient} 
                    className="flex justify-between items-center bg-blue-50 p-3 rounded-lg shadow-sm hover:bg-blue-100 transition-colors"
                  >
                    <span className="text-gray-700 flex-grow">{ingredient}</span>
                    <button 
                      onClick={() => removeIngredient(ingredient)} 
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Clear All Button */}
              <button
                onClick={clearIngredients}
                className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <XCircle className="w-5 h-5" />
                <span>Clear All</span>
              </button>
            </>
          )}
          <hr className="my-4 border-gray-300" />

<Link
  href="/favorites"
  className="block bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-center transition-colors"
>
  ❤️ View Favorites
</Link>


          {/* AI Recommendation Section */}
          <button
            onClick={askAiForRecipe}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg mt-4 flex items-center justify-center space-x-2 transition-colors"
          >
            {aiLoading ? <Loader className="w-5 h-5 animate-spin" /> : "AI Recommend"}
          </button>

          {/* Display AI Recommendation */}
          {aiRecipe && (
            <div className="bg-blue-50 p-4 rounded-lg shadow-md mt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">🤖 AI Suggested Recipe:</h3>
              <p className="text-gray-700 whitespace-pre-line">{aiRecipe}</p>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 bg-blue-50 overflow-y-auto">
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">🍽️ Recipe Finder</h2>

            {/* Search Input + Add Ingredient Button */}
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="Enter an ingredient..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addIngredient();
                }}
                className="flex-1 border border-gray-300 p-3 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button 
                onClick={addIngredient} 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <PlusCircle className="w-5 h-5" /> 
                <span className="hidden md:inline">Add</span>
              </button>
              <button 
                onClick={fetchRecipes} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Search className="w-5 h-5" />
                <span className="hidden md:inline">{loading ? "Searching..." : "Search"}</span>
              </button>
            </div>

            {/* Display Error Message */}
            {error && <p className="text-red-500 text-lg text-center">{error}</p>}

            {/* Recipe Results */}
            
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {recipes.map((recipe) => (
    <div
      key={recipe.id}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition cursor-pointer"
    >
      <div onClick={() => toggle(recipe.id)}>
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-48 object-cover rounded-t-xl"
        />
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 truncate">
            {recipe.title}
          </h3>
        </div>
      </div>

      {openId === recipe.id && (
        <div className="border-t border-gray-200 p-4 space-y-2">
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-600 hover:underline"
          >
            🔗 View Full Recipe
          </a>
          <button onClick={() => saveFavorite(recipe)}>❤️ Save to Favorites</button>
        </div>
      )}
    </div>
  ))}
</div>
</div>
</div>

        </div>
      </div>
  );
}
