"use client";

import { useState, useEffect } from "react";
import { Search, Trash2, PlusCircle, XCircle, Loader } from "lucide-react";
import ProfilePage from "@/components/auth/ProfilePage";
import LoginPage from "@/components/auth/LoginPage";
import RegisterPage from "@/components/auth/RegisterPage";


// ✅ Define a TypeScript interface for recipes
interface Recipe {
  id: string;
  title: string;
  image: string;
  sourceUrl: string;
  ingredients: string[];
}

export default function RecipeFinder() {
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiRecipe, setAiRecipe] = useState<string | null>(null); // AI-generated recipe
  const [aiLoading, setAiLoading] = useState(false); // AI loading state
  const [savedIngredients, setSavedIngredients] = useState<string[]>([]);
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);
  const [exclude, setExclude] = useState("");
  const [diet, setDiet] = useState("");
  const [type, setType] = useState("");
  const [tags, setTags] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showingFavorites, setShowingFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Recipe[]>([]);


  
  // Add useEffect hook to set body and html to fullscreen
  useEffect(() => {
    // Remove default margins and padding from body and html
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.width = '100vw';
    document.body.style.height = '100vh';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.width = '100vw';
    document.documentElement.style.height = '100vh';
    
    // Clean up function
    return () => {
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.overflow = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.documentElement.style.margin = '';
      document.documentElement.style.padding = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.width = '';
      document.documentElement.style.height = '';
    };
  }, []);
  
  const toggle = (recipe: Recipe) => {
    const isSame = openRecipe?.id === recipe.id;
    setOpenRecipe(isSame ? null : recipe);
  
    if (!isSame) {
      setTimeout(() => {
        const el = document.getElementById("expanded-recipe");
        if (!el) return;
      
        const rect = el.getBoundingClientRect();
        const isOutOfView = rect.top < 0 || rect.bottom > window.innerHeight;
      
        if (isOutOfView) {
          const isMobile = window.innerWidth < 1024;
      
          if (isMobile) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          } else {
            const scrollOffset = window.pageYOffset + rect.top - window.innerHeight / 3;
            window.scrollTo({ top: scrollOffset, behavior: "smooth" });
          }
        }
      }, 100);
    }
  };

  const handleSaveFavorite = () => {
    if (!openRecipe?.ingredients?.length) {
      alert("⚠️ Please open the recipe first to load ingredients.");
      return;
    }
    saveFavorite(openRecipe);
  };
  
  
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
  
    fetch("/api/ingredients", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
  
        // Normalize to names if using Ingredient model
        const names = Array.isArray(data)
          ? data.map((item: { name: string }) => item.name)
          : data.ingredients || [];
  
        setSavedIngredients(names);
      })
      .catch((err) => {
        console.error("❌ Failed to load saved ingredients:", err);
      });
  }, []);
  
  const saveFavorite = async (recipe: Recipe) => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      console.warn("Skipping save — recipe has no ingredients.");
      return;
    }
  
    const token = localStorage.getItem("token");
  
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: recipe.id,
      }),      
    });
  
    if (res.ok) {
      alert("✅ Recipe saved to favorites!");
  
      if (showingFavorites) {
        setFavorites((prev) => {
          const alreadyExists = prev.some((fav) => fav.id === recipe.id);
          return alreadyExists ? prev : [...prev, recipe];
        });
      }
    } else {
      alert("❌ Failed to save. Please try again.");
    }
  };
  
  
  
  // ✅ Fetch Recipes from API
  const fetchRecipes = async () => {
    if (
      savedIngredients.length === 0 &&
      !diet &&
      !type &&
      !tags &&
      !exclude
    ) {
      setError("Please select at least one filter or ingredient!");
      return;
    }

    setLoading(true);
    setError("");

    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const path = "/api/recipes";
    
    const queryParams = new URLSearchParams({
      ...(savedIngredients.length && { ingredient: savedIngredients.join(",") }),
      ...(diet && { diet }),
      ...(type && { type }),
      ...(tags && { tags }),
      ...(exclude && { exclude }),
    }).toString();

    try {
      console.log("🔍 Fetching from:", `${baseUrl}${path}?${queryParams}`);

      const response = await fetch(`${baseUrl}${path}?${queryParams}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        setError("No recipes found! Try different filters.");
        setRecipes([]);
        return;
      }
      
      const updatedRecipes = data.map((recipe: Recipe) => ({
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        sourceUrl: recipe.sourceUrl,
        ingredients: recipe.ingredients || [],
      }));
      
      setRecipes(updatedRecipes);
    } catch (error) {
      console.error("🚨 Fetch Error:", error);
      setError("Failed to fetch recipes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const excludeOptions = savedIngredients.filter(i => i !== "").map(i => ({ label: i, value: i }));

  const ExcludeDropdown = () => (
    <select
      value={exclude}
      onChange={(e) => setExclude(e.target.value)}
      className="flex-1 border border-gray-300 p-2 rounded-lg text-sm"
    >
      {excludeOptions.length === 0 ? (
        <option value="">No ingredients available to exclude</option>
      ) : (
        <>
          <option value="">Exclude Ingredient</option>
          {excludeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </>
      )}
    </select>
  );

  // ✅ Add an ingredient to the saved list
  const addIngredient = async () => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed && !savedIngredients.includes(trimmed)) {
      const updated = [...savedIngredients, trimmed];
      setSavedIngredients(updated);
      setQuery(""); // clear input
  
      // POST only the new ingredient
      const token = localStorage.getItem("token");
      await fetch("/api/ingredients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmed }),
      });
    }
  };
  
  // ✅ Remove a single ingredient
  const removeIngredient = async (ingredient: string) => {
    // Update local state
    const updated = savedIngredients.filter((item) => item !== ingredient);
    setSavedIngredients(updated);
  
    // Update DB
    const token = localStorage.getItem("token");
  
    try {
      const response = await fetch("/api/ingredients", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: ingredient }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to delete ingredient");
      }
  
      console.log(`🗑️ Deleted ingredient: ${ingredient}`);
    } catch (err) {
      console.error("❌ Error deleting ingredient:", err);
    }
  };
  
  // ✅ Clear all ingredients
  const clearIngredients = async () => {
    try {
      setSavedIngredients([]); // clear local state

      console.log("🧹 Clearing ingredients...");
      const response = await fetch("/api/ingredients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: [] }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to update saved ingredients in the database.");
      }
  
      console.log("✅ Cleared ingredients in DB.");
    } catch (err) {
      console.error("🚨 Failed to clear ingredients:", err);
    }
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

  const removeFavorite = async (recipeId: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/favorites", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id: recipeId })
      });
  
      if (res.ok) {
        setFavorites((prev) => prev.filter((fav) => fav.id !== recipeId));
      } else {
        console.error("❌ Failed to remove favorite.");
      }
    } catch (err) {
      console.error("🚨 Remove error:", err);
    }
  };
  
  
  return (
    <div className="fixed inset-0 flex flex-col w-screen h-screen overflow-hidden bg-white">
      {showProfile && (
  <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-end">
    <div className="bg-white w-[300px] h-full shadow-lg p-6 relative">
      <button
        onClick={() => setShowProfile(false)}
        className="absolute top-4 right-4 text-red-500 font-bold"
      >
        ✖
      </button>
      <ProfilePage
        onClose={() => setShowProfile(false)}
        onSignInClick={() => {
          setShowProfile(false);
          setShowLogin(true);
        }}
        onRegisterClick={() => {
          setShowProfile(false);
          setShowRegister(true);
        }}
      />
    </div>
  </div>
)}

{showLogin && (
  <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-end">
    <div className="bg-white w-full max-w-md h-full shadow-lg p-6 relative">
      <button
        onClick={() => setShowLogin(false)}
        className="absolute top-4 right-4 text-red-500 font-bold"
      >
        ✖
      </button>
      <LoginPage
        onClose={() => setShowLogin(false)}
        onRegisterClick={() => {
          setShowLogin(false);
          setShowRegister(true);
        }}
      />
    </div>
  </div>
)}

{showRegister && (
  <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-end">
    <div className="bg-white w-full max-w-md h-full shadow-lg p-6 relative">
      <button
        onClick={() => setShowRegister(false)}
        className="absolute top-4 right-4 text-red-500 font-bold"
      >
        ✖
      </button>
      <RegisterPage onClose={() => setShowRegister(false)} />
    </div>
  </div>
)}

      {/* Top Navigation Bar */}
      <div className="w-full bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-white focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">🍽️ Recipe Finder</h1>
        </div>

        <button
onClick={async () => {
  setShowingFavorites(true);
  const token = localStorage.getItem("token");
  const res = await fetch("/api/favorites", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    const result = await res.json();
    const data = Array.isArray(result) ? result : result.favorites || [];
    
    const recipes = await Promise.all(
      data.map(async (fav: { id: string }) => { 
        const res = await fetch(`/api/recipes?id=${fav.id}`);
        return await res.json(); // includes full recipe with ingredients
      })
    );
    setFavorites(recipes);
    

  } else {
    console.error("Failed to load favorites.");
  }
}}

  className="inline-flex items-center bg-white text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
>
  ❤️ My Favorites
</button>

          <button
    onClick={() => setShowProfile(true)}
    className="inline-flex items-center bg-white text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
  >
    👤 Profile
  </button>
      </div>

      <div className="flex flex-1 w-full overflow-hidden">
        {/* Sidebar for Saved Ingredients - Now collapsible on mobile */}
        <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-full md:w-72 lg:w-80 bg-gray-100 border-r border-gray-200 overflow-hidden flex flex-col h-full`}>
          <div className="p-4 flex flex-col h-full overflow-hidden">
            <h3 className="text-xl font-bold text-gray-800 mb-4">My Ingredients</h3>

            {/* Ingredient Input + Add Button */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Add ingredient..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addIngredient();
                }}
                className="flex-1 border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button 
                onClick={addIngredient} 
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center justify-center transition-colors"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {savedIngredients.length === 0 ? (
                <p className="text-gray-500 text-center bg-white p-4 rounded-lg shadow-sm">No ingredients yet</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {savedIngredients.map((ingredient) => (
                      <div 
                        key={ingredient} 
                        className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
                      >
                        <span className="text-gray-700 flex-grow">{ingredient}</span>
                        <button 
                          onClick={() => removeIngredient(ingredient)} 
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {savedIngredients.length > 0 && (
              <button
                onClick={clearIngredients}
                className="w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2 mt-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            )}

            <hr className="my-4 border-gray-300" />

            {/* AI Recommendation Button */}
            <button
              onClick={askAiForRecipe}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg mt-2 flex items-center justify-center space-x-2 transition-colors"
            >
              {aiLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span className="font-medium">🤖 AI Recipe Suggestion</span>
                </>
              )}
            </button>

            {/* Display AI Recommendation */}
            {aiRecipe && (
              <div className="bg-white p-4 rounded-lg shadow-md mt-4 border-l-4 border-purple-500 overflow-y-auto max-h-64">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">🤖 AI Suggested Recipe:</h3>
                <p className="text-gray-700 whitespace-pre-line text-sm">{aiRecipe}</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        {showingFavorites && (
  <button
    onClick={() => setShowingFavorites(false)}
    className="mb-4 bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded"
  >
    ← Back to Search Results
  </button>
)}

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filters Section - Now full width and more compact */}
          <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
                className="border border-gray-300 p-2 rounded-lg text-sm w-full"
              >
                <option value="">Any Diet</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="gluten_free">Gluten Free</option>
              </select>

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="border border-gray-300 p-2 rounded-lg text-sm w-full"
              >
                <option value="">Any Type</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
                <option value="dessert">Dessert</option>
              </select>

              <select
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="border border-gray-300 p-2 rounded-lg text-sm w-full"
              >
                <option value="">Any Theme</option>
                <option value="under_30_minutes">Under 30 Minutes</option>
                <option value="easy">Easy</option>
                <option value="healthy">Healthy</option>
              </select>

              <ExcludeDropdown />
            </div>
            
            <button 
              onClick={fetchRecipes} 
              className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span className="font-medium">Find Recipes</span>
                </>
              )}
            </button>
          </div>

          {/* Main scrollable content area */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Display Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Recipe Results - Now using a more efficient grid layout */}
            {(showingFavorites ? favorites : recipes).length > 0 && (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {(showingFavorites ? favorites : recipes).map((recipe) => (
      <div
        key={recipe.id}
        className="bg-white rounded-xl shadow-md hover:shadow-lg transition cursor-pointer flex flex-col overflow-hidden border border-gray-200"
      >
        <div
          className="cursor-pointer h-full flex flex-col"
          onClick={() => toggle(recipe)}
        >
          <div className="h-48 overflow-hidden">
            <img
              src={recipe.image}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-3 flex-1 flex flex-col">
            <h3 className="text-md font-semibold text-gray-800 line-clamp-2">
              {recipe.title}
            </h3>
            <div className="mt-2 text-xs text-gray-500">
              {recipe.ingredients?.length ?? 0} ingredients
            </div>
            <button className="mt-auto text-sm text-blue-600">View Details →</button>
          </div>
        </div>
      </div>
    ))}
  </div>
)}

            {/* Empty state for when no recipes have been searched yet */}
            {recipes.length === 0 && !loading && !error && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-6xl mb-4">🍳</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to find recipes?</h3>
                <p className="text-gray-500 max-w-md">
                  Add ingredients from your kitchen and click "Find Recipes" to discover meals you can make right now!
                </p>
              </div>
            )}
            
            {/* Loading state */}
            {loading && (
              <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center">
                  <Loader className="w-10 h-10 text-blue-600 animate-spin" />
                  <p className="mt-4 text-gray-600">Searching for perfect recipes...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Recipe Details */}
      {openRecipe && (
        <div 
          id="expanded-recipe"
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setOpenRecipe(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-3xl w-full max-h-screen overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-64 w-full">
              <img
                src={openRecipe.image}
                alt={openRecipe.title}
                className="w-full h-full object-cover"
              />
              <button 
                onClick={() => setOpenRecipe(null)}
                className="absolute top-3 right-3 bg-black bg-opacity-50 text-white rounded-full p-2"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">
                {openRecipe.title}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg text-gray-700">Ingredients</h4>
                  <div className="space-y-2">
                    {openRecipe.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {savedIngredients.includes(ing.toLowerCase()) ? (
                          <span className="text-green-500">✓</span>
                        ) : (
                          <span className="text-red-500">✗</span>
                        )}
                        <span>{ing}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg text-gray-700">Summary</h4>
                  <p className="text-green-700 text-sm">
                    ✅ You have:{" "}
                    {openRecipe.ingredients
                      .filter((ing) =>
                        savedIngredients.includes(ing.toLowerCase())
                      )
                      .join(", ") || "None"}
                  </p>
                  <p className="text-red-600 text-sm">
                    ❌ You need:{" "}
                    {openRecipe.ingredients
                      .filter((ing) =>
                        !savedIngredients.includes(ing.toLowerCase())
                      )
                      .join(", ") || "None"}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mt-4">
                    <a
                      href={openRecipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      View Full Recipe
                    </a>
                    {showingFavorites ? (
  <button
  onClick={() => removeFavorite(openRecipe.id)}
    className="bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400 transition"
  >
    💔 Remove from Favorites
  </button>
) : (
  <button onClick={handleSaveFavorite}
    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
  >
    ❤️ Save to Favorites
  </button>
)}

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}