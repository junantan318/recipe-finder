"use client";

import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  ForwardedRef,
} from "react";
import { Search, Trash2, PlusCircle, XCircle, Loader } from "lucide-react";
import ProfilePage from "@/components/auth/ProfilePage";
import LoginPage from "@/components/auth/LoginPage";
import RegisterPage from "@/components/auth/RegisterPage";
import AIPage from "@/components/auth/AIPage";
import { ArrowLeft } from "lucide-react";
import Fuse from "fuse.js";

interface Recipe {
  id: string;
  title: string;
  image: string;
  sourceUrl: string;
  ingredients: string[];
  cuisine?: string;
  category?: string;
  diet?: string;
  usesExpiring?: boolean;
}

type IngredientEntry = {
  name: string;
  expires: string;
};

interface RecipeFinderProps {
  onLoginSuccess?: () => void;
  onLogoutSuccess?: () => void;
}

// ✅ 👇 START the component using forwardRef
const RecipeFinder = forwardRef(function RecipeFinder(
  _props: RecipeFinderProps,
  ref: ForwardedRef<any>
) {

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiRecipe, setAiRecipe] = useState<string | null>(null); // AI-generated recipe
  const [aiLoading, setAiLoading] = useState(false); // AI loading state
  type IngredientEntry = {
    name: string;
    expires: string; // ISO date string
  };

  const [savedIngredients, setSavedIngredients] = useState<IngredientEntry[]>([]);

  {savedIngredients.map((item, idx) => {
    const today = new Date();
    const expiry = new Date(item.expires);
    const isToday = expiry.toDateString() === today.toDateString();
    let color = "bg-green-500", text = "Fresh";
    if (expiry < today && !isToday) {
      color = "bg-red-500";
      text = "Expired";
    } else if (isToday) {
      color = "bg-yellow-400";
      text = "Nearly Expired";
    }
    
  
    return (
      <div key={idx} className="flex items-center justify-between p-2 border-b">
        <div>
          {item.name}
          <span className={`ml-2 px-2 py-1 rounded-full text-xs text-white ${color}`}>
  {text}
</span>
        </div>
      </div>
    );
  })}
  

  const [ingredientInput, setIngredientInput] = useState("");
  const [expiryInput, setExpiryInput] = useState("");
  
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);
  const [exclude, setExclude] = useState("");
  const [diet, setDiet] = useState("");
  const [type, setType] = useState("");
  const [tags, setTags] = useState("");
  const [prioritizeExpiring, setPrioritizeExpiring] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [closingProfile, setClosingProfile] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [showingAIChat, setShowingAIChat] = useState(false);
  const [activeView, setActiveView] = useState<"default" | "favorites" | "ai">("default");



  const refreshData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
  
    try {
      // Re-fetch ingredients
      const ingRes = await fetch("/api/ingredients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ingredients = await ingRes.json();
      setSavedIngredients(Array.isArray(ingredients) ? ingredients : []);
  
      // Re-fetch favorites
      const favRes = await fetch("/api/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await favRes.json();
      const data = Array.isArray(result) ? result : result.favorites || [];
  
      const enhanced = data.map((recipe: Recipe) => ({
        ...recipe,
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        usesExpiring: recipe.ingredients?.some((ing: string) =>
          ingredients.some((i: any) =>
            ing.toLowerCase().includes(i.name.toLowerCase())
          )
        )
      }));
  
      setFavorites(enhanced);
    } catch (err) {
      console.error("🔄 Refresh error:", err);
    }
  }; 

  const filteredRecipes = recipes.filter((recipe) => {
    const excludedIngredient = exclude.split("-")[0].toLowerCase();
  
    const matchesIngredients =
    savedIngredients.length === 0 ||
    (Array.isArray(recipe.ingredients) &&
      savedIngredients.some((ingredient) =>
        recipe.ingredients.some((ing) =>
          ing.toLowerCase().includes(ingredient.name.toLowerCase())
        )
      ));
  
  
    const matchesDiet = !diet || (
      Array.isArray(recipe.diet)
        ? recipe.diet.some(d => d.toLowerCase().includes(diet.toLowerCase()))
        : typeof recipe.diet === "string" &&
          recipe.diet.toLowerCase().includes(diet.toLowerCase())
    );
  
    const matchesCategory = !type || (
      Array.isArray(recipe.category)
        ? recipe.category.some(c => c.toLowerCase().includes(type.toLowerCase()))
        : typeof recipe.category === "string" &&
          recipe.category.toLowerCase().includes(type.toLowerCase())
    );
  
    const matchesTags = !tags || (
      Array.isArray(recipe.cuisine)
        ? recipe.cuisine.some(c => c.toLowerCase().includes(tags.toLowerCase()))
        : typeof recipe.cuisine === "string" &&
          recipe.cuisine.toLowerCase().includes(tags.toLowerCase())
    );
  
    const doesNotContainExcluded =
      !exclude ||
      !recipe.ingredients.some((ing) =>
        ing.toLowerCase().includes(excludedIngredient)
      );
  
    return (
      matchesIngredients &&
      matchesDiet &&
      matchesCategory &&
      matchesTags &&
      doesNotContainExcluded
    );
  });
  
  
  const displayedRecipes = activeView === "favorites"
  ? (filterFavorites
      ? favorites.filter((recipe) => {
          const excludedIngredient = exclude.split("-")[0].toLowerCase();

          const matchesIngredients =
            savedIngredients.length === 0 ||
            (Array.isArray(recipe.ingredients) &&
              savedIngredients.some((ingredient) =>
                recipe.ingredients.some((ing) =>
                  ing.toLowerCase().includes(ingredient.name.toLowerCase())
                )
              ));

          const matchesDiet = !diet || (
            Array.isArray(recipe.diet)
              ? recipe.diet.some((d) =>
                  d.toLowerCase().includes(diet.toLowerCase())
                )
              : typeof recipe.diet === "string" &&
                recipe.diet.toLowerCase().includes(diet.toLowerCase())
          );

          const matchesCategory = !type || (
            Array.isArray(recipe.category)
              ? recipe.category.some((c) =>
                  c.toLowerCase().includes(type.toLowerCase())
                )
              : typeof recipe.category === "string" &&
                recipe.category.toLowerCase().includes(type.toLowerCase())
          );

          const matchesTags = !tags || (
            Array.isArray(recipe.cuisine)
              ? recipe.cuisine.some((c) =>
                  c.toLowerCase().includes(tags.toLowerCase())
                )
              : typeof recipe.cuisine === "string" &&
                recipe.cuisine.toLowerCase().includes(tags.toLowerCase())
          );

          const doesNotContainExcluded =
            !exclude ||
            (Array.isArray(recipe.ingredients) &&
              !recipe.ingredients.some((ing) =>
                ing.toLowerCase().includes(excludedIngredient)
              ));

          return (
            matchesIngredients &&
            matchesDiet &&
            matchesCategory &&
            matchesTags &&
            doesNotContainExcluded
          );
        })
      : favorites)
  : filteredRecipes;





const sortedRecipes = prioritizeExpiring
  ? [...displayedRecipes].sort(
      (a, b) => (b.usesExpiring ? 1 : 0) - (a.usesExpiring ? 1 : 0)
    )
  : displayedRecipes;

  
  

  const knownIngredients = [
    "broccoli", "carrot", "onion", "potato", "chicken",
    "cheese", "lettuce", "tomato", "beef", "spinach",
  ];

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

  const handleCloseProfile = () => {
    setClosingProfile(true);
    setTimeout(() => {
      setShowProfile(false);
      setClosingProfile(false);
    }, 300); // Match duration of slide-out
  };
  
  
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

  const isFavorited = (recipe: Recipe) => {
    return favorites.some((fav) => fav.id === recipe.id);
  };
  

  const handleSaveFavorite = () => {
    if (!openRecipe?.ingredients || !Array.isArray(openRecipe.ingredients) || openRecipe.ingredients.length === 0) {
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
        if (Array.isArray(data)) {
          setSavedIngredients(data); // assumes API returns [{ name, expires }]
        } else {
          setSavedIngredients([]);
        }
        
      })
      .catch((err) => {
        console.error("❌ Failed to load saved ingredients:", err);
      });
  }, []);
  
  const saveFavorite = async (recipe: Recipe) => {
    const token = localStorage.getItem("token");
  
    const fullRecipe = recipe;
  
    if (!Array.isArray(fullRecipe.ingredients) || fullRecipe.ingredients.length === 0) {
      alert("⚠️ This recipe does not include ingredients and cannot be saved.");
      return;
    }
  
    const alreadySaved = favorites.some((fav) => fav.id === fullRecipe.id);
    if (alreadySaved) {
      alert("⚠️ You've already favorited this recipe.");
      return;
    }
  
    try {
      
      const saveRes = await fetch("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fullRecipe),
      });
  
      if (saveRes.ok) {
        alert("✅ Recipe saved to favorites!");
        setFavorites((prev) =>
          prev.some((fav) => fav.id === fullRecipe.id)
            ? prev
            : [...prev, fullRecipe]
        );
        setOpenRecipe(fullRecipe);
      } else {
        alert("❌ Failed to save. Please try again.");
      }
    } catch (error) {
      console.error("🚨 Failed to save favorite:", error);
      alert("❌ Something went wrong trying to save this recipe.");
    }
  };
  
  // ✅ Fetch Recipes from API
  const fetchRecipes = async () => {
    setLoading(true);
    setError("");
  
    try {
      const testUrl = "https://www.allrecipes.com/recipe/24074/alysias-basic-meat-lasagna/";
      const response = await fetch(`/api/recipes?url=${encodeURIComponent(testUrl)}`);
  
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
  
      const data = await response.json();
  
      const updatedRecipes = data.map((recipe: Recipe) => ({
        ...recipe,
        usesExpiring: recipe.ingredients.some((ing) => {
          const match = savedIngredients.find((i) =>
            ing.toLowerCase().includes(i.name.toLowerCase())
          );
          if (!match) return false;
        
          const today = new Date();
          const expiry = new Date(match.expires);
          const isToday = expiry.toDateString() === today.toDateString();
          return expiry < today || isToday;
        }),
        
      }));
  
      setRecipes(updatedRecipes);
    } catch (error) {
      console.error("🚨 Fetch Error:", error);
      setError("Failed to fetch recipes. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  

  const excludeOptions = savedIngredients.map((i, index) => ({
    label: i.name,
    value: `${i.name}-${index}`, // Ensures uniqueness and string keys
  }));
  


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
          <option key="default" value="">Exclude Ingredient</option>
          {excludeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </>
      )}
    </select>
  );

  
  // ✅ Remove a single ingredient
  const removeIngredient = async (ingredient: string) => {
    // Update local state
    const updated = savedIngredients.filter((item) => item.name !== ingredient);
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
  
      const token = localStorage.getItem("token");
      const response = await fetch("/api/ingredients", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // ✅ MUST include token
        },
        body: JSON.stringify({ ingredients: [] }),
      });
  
      const result = await response.json();
      console.log("🧾 Clear result:", result);
  
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

