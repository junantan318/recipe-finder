'use client';
import { useState } from 'react';
import { Loader } from 'lucide-react';

export default function AIPage({
  ingredients,
}: {
  ingredients: { name: string; expires: string }[];
}) {
  const [aiRecipe, setAiRecipe] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const askAiForRecipe = async () => {
    if (ingredients.length === 0) {
      setAiRecipe("Please add ingredients first!");
      return;
    }

    setAiLoading(true);
    setAiRecipe(null);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    try {
        const response = await fetch(`${baseUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ingredients }),
          });
          

      if (!response.ok) {
        throw new Error(`AI API error: \${response.status}`);
      }

      const data = await response.json();
      setAiRecipe(data.reply);
      setHistory((prev) => [data.reply, ...prev]);
    } catch (error) {
      console.error("🚨 AI Fetch Error:", error);
      setAiRecipe("Sorry, I couldn't generate a recipe.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 bg-white overflow-hidden">
      <div className="mb-4">
      </div>

      <div className="mb-4">
        <button
          onClick={askAiForRecipe}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center"
        >
          {aiLoading ? (
            <>
              <Loader className="w-5 h-5 animate-spin mr-2" />
              Thinking...
            </>
          ) : (
            "Ask AI for Recipe"
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {aiRecipe && (
          <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded text-sm text-gray-700 whitespace-pre-line">
            <strong className="text-purple-700 block mb-1">Latest Suggestion:</strong>
            {aiRecipe}
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold text-gray-700 mb-2">🕘 Chat History</h3>
            <ul className="space-y-3 text-sm text-gray-700 max-h-48 overflow-y-auto">
              {history.map((msg, idx) => (
                <li
                  key={idx}
                  className="bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-line"
                >
                  {msg}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
