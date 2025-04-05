'use client';

import { useEffect, useState } from 'react';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [error, setError] = useState('');

  const fetchFavorites = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to view favorites.');
      return;
    }

    fetch('/api/favorites', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => setFavorites(data.favorites || []))
      .catch((err) => {
        console.error(err);
        setError('Failed to load favorites.');
      });
  };

  const removeFavorite = async (id: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/favorites', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ id })
    });

    if (res.ok) {
      setFavorites(favorites.filter((fav) => fav.id !== id));
    } else {
      alert('Failed to remove favorite');
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">❤️ Your Favorite Recipes</h1>

      {error && <p className="text-center text-red-500">{error}</p>}

      {favorites.length === 0 && !error && (
        <p className="text-center text-gray-500">
          You have no favorite recipes yet. Go ahead and favorite some!
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((recipe) => (
          <div key={recipe.id} className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition">
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={recipe.image}
                alt={recipe.title}
                className="w-full h-40 object-cover rounded mb-3"
              />
              <h3 className="text-lg font-semibold text-gray-800">{recipe.title}</h3>
            </a>
            <button
              onClick={() => removeFavorite(recipe.id)}
              className="mt-2 text-red-600 hover:underline text-sm"
            >
              🗑️ Remove from Favorites
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