return (<div className="fixed inset-0 flex flex-col w-screen h-screen overflow-hidden bg-white">
{showProfile && (
  <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-end animate-fade-in">
    <div className={`bg-white w-[300px] h-full shadow-lg p-6 relative transition-all duration-300 ${
  closingProfile ? "animate-slide-out-right" : "animate-slide-in-right"
}`}>



      <button
        onClick={handleCloseProfile}
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
  onLogoutSuccess={refreshData} // ✅
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
  onLoginSuccess={refreshData} // ✅
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
      <RegisterPage
  onClose={() => setShowRegister(false)}
  onLoginClick={() => {
    setShowRegister(false);
    setShowLogin(true);
  }}
/>

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
  setActiveView("favorites");

  const token = localStorage.getItem("token");
  const res = await fetch("/api/favorites", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    const result = await res.json();
    const data = Array.isArray(result) ? result : result.favorites || [];

    // Add `usesExpiring` flag like in fetchRecipes()
    const enhanced = data
    .filter((recipe: any) => recipe) // only drop null/undefined
    .map((recipe: Recipe) => {
      const safeIngredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : [];
  
      const usesExpiring = safeIngredients.some((ing) => {
        const match = savedIngredients.find((i) =>
          ing.toLowerCase().includes(i.name.toLowerCase())
        );
        if (!match) return false;
  
        const today = new Date();
        const expiry = new Date(match.expires);
        const isToday = expiry.toDateString() === today.toDateString();
        return expiry < today || isToday;
      });
  
      return {
        ...recipe,
        ingredients: safeIngredients,
        usesExpiring,
      };
    });

    setFavorites(enhanced);
  } else if (res.status === 401) {
    alert("Session expired. Please log in again.");
    localStorage.removeItem("token");
    setShowLogin(true);
  } else {
    console.error("❌ Failed to load favorites.");
  }
}}

  
  className="inline-flex items-center bg-white text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
>
  ❤️ My Favorites
</button>

<button
  onClick={() => {
    setActiveView("ai");
  }}
  className="inline-flex items-center bg-white text-purple-700 hover:bg-purple-100 px-4 py-2 rounded-lg transition-colors"
>
  🧠 AI Chat
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
            <input
  type="text"
  value={ingredientInput}
  placeholder="Ingredient name"
  onChange={(e) => setIngredientInput(e.target.value)}
  className="border p-2 rounded w-1/2"
/>

<input
  type="date"
  value={expiryInput}
  onChange={(e) => setExpiryInput(e.target.value)}
  className="border p-2 rounded w-1/2 mt-2"
/>

<button
  className="bg-blue-500 text-white p-2 rounded mt-2"
  onClick={async () => {
    let name = ingredientInput.trim().toLowerCase();

    const fuse = new Fuse(knownIngredients, { threshold: 0.4 });
const matches = fuse.search(name);
if (matches.length > 0 && matches[0].item.toLowerCase() !== name) {
  const suggested = matches[0].item;
  const confirmReplace = confirm(`Did you mean "${suggested}"?`);

  if (confirmReplace) {
    setIngredientInput(suggested);
    name = suggested.toLowerCase(); // update the variable used later
  } else {
    return;
  }
  
}

    if (!name || !expiryInput) {
      alert("⚠️ Please enter both an ingredient name and an expiration date.");
      return;
    }
  
    const isDuplicate = savedIngredients.some(
      (i) => i.name.trim().toLowerCase() === name
    );
  
    if (isDuplicate) {
      alert("⚠️ This ingredient already exists.");
      return;
    }
  
    const newIngredient = { name, expires: expiryInput };

  
    setSavedIngredients(prev => [...prev, newIngredient]);
    setIngredientInput("");
    setExpiryInput("");
  
    const token = localStorage.getItem("token");
    await fetch("/api/ingredients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newIngredient),
    });
  }}
  
  
  
