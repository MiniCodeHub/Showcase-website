require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
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

const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'videos.json');
let videoCache = [];

function loadCacheFromFile() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const loaded = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
            let updated = false;
            videoCache = loaded.map(video => {
                const description = video.description || '';
                const githubUrl = extractGithubUrl(description);
                
                // Migrate from old format (code/language properties) to githubUrl format
                if (video.codeData && (video.codeData.code !== undefined || video.codeData.language !== undefined)) {
                    video.codeData = {
                        githubUrl: githubUrl
                    };
                    updated = true;
                }
                return video;
            });
            
            if (updated) {
                fs.writeFileSync(CACHE_FILE, JSON.stringify(videoCache, null, 2), 'utf8');
                console.log(`💾 Normalized cache format and updated ${CACHE_FILE}`);
            }
            console.log(`📦 Loaded ${videoCache.length} videos from local cache file.`);
        } else {
            console.log('⚠️ Local cache file not found. Initializing empty.');
            videoCache = [];
        }
    } catch (e) {
        console.error('⚠️ Failed to load local cache file:', e.message);
        videoCache = [];
    }
}

// Load cache immediately on startup
loadCacheFromFile();

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
                socket.emit('done', { error: true });
                process = null;
            });
        });
    });

    socket.on('run-python', ({ code, version = 'default' }) => {
        if (!code) return;

        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const filename = `temp_${socket.id}_${Date.now()}.py`;
        const filePath = path.join(tempDir, filename);

        fs.writeFileSync(filePath, code);

        let pythonCmd = 'python';
        let pythonArgs = ['-u', filePath];

        if (version !== 'default') {
            pythonCmd = 'py';
            pythonArgs = [`-${version}`, '-u', filePath];
        }

        const runScript = (cmd, args, isFallback = false) => {
            if (isFallback) {
                socket.emit('output', `\r\n⚠️ Python ${version} runtime not found on this system. Falling back to default system Python...\r\n\r\n`);
            }

            process = spawn(cmd, args, { timeout: 30000 });

            let stderrBuffer = '';

            process.stdout.on('data', (data) => {
                socket.emit('output', data.toString());
            });

            process.stderr.on('data', (data) => {
                const str = data.toString();
                stderrBuffer += str;
                socket.emit('output', str);
            });

            process.on('close', (code) => {
                if (!isFallback && version !== 'default' && code !== 0 && stderrBuffer.includes('No suitable Python runtime found')) {
                    runScript('python', ['-u', filePath], true);
                    return;
                }

                socket.emit('done', { error: code !== 0 });
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
                process = null;
            });

            process.on('error', (err) => {
                if (!isFallback && version !== 'default') {
                    runScript('python', ['-u', filePath], true);
                    return;
                }
                socket.emit('output', `Execution Error: ${err.message}`);
                socket.emit('done', { error: true });
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
                process = null;
            });
        };

        runScript(pythonCmd, pythonArgs);
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

async function syncVideosWithYouTube() {
    console.log('CNTL: [Sync] Attempting to fetch fresh videos from YouTube...');
    try {
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

            const videos = response.data.items.map(item => {
                const description = item.snippet.description || '';
                const githubUrl = extractGithubUrl(description);
                return {
                    id: item.contentDetails.videoId,
                    title: item.snippet.title,
                    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
                    codeLang: getLangFromTitle(item.snippet.title),
                    videoId: item.contentDetails.videoId,
                    videoUrl: `https://youtube.com/watch?v=${item.contentDetails.videoId}`,
                    publishedAt: item.snippet.publishedAt,
                    description: description,
                    codeData: {
                        githubUrl: githubUrl
                    }
                };
            });

            allVideos = allVideos.concat(videos);
            nextPageToken = response.data.nextPageToken;
        } while (nextPageToken);

        // Update memory cache on success
        videoCache = allVideos;

        // Persist to local JSON file
        fs.writeFileSync(CACHE_FILE, JSON.stringify(allVideos, null, 2), 'utf8');
        console.log(`💾 [Sync] Success! Saved ${allVideos.length} videos to local file.`);
    } catch (error) {
        console.error('❌ [Sync] YouTube API update failed (e.g., Quota Exceeded). Keeping existing cache.', error.message);
    }
}

// Schedule background sync
// 1. Run 5 seconds after startup
setTimeout(syncVideosWithYouTube, 5000);
// 2. Run every 24 hours
setInterval(syncVideosWithYouTube, 24 * 60 * 60 * 1000);

// ✅ FIXED: Server-side pagination + filtering directly from local cache
app.get('/api/videos', (req, res) => {
    const { search = '', lang = 'all', filter = 'all', page = '1', limit = '20' } = req.query;

    const actualLang = lang !== 'all' ? lang : filter !== 'all' ? filter : 'all';
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;

    console.log(`🔍 Serving from Cache: search="${search}", lang="${actualLang}", page=${pageNum}, limit=${limitNum}`);

    sendPaginatedVideos(videoCache, search, actualLang, startIndex, limitNum, res);
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
        return res.json({ total: 0, html: 0, react: 0, cpp: 0, python: 0 });
    }

    const stats = {
        total: videoCache.length,
        html: videoCache.filter(v => v.codeLang === 'html').length,
        react: videoCache.filter(v => v.codeLang === 'reactjs').length,
        cpp: videoCache.filter(v => v.codeLang === 'cpp').length,
        python: videoCache.filter(v => v.codeLang === 'python').length
    };

    res.json(stats);
});

