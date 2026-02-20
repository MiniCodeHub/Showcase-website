require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUR_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const UPLOADS_PLAYLIST_ID = YOUR_CHANNEL_ID.replace('UC', 'UU');

if (!YOUTUBE_API_KEY || !YOUR_CHANNEL_ID) {
    console.log('❌ ERROR: Check .env file');
    process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let videoCache = null;
let videoCacheTime = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Socket.IO Logic
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    let process = null;

    socket.on('run-cpp', ({ code }) => {
        if (!code) return;

        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const filename = `temp_${socket.id}_${Date.now()}.cpp`;
        const filePath = path.join(tempDir, filename);
        const exePath = path.join(tempDir, filename.replace('.cpp', '.exe'));

        fs.writeFileSync(filePath, code);

        // Compile
        exec(`g++ "${filePath}" -o "${exePath}"`, (compileError, stdout, stderr) => {
            if (compileError) {
                socket.emit('output', `Compilation Error:\n${stderr}`);
                socket.emit('done', { error: true });
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
                return;
            }

            // Execute
            process = spawn(exePath, [], { timeout: 30000 }); // 30s timeout

            process.stdout.on('data', (data) => {
                socket.emit('output', data.toString());
            });

            process.stderr.on('data', (data) => {
                socket.emit('output', data.toString()); // Treat stderr as output for terminal
            });

            process.on('close', (code) => {
                socket.emit('done', { error: code !== 0 });
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
                try { if (fs.existsSync(exePath)) fs.unlinkSync(exePath); } catch (e) { }
                process = null;
            });

            process.on('error', (err) => {
                socket.emit('output', `Execution Error: ${err.message}`);
                process = null;
            });
        });
    });

    socket.on('input', (data) => {
        if (process && process.stdin) {
            process.stdin.write(data + '\n'); // Append newline for standard input
        }
    });

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
        if (process) {
            process.kill();
        }
    });
});

// ✅ FIXED: Server-side pagination + filtering
app.get('/api/videos', async (req, res) => {
    const { search = '', lang = 'all', filter = 'all', page = '1', limit = '20' } = req.query;

    const actualLang = lang !== 'all' ? lang : filter !== 'all' ? filter : 'all';
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;

    console.log(`🔍 Query: search="${search}", lang="${actualLang}", page=${pageNum}, limit=${limitNum}`);

    // Check cache first
    if (videoCache && (Date.now() - videoCacheTime < CACHE_DURATION)) {
        console.log('✅ Using cache for pagination');
        return sendPaginatedVideos(videoCache, search, actualLang, startIndex, limitNum, res);
    }

    // Fetch fresh from YouTube
    try {
        console.log('📡 Fetching FRESH videos from YouTube...');
        let allVideos = [];
        let nextPageToken = '';

        do {
            const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
                params: {
                    part: 'snippet,contentDetails',
                    playlistId: UPLOADS_PLAYLIST_ID,
                    maxResults: 50,
                    pageToken: nextPageToken,
                    key: YOUTUBE_API_KEY
                }
            });

            const videos = response.data.items.map(item => ({
                id: item.contentDetails.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
                codeLang: getLangFromTitle(item.snippet.title),
                videoId: item.contentDetails.videoId,
                videoUrl: `https://youtube.com/watch?v=${item.contentDetails.videoId}`,
                publishedAt: item.snippet.publishedAt,
                description: item.snippet.description,
                codeData: {
                    code: generateCodeSnippet(getLangFromTitle(item.snippet.title)),
                    language: getLangFromTitle(item.snippet.title)
                }
            }));

            allVideos = allVideos.concat(videos);
            nextPageToken = response.data.nextPageToken;
        } while (nextPageToken);

        videoCache = allVideos;
        videoCacheTime = Date.now();

        console.log(`✅ Fetched ${allVideos.length} total videos`);
        sendPaginatedVideos(allVideos, search, actualLang, startIndex, limitNum, res);

    } catch (error) {
        console.error('❌ YouTube API Error:', error.message);
        if (videoCache) {
            console.log('📦 Using stale cache');
            return sendPaginatedVideos(videoCache, search, actualLang, startIndex, limitNum, res);
        }
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

// ✅ FIXED PAGINATION FUNCTION - Server-side slicing
function sendPaginatedVideos(videos, search, lang, startIndex, limit, res) {
    console.log(`📊 Filtering: search="${search}", lang="${lang}", start=${startIndex}, limit=${limit}`);

    // Filter first
    let filtered = videos.filter(video => {
        const matchesSearch = !search || video.title.toLowerCase().includes(search.toLowerCase());
        const matchesLang = lang === 'all' || video.codeLang === lang;
        return matchesSearch && matchesLang;
    });

    console.log(`🔍 After filter: ${filtered.length} videos match`);

    // ✅ SERVER-SIDE PAGINATION - Different videos each page!
    const paginatedVideos = filtered.slice(startIndex, startIndex + limit);

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit);

    console.log(`📄 Page ${Math.floor(startIndex / limit) + 1}: videos ${startIndex}-${Math.min(startIndex + limit, totalCount)} of ${totalCount}`);

    res.json({
        videos: paginatedVideos,
        totalCount,
        currentPage: Math.floor(startIndex / limit) + 1,
        totalPages,
        pageSize: limit,
        hasNext: startIndex + limit < totalCount,
        hasPrev: startIndex > 0
    });
}

