import mongoose from "mongoose";

const URI = process.env.MONGODB_URI;

if (!URI) {
  throw new Error("MONGODB_URI is not defined");
} else {
  mongoose.connect(URI).then(() => {
    console.log("Connected to MongoDB");
  });
}
