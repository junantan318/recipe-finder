import mongoose, { Schema, models, model } from 'mongoose';

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  savedIngredients: {
    type: [String],
    default: [],
  },
});

// Prevent model overwrite on hot reload
const User = models.User || model('User', UserSchema);

export default User;