>
  Add Ingredient
</button>

            <div className="flex-1 overflow-y-auto">
              {savedIngredients.length === 0 ? (
                <p className="text-gray-500 text-center bg-white p-4 rounded-lg shadow-sm">No ingredients yet</p>
              ) : (
                <>
                  <div className="space-y-2">
                  {savedIngredients.map((ingredient, index) => {
  const today = new Date();
  const expiry = new Date(ingredient.expires);
  const isToday = expiry.toDateString() === today.toDateString();
  let color = "bg-green-500", text = "Fresh";
  if (expiry < today && !isToday) {
    color = "bg-red-500";
    text = "Expired";
  } else if (isToday) {
    color = "bg-yellow-400";
    text = "Nearly Expired";
  }
  

  return (
    <div key={`${ingredient.name}-${index}`}
      className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
    >
      <span className="text-gray-700 flex-grow">{ingredient.name}</span>
      <span className={`ml-2 px-2 py-1 rounded-full text-xs text-white ${color}`}>
        {text}
      </span>
      <button onClick={() => removeIngredient(ingredient.name)} className="text-red-500 hover:text-red-700 ml-2">
        <Trash2 size={16} />
      </button>
    </div>
  );
})}

                  </div>
                </>
              )}
            </div>

            <button
  className="bg-red-600 text-white px-3 py-2 rounded mt-4"
  onClick={async () => {
    const now = new Date();
    const filtered = savedIngredients.filter(item => {
      const expiry = new Date(item.expires);
      const isToday = expiry.toDateString() === now.toDateString();
      return expiry > now || isToday;
    });
    
  
    setSavedIngredients(filtered);
  
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/ingredients", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ingredients: filtered }),
      });
  
      if (!res.ok) {
        throw new Error("Failed to update saved ingredients");
      }
  
      console.log("✅ Expired ingredients removed from backend.");
    } catch (err) {
      console.error("❌ Error syncing with backend:", err);
    }
  }}
