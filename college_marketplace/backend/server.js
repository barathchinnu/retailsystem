const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/college_marketplace';
const JWT_SECRET = process.env.JWT_SECRET || 'kongu_marketplace_secret_2026';
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin_kongu_2026'; // set in .env for production

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Error:', err));

// ═══════════════════════════════════════════════════
//  SCHEMAS
// ═══════════════════════════════════════════════════

// ── User ──────────────────────────────────────────
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    department: { type: String, required: true },
    // Profile
    profileImage: { type: String, default: '' }, // base64 data URL
    // Ratings
    ratingTotal: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    // Verification (manual admin flag)
    isVerified: { type: Boolean, default: false },
    // Admin
    isAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

userSchema.virtual('rating').get(function () {
    return this.ratingCount > 0
        ? Math.round((this.ratingTotal / this.ratingCount) * 10) / 10
        : null;
});

const User = mongoose.model('User', userSchema);

// ── Item ──────────────────────────────────────────
const itemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    condition: { type: String, required: true },
    description: { type: String, required: true },
    seller_name: { type: String, required: true },
    department: { type: String, required: true },
    year: { type: String, required: true },
    seller_phone: { type: String, required: true },  // stored but never returned publicly
    seller_email: { type: String, required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    image: { type: String },
    isSold: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Item = mongoose.model('Item', itemSchema);

// ── Chat ──────────────────────────────────────────
const messageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    // message can be text-only or image-only
    text: { type: String },
    image: { type: String }, // base64 data URL
    createdAt: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [messageSchema],
    phoneRevealed: { type: Boolean, default: false },  // seller approved phone reveal
    flagged: { type: Boolean, default: false },
    flagReason: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', chatSchema);

// ── Rating ────────────────────────────────────────
const ratingSchema = new mongoose.Schema({
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    raterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ratedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const Rating = mongoose.model('Rating', ratingSchema);

// ═══════════════════════════════════════════════════
//  MIDDLEWARE
// ═══════════════════════════════════════════════════

function authMiddleware(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Please login first.' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ success: false, error: 'Session expired. Please login again.' });
    }
}

function adminMiddleware(req, res, next) {
    const key = req.headers['x-admin-key'];

    // Debug (remove after fixing): helps confirm whether frontend key matches backend env.
    // We log only length to avoid leaking the secret.
    console.log('[ADMIN_KEY DEBUG]', {
        adminKeyLength: String(ADMIN_KEY || '').length,
        providedKeyLength: String(key || '').length
    });

    if (key !== ADMIN_KEY) return res.status(403).json({ success: false, error: 'Admin access denied.' });
    next();
}


// ═══════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════

app.get('/', (req, res) => res.json({ success: true, message: 'CampusSwap V2 API 🚀' }));

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, department } = req.body;

        if (!email?.toLowerCase().endsWith('@kongu.edu'))
            return res.status(400).json({ success: false, error: 'Only @kongu.edu emails are allowed.' });

        if (await User.findOne({ email: email.toLowerCase() }))
            return res.status(400).json({ success: false, error: 'Account already exists with this email.' });

        const user = new User({
            name,
            email: email.toLowerCase(),
            password: await bcrypt.hash(password, 10),
            department
        });
        await user.save();

        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email, department: user.department },
            JWT_SECRET, { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                department: user.department,
                isVerified: user.isVerified
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) return res.status(400).json({ success: false, error: 'No account found with this email.' });
        if (!await bcrypt.compare(password, user.password))
            return res.status(400).json({ success: false, error: 'Incorrect password.' });

        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email, department: user.department },
            JWT_SECRET, { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                department: user.department,
                isVerified: user.isVerified,
                profileImage: user.profileImage
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── Profile (logged-in user) ─────────────────────────────────────────────
app.get('/api/users/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('name email department isVerified profileImage');
        if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
        res.json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                department: user.department,
                isVerified: user.isVerified,
                profileImage: user.profileImage
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Update profile (name/department)
app.patch('/api/users/me', authMiddleware, async (req, res) => {
    try {
        const { name, department, profileImage } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (department !== undefined) updates.department = department;

        if (profileImage !== undefined) {
            // allow clearing
            if (profileImage === '' || profileImage === null) {
                updates.profileImage = '';
            } else {
                if (typeof profileImage !== 'string') {
                    return res.status(400).json({ success: false, error: 'Invalid profile image.' });
                }
                // Basic data URL validation
                if (!profileImage.startsWith('data:image/') || !profileImage.includes(';base64,')) {
                    return res.status(400).json({ success: false, error: 'Profile image must be a base64 data URL.' });
                }
                // Enforce max size (~2.5MB-ish base64 string)
                if (profileImage.length > 3_500_000) {
                    return res.status(400).json({ success: false, error: 'Profile image is too large.' });
                }
                updates.profileImage = profileImage;
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update.' });
        }

        const updated = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('name email department isVerified profileImage');
        if (!updated) return res.status(404).json({ success: false, error: 'User not found.' });

        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// ═══════════════════════════════════════════════════
//  WISHLIST ROUTES (Save / Unsave)
// ═══════════════════════════════════════════════════

const Wishlist = require('./models/Wishlist');

// Toggle wishlist for logged-in user
app.post('/api/wishlist/toggle', authMiddleware, async (req, res) => {
    try {
        const { itemId } = req.body;
        if (!itemId) return res.status(400).json({ success: false, error: 'itemId is required.' });

        const item = await Item.findById(itemId).select('_id');
        if (!item) return res.status(404).json({ success: false, error: 'Item not found.' });

        const userId = req.user.id;

        const existing = await Wishlist.findOne({ userId, itemId });
        if (existing) {
            await Wishlist.findOneAndDelete({ userId, itemId });
            return res.json({ success: true, saved: false });
        }

        await Wishlist.create({ userId, itemId });
        res.json({ success: true, saved: true });
    } catch (err) {
        // handle duplicate key race
        if (err && err.code === 11000) return res.json({ success: true, saved: true });
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get wishlist items for logged-in user
app.get('/api/wishlist', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const entries = await Wishlist.find({ userId })
            .populate('itemId', 'title category price condition description seller_name department year image isSold seller_email sellerId')
            .sort({ createdAt: -1 });

        const items = entries.map(e => e.itemId).filter(Boolean);
        res.json({ success: true, data: items });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════
//  ITEM ROUTES
// ═══════════════════════════════════════════════════


// Get all items (phone NEVER included)
app.get('/api/items', async (req, res) => {
    try {
        const { search, category } = req.query;
        const query = {};
        if (category) query.category = category;
        if (search) query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];

        const items = await Item.find(query)
            .select('-seller_phone')   // ← phone hidden from public list
            .sort({ createdAt: -1 });

        res.json({ success: true, data: items });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get single item (phone still hidden)
app.get('/api/items/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id).select('-seller_phone');
        if (!item) return res.status(404).json({ success: false, error: 'Item not found' });
        res.json({ success: true, data: item });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Post item (auth required)
app.post('/api/items', authMiddleware, async (req, res) => {
    try {
        const item = new Item({ ...req.body, sellerId: req.user.id });
        const saved = await item.save();
        res.status(201).json({ success: true, data: saved });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Update item (seller only)
app.patch('/api/items/:id', authMiddleware, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, error: 'Item not found' });
        if (String(item.sellerId) !== String(req.user.id)) {
            return res.status(403).json({ success: false, error: 'You can only modify your own listing.' });
        }

        // Do not allow changing sellerId/email/phone directly
        const allowed = ['title', 'category', 'price', 'condition', 'description', 'year', 'image', 'seller_name', 'department', 'isSold'];

        const updates = {};
        for (const k of allowed) {
            if (req.body[k] !== undefined) updates[k] = req.body[k];
        }

        // If seller_phone/seller_email are sent, ignore them.

        Object.assign(item, updates);
        const saved = await item.save();
        res.json({ success: true, data: saved });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Delete item (seller only)
app.delete('/api/items/:id', authMiddleware, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, error: 'Item not found' });
        if (String(item.sellerId) !== String(req.user.id)) {
            return res.status(403).json({ success: false, error: 'You can only delete your own listing.' });
        }
        await Item.findByIdAndDelete(req.params.id);
        // Note: we do not delete chats/rating here.
        res.json({ success: true, message: 'Item deleted.' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════
//  CHAT ROUTES
// ═══════════════════════════════════════════════════


// Start or get existing chat for item+buyer
app.post('/api/chats', authMiddleware, async (req, res) => {
    try {
        const { itemId } = req.body;
        const buyerId = req.user.id;

        const item = await Item.findById(itemId).select('sellerId seller_name title');
        if (!item) return res.status(404).json({ success: false, error: 'Item not found.' });
        if (item.sellerId?.toString() === buyerId)
            return res.status(400).json({ success: false, error: "You can't chat on your own listing." });

        let chat = await Chat.findOne({ itemId, buyerId });

        if (!chat) {
            chat = new Chat({ itemId, buyerId, sellerId: item.sellerId, messages: [] });
            await chat.save();
        }

        res.json({ success: true, data: chat });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get messages in a chat (buyer or seller only)
app.get('/api/chats/:chatId', authMiddleware, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId)
            .populate('itemId', 'title price image category')
            .populate('buyerId', 'name department ratingTotal ratingCount isVerified')
            .populate('sellerId', 'name department ratingTotal ratingCount isVerified');

        if (!chat) return res.status(404).json({ success: false, error: 'Chat not found.' });

        const uid = req.user.id;
        if (chat.buyerId._id.toString() !== uid && chat.sellerId._id.toString() !== uid)
            return res.status(403).json({ success: false, error: 'Access denied.' });

        // Attach computed rating to populated users
        const withRating = (u) => ({
            _id: u._id,
            name: u.name,
            department: u.department,
            isVerified: u.isVerified,
            rating: u.ratingCount > 0 ? Math.round((u.ratingTotal / u.ratingCount) * 10) / 10 : null,
            ratingCount: u.ratingCount
        });

        res.json({
            success: true,
            data: {
                ...chat.toObject(),
                buyerId: withRating(chat.buyerId),
                sellerId: withRating(chat.sellerId)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get all chats for the logged-in user
app.get('/api/chats', authMiddleware, async (req, res) => {
    try {
        const uid = req.user.id;
        const chats = await Chat.find({ $or: [{ buyerId: uid }, { sellerId: uid }] })
            .populate('itemId', 'title price image')
            .populate('buyerId', 'name')
            .populate('sellerId', 'name')
            .sort({ 'messages.-1.createdAt': -1, createdAt: -1 });

        res.json({ success: true, data: chats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Send message
app.post('/api/chats/:chatId/messages', authMiddleware, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ success: false, error: 'Chat not found.' });

        const uid = req.user.id;
        if (chat.buyerId.toString() !== uid && chat.sellerId.toString() !== uid)
            return res.status(403).json({ success: false, error: 'Access denied.' });

const msg = {
            senderId: uid,
            senderName: req.user.name,
            text: req.body.text,
            image: req.body.image
        };

        if ((!msg.text || msg.text.trim() === '') && !msg.image) {
            return res.status(400).json({ success: false, error: 'Message must contain text or an image.' });
        }

        // Enforce max size for safety (data URL size can be big)
        if (msg.image && msg.image.length > 2_500_000) {
            return res.status(400).json({ success: false, error: 'Image is too large. Please upload a smaller image.' });
        }
        chat.messages.push(msg);
        await chat.save();

        res.json({ success: true, data: chat.messages[chat.messages.length - 1] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════
//  PHONE REVEAL ROUTE
// ═══════════════════════════════════════════════════
//  Rules:
//  • Seller can approve at any time
//  • Buyer can request auto-reveal after sending 5+ messages
//  • Revealed phone is only returned inside this endpoint (not the item listing)

app.post('/api/chats/:chatId/reveal-phone', authMiddleware, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ success: false, error: 'Chat not found.' });

        const uid = req.user.id;
        const isSeller = chat.sellerId.toString() === uid;
        const isBuyer = chat.buyerId.toString() === uid;

        if (!isBuyer && !isSeller)
            return res.status(403).json({ success: false, error: 'Access denied.' });

        // Count messages sent by the buyer
        const buyerMsgCount = chat.messages.filter(m => m.senderId.toString() === chat.buyerId.toString()).length;

        // Seller approves manually OR buyer has 5+ messages
        if (isSeller || buyerMsgCount >= 5) {
            chat.phoneRevealed = true;
            await chat.save();

            const item = await Item.findById(chat.itemId).select('seller_phone');
            return res.json({ success: true, phone: item.seller_phone });
        }

        // Not enough messages yet
        const remaining = 5 - buyerMsgCount;
        res.json({
            success: false,
            error: `Send ${remaining} more message${remaining > 1 ? 's' : ''} to unlock the seller's number.`,
            buyerMsgCount,
            required: 5
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════
//  RATING ROUTES
// ═══════════════════════════════════════════════════

// Submit rating after a deal
app.post('/api/ratings', authMiddleware, async (req, res) => {
    try {
        const { chatId, ratedUserId, score, comment } = req.body;
        const raterId = req.user.id;

        if (score < 1 || score > 5)
            return res.status(400).json({ success: false, error: 'Score must be 1–5.' });

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ success: false, error: 'Chat not found.' });
        if (chat.buyerId.toString() !== raterId && chat.sellerId.toString() !== raterId)
            return res.status(403).json({ success: false, error: 'You are not part of this chat.' });

        // Ensure the deal is completed (seller marked the item as SOLD)
        const item = await Item.findById(chat.itemId).select('isSold');
        if (!item) return res.status(404).json({ success: false, error: 'Associated item not found.' });
        if (!item.isSold) {
            return res.status(400).json({
                success: false,
                error: 'Deal not completed yet. Ratings are enabled only after Mark as Sold.'
            });
        }

        // Prevent double rating
        if (await Rating.findOne({ chatId, raterId }))
            return res.status(400).json({ success: false, error: 'You have already rated this deal.' });

        const rating = new Rating({ chatId, raterId, ratedId: ratedUserId, score, comment });

        await rating.save();

        // Update user aggregate
        await User.findByIdAndUpdate(ratedUserId, {
            $inc: { ratingTotal: score, ratingCount: 1 }
        });

        res.status(201).json({ success: true, message: 'Rating submitted! ⭐' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get ratings for a user
app.get('/api/users/:userId/ratings', async (req, res) => {
    try {
        const ratings = await Rating.find({ ratedId: req.params.userId })
            .populate('raterId', 'name department')
            .sort({ createdAt: -1 });

        const user = await User.findById(req.params.userId).select('name ratingTotal ratingCount isVerified');
        if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

        res.json({
            success: true,
            data: {
                user: {
                    name: user.name,
                    isVerified: user.isVerified,
                    rating: user.ratingCount > 0 ? Math.round((user.ratingTotal / user.ratingCount) * 10) / 10 : null,
                    ratingCount: user.ratingCount
                },
                reviews: ratings
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════
//  REPORT ROUTE
// ═══════════════════════════════════════════════════

app.post('/api/chats/:chatId/report', authMiddleware, async (req, res) => {
    try {
        const { reason } = req.body;
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ success: false, error: 'Chat not found.' });

        const uid = req.user.id;
        if (chat.buyerId.toString() !== uid && chat.sellerId.toString() !== uid)
            return res.status(403).json({ success: false, error: 'Access denied.' });

        chat.flagged = true;
        chat.flagReason = reason || 'No reason provided';
        await chat.save();

        res.json({ success: true, message: 'Chat reported. Admin will review shortly.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════
//  ADMIN ROUTES  (protected by x-admin-key header)
// ═══════════════════════════════════════════════════

// Dashboard stats
app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
    try {
        const [totalUsers, totalItems, totalChats, flaggedChats] = await Promise.all([
            User.countDocuments(),
            Item.countDocuments(),
            Chat.countDocuments(),
            Chat.countDocuments({ flagged: true })
        ]);

        const topSellers = await User.find({ ratingCount: { $gt: 0 } })
            .select('name department ratingTotal ratingCount isVerified')
            .sort({ ratingTotal: -1 })
            .limit(5);

        res.json({
            success: true,
            data: {
                totalUsers,
                totalItems,
                totalChats,
                flaggedChats,
                topSellers: topSellers.map(u => ({
                    name: u.name,
                    department: u.department,
                    isVerified: u.isVerified,
                    rating: Math.round((u.ratingTotal / u.ratingCount) * 10) / 10,
                    ratingCount: u.ratingCount
                }))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// View flagged chats
app.get('/api/admin/flagged', adminMiddleware, async (req, res) => {
    try {
        const chats = await Chat.find({ flagged: true })
            .populate('itemId', 'title')
            .populate('buyerId', 'name email')
            .populate('sellerId', 'name email')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: chats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// View a specific chat (admin only — only flagged ones)
app.get('/api/admin/chats/:chatId', adminMiddleware, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId)
            .populate('itemId', 'title price')
            .populate('buyerId', 'name email department')
            .populate('sellerId', 'name email department');

        if (!chat) return res.status(404).json({ success: false, error: 'Chat not found.' });
        if (!chat.flagged) return res.status(403).json({ success: false, error: 'Only flagged chats can be reviewed.' });

        res.json({ success: true, data: chat });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Toggle verified badge for a user
app.patch('/api/admin/users/:userId/verify', adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
        user.isVerified = !user.isVerified;
        await user.save();
        res.json({ success: true, message: `User ${user.isVerified ? 'verified ✔' : 'unverified'}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// List all users
app.get('/api/admin/users', adminMiddleware, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════════

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 CampusSwap V2 running on port ${PORT}`));