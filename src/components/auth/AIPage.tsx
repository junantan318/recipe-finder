'use client';
import { useState } from 'react';
import { Loader } from 'lucide-react';


export default function AIPage({
  ingredients,
}: {
  ingredients: { name: string; expires: string }[];
}) {
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState<{ user: string; ai: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  const sendMessage = async (customMessage?: string) => {
    if (!customMessage && ingredients.length === 0) return;
  
    const lowerCaseMessage = (customMessage || "").toLowerCase();
    const wantsIngredients =
      lowerCaseMessage.includes("my ingredients") ||
      lowerCaseMessage.includes("ingredients i have") ||
      lowerCaseMessage.includes("fridge") ||
      lowerCaseMessage.includes("pantry");
  
    const payload =
      customMessage && wantsIngredients
        ? {
            ingredients,
            message: customMessage, // still pass it for context
          }
        : customMessage
        ? { message: customMessage }
        : { ingredients };
  
    const userMessage = customMessage || "Use My Ingredients";
  
    setAiLoading(true);
  
    try {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
  
      const data = await res.json();
      setChatLog((prev) => [...prev, { user: userMessage, ai: data.reply }]);
      setMessage("");
      setError(null);
    } catch (e: any) {
      console.error("AI Fetch Error:", e);
      setError("❌ Something went wrong. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };
  

  return (
    <div className="flex flex-col h-full p-6 bg-white">
      <div className="flex items-center mb-4 gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask a recipe question..."
          className="flex-1 border border-gray-300 px-3 py-2 rounded-lg text-sm"
        />
        <button
          onClick={() => sendMessage(message)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Send
        </button>
        <button
          onClick={() => sendMessage()}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          Use My Ingredients
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {chatLog.map((entry, i) => (
          <div key={i} className="space-y-1">
            <div className="text-right text-sm text-gray-700 font-medium">You: {entry.user}</div>
            <div className="bg-gray-50 border-l-4 border-purple-500 p-3 rounded text-sm text-gray-700 whitespace-pre-line">
              {entry.ai}
            </div>
          </div>
        ))}

        {aiLoading && (
          <div className="text-gray-500 text-sm flex items-center">
            <Loader className="w-4 h-4 mr-2 animate-spin" />
            Thinking...
          </div>
          
        )}
        {error && (
  <div className="text-red-600 text-sm mt-4">
    {error}
  </div>
)}

      </div>
    </div>
  );
}
