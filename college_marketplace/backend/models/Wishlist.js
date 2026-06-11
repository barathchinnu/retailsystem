const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
  createdAt: { type: Date, default: Date.now }
});

// prevent duplicate wishlist entries
wishlistSchema.index({ userId: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);