app.get('/api/stats', (req, res) => {
    if (!videoCache) {
        return res.json({ total: 0, html: 0, react: 0, cpp: 0 });
    }

    const stats = {
        total: videoCache.length,
        html: videoCache.filter(v => v.codeLang === 'html').length,
        react: videoCache.filter(v => v.codeLang === 'reactjs').length,
        cpp: videoCache.filter(v => v.codeLang === 'cpp').length
    };

    res.json(stats);
});

app.get('/api/video/:id', async (req, res) => {
    if (!videoCache) return res.status(404).json({ error: "Cache not loaded" });

    const video = videoCache.find(v => v.videoId === req.params.id);
    if (!video) return res.status(404).json({ error: "Video not found" });

    // ✅ CHECK FOR GITHUB LINK
    if (!video.codeData.fetchedCode) {
        const githubMatch = video.description.match(/https:\/\/github\.com\/[^\s]+/);
        if (githubMatch) {
            let rawUrl = githubMatch[0]
                .replace('github.com', 'raw.githubusercontent.com')
                .replace('/blob/', '/'); // Raw URLs don't have /blob/

            console.log(`📡 Fetching code from: ${rawUrl}`);

            try {
                const codeRes = await axios.get(rawUrl);
                video.codeData.fetchedCode = codeRes.data;
                video.codeData.language = getLangFromTitle(video.title); // Ensure lang is correct
                console.log('✅ Code fetched successfully');
            } catch (err) {
                console.error('❌ Failed to fetch code:', err.message);
                video.codeData.fetchedCode = '// Error fetching code from GitHub';
            }
        } else {
            video.codeData.fetchedCode = generateCodeSnippet(video.codeLang);
        }
    }

    res.json(video);
});

function getLangFromTitle(title) {
    const t = title.toLowerCase();
    if (t.includes('react') || t.includes('mern') || t.includes('next')) return 'reactjs';
    if (t.includes('cpp') || t.includes('c++')) return 'cpp';
    if (t.includes('html') || t.includes('css') || t.includes('javascript') || t.includes('js')) return 'html';
    return 'html'; // Default
}

function generateCodeSnippet(lang) {
    const snippets = {
        html: `<!DOCTYPE html>
<html>
<head>
    <title>HTML Tutorial</title>
</head>
<body>
    <h1>Hello MiniCodeHub!</h1>
</body>
</html>`,
        reactjs: `import React from 'react';

function App() {
  return (
    <div>
      <h1>React Tutorial</h1>
    </div>
  );
}

export default App;`,
        cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello C++!" << endl;
    return 0;
}`
    };
    return snippets[lang] || '// Tutorial code';
}

// ✅ FIXED: C++ Execution Endpoint
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

app.post('/api/run', (req, res) => {
    const { code, language, input = '' } = req.body;

    if (language !== 'cpp') {
        return res.status(400).json({ error: 'Only C++ execution is supported.' });
    }

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    const filename = `temp_${Date.now()}.cpp`;
    const filePath = path.join(tempDir, filename);
    const exePath = path.join(tempDir, filename.replace('.cpp', '.exe'));

    // Write code to file
    fs.writeFileSync(filePath, code);

    // Compile
    exec(`g++ "${filePath}" -o "${exePath}"`, (compileError, stdout, stderr) => {
        if (compileError) {
            // Cleanup source file (ignore errors)
            try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }

            return res.json({
                error: true,
                output: `Compilation Error:\n${stderr}`
            });
        }

        // Execute using spawn to support stdin
        const child = spawn(exePath, [], { timeout: 10000 }); // 10s timeout enforced by Node.js

        let runStdout = '';
        let runStderr = '';
        let outputSent = false;

        // Write input to stdin
        if (input) {
            child.stdin.write(input);
        }
        child.stdin.end();

        child.stdout.on('data', (data) => {
            runStdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            runStderr += data.toString();
        });

        child.on('close', (code, signal) => {
            if (outputSent) return;
            outputSent = true;

            // Cleanup files (ignore errors)
            try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
            try { if (fs.existsSync(exePath)) fs.unlinkSync(exePath); } catch (e) { }

            if (signal === 'SIGTERM' || signal === 'SIGKILL') {
                return res.json({ error: true, output: 'Error: Execution timed out (10s limit).' });
            }

            if (code !== 0) {
                return res.json({ error: true, output: `Runtime Error (Exit Code ${code}):\n${runStderr}` });
            }

            res.json({ error: false, output: runStdout });
        });

        // Safety net error handler
        child.on('error', (err) => {
            if (outputSent) return;
            outputSent = true;
            res.json({ error: true, output: `Execution Error: ${err.message}` });
        });
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📺 Channel: ${YOUR_CHANNEL_ID}`);
});
