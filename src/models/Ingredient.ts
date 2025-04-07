// /src/models/Ingredient.ts
import mongoose from "mongoose";

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

export default mongoose.models.Ingredient ||
  mongoose.model("Ingredient", IngredientSchema);
