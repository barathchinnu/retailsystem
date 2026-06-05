const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Item = require('./models/Item');
const User = require('./models/User');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/college_marketplace';
const JWT_SECRET = process.env.JWT_SECRET || 'kongu_marketplace_secret_2026';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// ─── Auth Middleware ───────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Access denied. Please login first.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ success: false, error: 'Invalid or expired session. Please login again.' });
    }
}

// ─── Auth Routes ───────────────────────────────────────────────────────────────

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, department } = req.body;

        // Enforce @kongu.edu email domain
        if (!email || !email.toLowerCase().endsWith('@kongu.edu')) {
            return res.status(400).json({ success: false, error: 'Only @kongu.edu email addresses are allowed.' });
        }

        // Check if user already exists
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({ name, email: email.toLowerCase(), password: hashedPassword, department });
        await user.save();

        // Generate JWT
        const token = jwt.sign({ id: user._id, name: user.name, email: user.email, department: user.department }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ success: true, token, user: { name: user.name, email: user.email, department: user.department } });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({ success: false, error: 'No account found with this email.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'Incorrect password.' });
        }

        const token = jwt.sign({ id: user._id, name: user.name, email: user.email, department: user.department }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: { name: user.name, email: user.email, department: user.department } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── Item Routes ───────────────────────────────────────────────────────────────

// Get all items (public)
app.get('/api/items', async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = {};
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        const items = await Item.find(query).sort({ createdAt: -1 });
        res.json({ success: true, data: items });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get a single item (public)
app.get('/api/items/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, error: 'Item not found' });
        res.json({ success: true, data: item });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Post a new item (PROTECTED — must be logged in)
app.post('/api/items', authMiddleware, async (req, res) => {
    try {
        const newItem = new Item(req.body);
        const savedItem = await newItem.save();
        res.status(201).json({ success: true, data: savedItem });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
