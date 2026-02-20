require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);

/* ==============================
   CORS FIX (IMPORTANT FOR VERCEL)
================================ */
app.use(cors({
    origin: [
        "http://localhost:3000",
        "https://your-vercel-frontend-url.vercel.app" // 🔥 replace with real Vercel URL
    ],
    methods: ["GET", "POST"],
    credentials: true
}));

app.use(express.json());

/* ==============================
   SOCKET.IO
================================ */
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log("🔌 Client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("🔌 Client disconnected:", socket.id);
    });
});

/* ==============================
   BASIC HEALTH ROUTE
================================ */
app.get('/', (req, res) => {
    res.send("🚀 MiniCodeHub Backend Running Successfully");
});

/* ==============================
   ENV VARIABLES
================================ */
const PORT = process.env.PORT || 3001;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUR_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

if (!YOUTUBE_API_KEY || !YOUR_CHANNEL_ID) {
    console.log("❌ Missing ENV variables");
}

const UPLOADS_PLAYLIST_ID = YOUR_CHANNEL_ID?.replace('UC', 'UU');

/* ==============================
   CACHE
================================ */
let videoCache = null;
let videoCacheTime = null;
const CACHE_DURATION = 30 * 60 * 1000;

/* ==============================
   GET VIDEOS
================================ */
app.get('/api/videos', async (req, res) => {
    try {
        if (videoCache && (Date.now() - videoCacheTime < CACHE_DURATION)) {
            return res.json({ videos: videoCache });
        }

        const response = await axios.get(
            "https://www.googleapis.com/youtube/v3/playlistItems",
            {
                params: {
                    part: "snippet,contentDetails",
                    playlistId: UPLOADS_PLAYLIST_ID,
                    maxResults: 50,
                    key: YOUTUBE_API_KEY
                }
            }
        );

        const videos = response.data.items.map(item => ({
            id: item.contentDetails.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high?.url,
            videoUrl: `https://youtube.com/watch?v=${item.contentDetails.videoId}`
        }));

        videoCache = videos;
        videoCacheTime = Date.now();

        res.json({ videos });

    } catch (error) {
        console.error("YouTube API Error:", error.message);
        res.status(500).json({ error: "Failed to fetch videos" });
    }
});

/* ==============================
   SIMPLE C++ RUN (NOTE ⚠️)
================================ */
app.post('/api/run', (req, res) => {
    res.json({
        error: true,
        output: "⚠️ C++ execution is disabled in production (Render does not allow g++)."
    });
});

/* ==============================
   START SERVER
================================ */
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});