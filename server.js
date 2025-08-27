import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import cors from 'cors';
import axios from 'axios';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Store active user sessions
let userSessions = {};

// IBM Quantum API Validation Functions
async function validateIBMCredentials(apiKey, serviceCRN) {
    try {
        // Validate API Key by attempting to get a bearer token
        const params = new URLSearchParams({
            grant_type: "urn:ibm:params:oauth:grant-type:apikey",
            apikey: apiKey
        });
        
        const tokenResponse = await axios.post(
            "https://iam.cloud.ibm.com/identity/token",
            params,
            { 
                headers: { 
                    "Content-Type": "application/x-www-form-urlencoded" 
                } 
            }
        );

        if (!tokenResponse.data.access_token) {
            return { valid: false, error: "Invalid API key" };
        }

        // Validate CRN by attempting to fetch jobs
        const token = tokenResponse.data.access_token;
        try {
            await axios.get("https://quantum.cloud.ibm.com/api/v1/jobs", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Service-CRN": serviceCRN
                }
            });
            return { valid: true };
        } catch (error) {
            return { valid: false, error: "Invalid CRN" };
        }
    } catch (error) {
        return { valid: false, error: "Invalid API key" };
    }
}

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    crn: { type: String, required: true },
    api: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }

});

const User = mongoose.model('User', userSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
    console.log('Connected to MongoDB Atlas successfully');
})
.catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
});

// Basic route
app.get('/', (req, res) => {
    res.send('Quantum Job Tracker API is running');
});

// Login route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Login successful
        res.json({
            userId: user._id,
            username: user.username,
            email: user.email
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Signup route
app.post('/api/signup', async (req, res) => {
    try {
        const { username, email, password, crn, api } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                error: 'User with this email or username already exists' 
            });
        }

        // Validate IBM Credentials
        const validationResult = await validateIBMCredentials(api, crn);
        if (!validationResult.valid) {
            return res.status(400).json({ 
                error: validationResult.error
            });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new User({
            username,
            email,
            password: hashedPassword,
            crn,
            api
        });

        // Save user to database
        await user.save();

        res.status(201).json({ 
            message: 'User created successfully',
            userId: user._id
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
    console.log(`🔗 User connected: ${socket.id}`);

    socket.on("auth", async ({ userId }) => {
        userSessions[socket.id] = userId;
        console.log(`✅ Authenticated socket ${socket.id} for user ${userId}`);
    });

    socket.on("disconnect", () => {
        delete userSessions[socket.id];
        console.log(`❌ User disconnected: ${socket.id}`);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
