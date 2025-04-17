import mongoose from "mongoose";
const { Schema } = mongoose;

const tenantSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Please provide an email"],
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
        "Please provide a valid email",
      ],
      unique: [true, "User with this email already exists"],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      select: false,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    logo: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(v);
        },
        message: (props) => `${props.value} is not a valid HEX color code!`,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Tenant", tenantSchema);