app.get('/api/video/:id', async (req, res) => {
    const video = videoCache.find(v => v.videoId === req.params.id || v.id === req.params.id);
    if (!video) return res.status(404).json({ error: "Video not found" });

    // ✅ CHECK FOR GITHUB LINK
    if (!video.codeData.fetchedCode) {
        const githubUrl = video.codeData.githubUrl || extractGithubUrl(video.description);
        if (githubUrl) {
            let rawUrl = githubUrl
                .replace('http://', 'https://')
                .replace('www.', '')
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

function extractGithubUrl(description) {
    if (!description) return null;
    // 1. Look specifically for "source code: <url>"
    const sourceCodeMatch = description.match(/source\s+code:\s*(https?:\/\/(?:www\.)?github\.com\/[^\s]+)/i);
    if (sourceCodeMatch) {
        return sourceCodeMatch[1];
    }
    // 2. Fallback to any github link in description
    const fallbackMatch = description.match(/https?:\/\/(?:www\.)?github\.com\/[^\s]+/);
    return fallbackMatch ? fallbackMatch[0] : null;
}

function getLangFromTitle(title) {
    const t = title.toLowerCase();
    if (t.includes('react') || t.includes('mern') || t.includes('next')) return 'reactjs';
    if (t.includes('cpp') || t.includes('c++')) return 'cpp';
    if (t.includes('python') || /\bpy\b/.test(t)) return 'python';
    if (t.includes('html') || t.includes('css') || t.includes('javascript') || /\bjs\b/.test(t)) return 'html';
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
}`,
        python: `def main():
    print("Hello from MiniCodeHub Python!")

if __name__ == "__main__":
    main()`
    };
    return snippets[lang] || '// Tutorial code';
}

// ✅ FIXED: C++ & Python Execution Endpoint
const { exec, spawn } = require('child_process');


app.post('/api/run', (req, res) => {
    const { code, language, input = '', version = 'default' } = req.body;

    if (language !== 'cpp' && language !== 'python') {
        return res.status(400).json({ error: 'Only C++ and Python execution are supported.' });
    }

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    if (language === 'cpp') {
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
    } else if (language === 'python') {
        const filename = `temp_${Date.now()}.py`;
        const filePath = path.join(tempDir, filename);

        // Write code to file
        fs.writeFileSync(filePath, code);

        let pythonCmd = 'python';
        let pythonArgs = ['-u', filePath];

        if (version !== 'default') {
            pythonCmd = 'py';
            pythonArgs = [`-${version}`, '-u', filePath];
        }

        const runScriptHttp = (cmd, args, isFallback = false) => {
            const child = spawn(cmd, args, { timeout: 10000 }); // 10s timeout

            let runStdout = '';
            let runStderr = '';
            let outputSent = false;

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

                if (!isFallback && version !== 'default' && code !== 0 && runStderr.includes('No suitable Python runtime found')) {
                    outputSent = true;
                    // Run fallback
                    runScriptHttp('python', [filePath], true);
                    return;
                }

                outputSent = true;
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }

                if (signal === 'SIGTERM' || signal === 'SIGKILL') {
                    return res.json({ error: true, output: `${isFallback ? '⚠️ Python ' + version + ' not found. Falling back to default...\n' : ''}Error: Execution timed out (10s limit).` });
                }

                if (code !== 0) {
                    return res.json({ error: true, output: `${isFallback ? '⚠️ Python ' + version + ' not found. Falling back to default...\n' : ''}Runtime Error (Exit Code ${code}):\n${runStderr}` });
                }

                res.json({ error: false, output: `${isFallback ? '⚠️ Python ' + version + ' not found. Falling back to default...\n' : ''}${runStdout}` });
            });

            child.on('error', (err) => {
                if (outputSent) return;
                if (!isFallback && version !== 'default') {
                    outputSent = true;
                    runScriptHttp('python', ['-u', filePath], true);
                    return;
                }
                outputSent = true;
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
                res.json({ error: true, output: `Execution Error: ${err.message}` });
            });
        };

        runScriptHttp(pythonCmd, pythonArgs);
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📺 Channel: ${YOUR_CHANNEL_ID}`);
});
