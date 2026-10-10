const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: function () { return !this.googleId && !this.githubId; } },
googleId: { type: String, unique: true, sparse: true },
githubId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (candidate) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
