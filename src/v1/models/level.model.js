import mongoose from "mongoose";

const { Schema } = mongoose;

const LevelSchema = new Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
  },
  name: {
    type: String,
    required: true,
    lowercase: true,
  },
  leaveTypes: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LeaveType",
        required: true,
      },
    ],
    default: [],
  },
});

export default mongoose.model("Level", LevelSchema);
