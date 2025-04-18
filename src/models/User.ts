import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: String,
  savedIngredients: [String],
  favorites: [
    {
      id: String,
      title: String,
      image: String,
      sourceUrl: String,
      ingredients: [String],
      cuisine: [String],
      category: [String],
      diet: String,
    }
  ]
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
