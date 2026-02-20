import { dracula as draculaTheme } from "@codesandbox/sandpack-themes";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { Play, Code, Monitor, ChevronLeft, Square } from "lucide-react";
import io from "socket.io-client";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackCodeEditor
} from "@codesandbox/sandpack-react";

/* =============================
   ✅ API BASE (VERY IMPORTANT)
============================= */

const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:3001";

/* =============================
   Scroll To Top
============================= */

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

/* =============================
   HOME COMPONENT
============================= */

function Home() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/videos`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setVideos(data.videos || []);
    } catch (err) {
      console.error("API Error:", err);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return (
    <div className="min-h-screen bg-slate-900 text-white pt-20 px-6">
      <h1 className="text-4xl font-bold mb-8">MiniCodeHub</h1>

      {loading ? (
        <div className="text-2xl">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Link
              key={video.id}
              to={`/video/${video.id}`}
              className="bg-white/10 p-4 rounded-xl hover:bg-white/20 transition"
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="rounded-lg mb-4"
              />
              <h2 className="font-bold">{video.title}</h2>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* =============================
   VIDEO DETAIL
============================= */

function VideoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [video, setVideo] = useState(null);

  /* -------- Fetch Video -------- */

  useEffect(() => {
    fetch(`${API_BASE}/api/video/${id}`)
      .then((res) => res.json())
      .then((data) => setVideo(data))
      .catch((err) => console.error("Video Fetch Error:", err));
  }, [id]);

  /* -------- Socket Setup -------- */

  useEffect(() => {
    socketRef.current = io(API_BASE, {
      transports: ["websocket"],
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  if (!video) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-6 text-purple-400 hover:text-white"
      >
        <ChevronLeft /> Back
      </button>

      <h1 className="text-3xl font-bold mb-6">{video.title}</h1>

      <div className="aspect-video mb-8">
        <iframe
          src={`https://www.youtube.com/embed/${video.videoId}`}
          className="w-full h-full rounded-xl"
          allowFullScreen
        />
      </div>

      {/* HTML / React Sandpack */}
      {(video.codeLang === "html" || video.codeLang === "reactjs") && (
        <SandpackProvider
          template={video.codeLang === "html" ? "static" : "react"}
          theme={draculaTheme}
          files={{
            "/index.html": video.codeData?.code || "",
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SandpackCodeEditor />
            <SandpackPreview />
          </div>
        </SandpackProvider>
      )}

      {/* C++ Simple View */}
      {video.codeLang === "cpp" && (
        <div className="bg-black p-6 rounded-xl font-mono text-sm">
          <pre>{video.codeData?.code}</pre>
        </div>
      )}
    </div>
  );
}

/* =============================
   APP ROUTER
============================= */

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/video/:id" element={<VideoDetail />} />
      </Routes>
    </Router>
  );
}

export default App;