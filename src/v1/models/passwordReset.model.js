import mongoose from "mongoose";
const { Schema } = mongoose;

const passwordResetSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60, // The document will be automatically deleted after 5 minutes of its creation time
  },
});

export default mongoose.model("PasswordReset", passwordResetSchema);