>
  Clear Expired Ingredients
</button>


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
          </div>
        </div>

        {/* Main Content */}

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filters Section - Now full width and more compact */}
          {activeView === "default" && (
  <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
  {/* Diet */}
  <select
    value={diet}
    onChange={(e) => setDiet(e.target.value)}
    className="border border-gray-300 p-2 rounded-lg text-sm w-full"
  >
    <option value="">Any Diet</option>
    <option value="low calorie">Low Calorie</option>
    <option value="low fat">Low Fat</option>
    <option value="low sodium">Low Sodium</option>
    <option value="gluten free">Gluten Free</option>
    <option value="vegan">Vegan</option>
    <option value="vegetarian">Vegetarian</option>
  </select>

  {/* Category (type) */}
  <select
    value={type}
    onChange={(e) => setType(e.target.value)}
    className="border border-gray-300 p-2 rounded-lg text-sm w-full"
  >
    <option value="">Any Category</option>
    <option value="appetizer">Appetizer</option>
    <option value="main course">Main Course</option>
    <option value="dessert">Dessert</option>
    <option value="snack">Snack</option>
    <option value="breakfast">Breakfast</option>
    <option value="brunch">Brunch</option>
    <option value="dinner">Dinner</option>
  </select>

  {/* Cuisine (previously tags) */}
  <select
    value={tags}
    onChange={(e) => setTags(e.target.value)}
    className="border border-gray-300 p-2 rounded-lg text-sm w-full"
  >
    <option value="">Any Cuisine</option>
    <option value="italian">Italian</option>
    <option value="mexican">Mexican</option>
    <option value="indian">Indian</option>
    <option value="thai">Thai</option>
    <option value="chinese">Chinese</option>
    <option value="french">French</option>
    <option value="mediterranean">Mediterranean</option>
  </select>

  <ExcludeDropdown />
</div>


    <div className="mt-2">
  <label className="inline-flex items-center">
    <input
      type="checkbox"
      checked={prioritizeExpiring}
      onChange={(e) => setPrioritizeExpiring(e.target.checked)}
      className="mr-2"
    />
    <span className="text-sm text-gray-700">
      Prioritize ingredients expiring soon
    </span>
  </label>
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
)}


          {/* Main scrollable content area */}
          <div className="flex-1 overflow-y-auto p-4">
  {activeView === "ai" ? (
    <>
      <button
        onClick={() => 	setActiveView("default")}
        className="text-blue-600 hover:underline flex items-center mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Recipes
      </button>
      <AIPage ingredients={savedIngredients} />

    </>
  ) : (
    <>
            {/* Display Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
                <p className="text-red-700">{error}</p>
              </div>
            )}
{activeView === "favorites" && (
  <div className="flex items-center justify-between mb-3 px-1">
    <button
      onClick={() => setActiveView("default")}
      className="text-sm text-gray-600 hover:text-blue-600 flex items-center space-x-1"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Back</span>
    </button>
    <label className="text-sm flex items-center space-x-2">
      <input
        type="checkbox"
        checked={filterFavorites}
        onChange={(e) => setFilterFavorites(e.target.checked)}
      />
      <span>Filter favorites with current fridge</span>
    </label>

  </div>
)}



            {/* Recipe Results*/}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
  {sortedRecipes.map((recipe) => (
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

          {prioritizeExpiring && recipe.usesExpiring && (
            <span className="inline-block mt-1 px-2 py-1 text-xs bg-yellow-500 text-white rounded-full">
              🕒 Uses expiring ingredients
            </span>
          )}

          <div className="mt-2 text-xs text-gray-500">
            {recipe.ingredients?.length ?? 0} ingredients
          </div>
          <button className="mt-auto text-sm text-blue-600">View Details →</button>
        </div>
      </div>
    </div>
  ))}
</div>


            {/* Empty state for when no recipes have been searched yet */}
            {sortedRecipes.length === 0 && !loading && !error && (
  <div className="flex flex-col items-center justify-center h-64 text-center">
    <div className="text-6xl mb-4">📭</div>
    <h3 className="text-xl font-semibold text-gray-700 mb-2">
      {activeView === "favorites" ? "No favorites saved yet" : "No matching recipes found"}
    </h3>
    <p className="text-gray-500 max-w-md">
      {activeView === "favorites"
        ? "Start saving recipes to see them here."
        : "Try adding more ingredients to your fridge to unlock new recipe options."}
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
                </>
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
                  {Array.isArray(openRecipe.ingredients) ? (
  openRecipe.ingredients.map((ing, idx) => (
    <div key={idx} className="flex items-center gap-2">
      {savedIngredients.some(i =>
        ing.toLowerCase().includes(i.name.toLowerCase()) ||
        i.name.toLowerCase().includes(ing.toLowerCase())
      ) ? (
        <span className="text-green-500">✓</span>
      ) : (
        <span className="text-red-500">✗</span>
      )}
      <span>{ing}</span>
    </div>
  ))
) : (
  <p className="text-gray-500 text-sm italic">No ingredients listed for this recipe.</p>
)}

                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg text-gray-700">Summary</h4>
                  <div className="space-y-1">
  {Array.isArray(openRecipe.ingredients) && savedIngredients.length > 0 ? (
    <>
      <p className="text-green-700 text-sm">
        ✅ You have:{" "}
        {openRecipe.ingredients
          .filter((ing) =>
            savedIngredients.some((i) =>
              ing.toLowerCase().includes(i.name.toLowerCase())
            )
          )
          .join(", ") || "None"}
      </p>

      <p className="text-red-600 text-sm">
        ❌ You need:{" "}
        {openRecipe.ingredients
          .filter((ing) =>
            !savedIngredients.some((i) =>
              ing.toLowerCase().includes(i.name.toLowerCase())
            )
          )
          .join(", ") || "None"}
      </p>
    </>
  ) : (
    <>
      <p className="text-green-700 text-sm">✅ You have: None</p>
      <p className="text-red-600 text-sm">❌ You need: All ingredients</p>
    </>
  )}
</div>

                  
                  <div className="flex flex-wrap gap-2 mt-4">
                    <a
                      href={openRecipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      View Full Recipe
                    </a>
                    {activeView === "favorites" ? (
  <button
    onClick={() => removeFavorite(openRecipe.id)}
    className="bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400 transition"
  >
    💔 Remove from Favorites
  </button>
) : isFavorited(openRecipe) ? (
  <button
    disabled
    className="bg-gray-300 text-gray-600 px-4 py-2 rounded-lg cursor-not-allowed"
  >
    ✅ Already Saved
  </button>
) : (
  <button
    onClick={handleSaveFavorite}
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
});

export default RecipeFinder;
