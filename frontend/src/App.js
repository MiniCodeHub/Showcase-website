import {SandpackProvider, SandpackCodeEditor, SandpackPreview} from '@codesandbox/sandpack-react';
import { dracula as draculaTheme } from "@codesandbox/sandpack-themes";
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Play, Code, Monitor, ChevronLeft, Square, Search, Filter, Github, Linkedin, Mail, Youtube } from 'lucide-react';
import io from 'socket.io-client';

const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:3001";
// ScrollToTop Component
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// Navbar (unchanged - perfect)
function Navbar({ filter, setFilter, search, setSearch, stats, scrollDirection, isScrolled }) {
  return (
    <header className={`
      fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out backdrop-blur-xl
      ${isScrolled
        ? 'py-3 md:py-2 shadow-2xl bg-black/90 border-b border-purple-500/70 h-auto md:h-16'
        : 'py-4 bg-black/50 h-auto md:h-20'
      }
      ${scrollDirection === 'down' && isScrolled ? '-translate-y-full' : 'translate-y-0'}
    `}>
      <div className="max-w-7xl mx-auto px-4 h-full flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
        {/* Brand */}
        <div className={`transition-all duration-300 w-full md:w-auto flex justify-center md:justify-start ${isScrolled ? 'md:scale-90 md:opacity-90' : 'md:scale-100 md:opacity-100'}`}>
          <h1 className={`font-black bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl transition-all text-2xl md:text-3xl lg:text-4xl leading-tight`}>
            MiniCodeHub
          </h1>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 w-full md:flex-1 md:max-w-md justify-center order-2 md:order-none">
          <div className="relative w-full">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 transition-all w-5 h-5 text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={isScrolled ? "Search..." : "Search HTML, React, C++..."}
              className={`w-full pl-10 pr-4 py-2 md:py-${isScrolled ? '1.5' : '3'} bg-white/10 backdrop-blur-md border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-base shadow-lg`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Filters */}
        <div className={`flex bg-white/10 backdrop-blur-xl rounded-2xl p-1 md:p-${isScrolled ? '1' : '2'} border border-white/30 shadow-xl transition-all overflow-x-auto hide-scrollbar w-full md:w-auto ${isScrolled ? 'md:h-12' : 'md:h-16'} order-3 md:order-none justify-between md:justify-start gap-1`}>
          <button onClick={() => setFilter('all')} className={`flex-1 md:flex-none px-3 md:px-${isScrolled ? '3' : '5'} py-2 md:py-${isScrolled ? '1' : '3'} rounded-xl font-bold text-[10px] md:text-xs transition-all flex items-center justify-center gap-1 shadow-sm whitespace-nowrap ${filter === 'all' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-500/50' : 'text-purple-200 hover:text-white hover:bg-white/30 hover:shadow-md'}`}>
            ALL <span className="text-[9px] md:text-xs bg-black/50 px-1 py-0.5 rounded min-w-[1.5rem] font-bold">{stats.total}</span>
          </button>
          <button onClick={() => setFilter('html')} className={`flex-1 md:flex-none px-2 md:px-${isScrolled ? '2' : '4'} py-2 md:py-${isScrolled ? '1' : '3'} rounded-xl font-bold text-[10px] md:text-xs flex items-center justify-center gap-1 transition-all whitespace-nowrap ${filter === 'html' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-500/50' : 'text-orange-300 hover:text-orange-100 hover:bg-orange-500/20 hover:shadow-md'}`}>
            HTML <span className="text-[9px] md:text-xs bg-black/50 px-1 py-0.5 rounded min-w-[1.5rem] font-bold">{stats.html}</span>
          </button>
          <button onClick={() => setFilter('reactjs')} className={`flex-1 md:flex-none px-2 md:px-${isScrolled ? '2' : '4'} py-2 md:py-${isScrolled ? '1' : '3'} rounded-xl font-bold text-[10px] md:text-xs flex items-center justify-center gap-1 transition-all whitespace-nowrap ${filter === 'reactjs' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/50' : 'text-emerald-300 hover:text-emerald-100 hover:bg-emerald-500/20 hover:shadow-md'}`}>
            React <span className="text-[9px] md:text-xs bg-black/50 px-1 py-0.5 rounded min-w-[1.5rem] font-bold">{stats.react}</span>
          </button>
          <button onClick={() => setFilter('cpp')} className={`flex-1 md:flex-none px-2 md:px-${isScrolled ? '2' : '4'} py-2 md:py-${isScrolled ? '1' : '3'} rounded-xl font-bold text-[10px] md:text-xs flex items-center justify-center gap-1 transition-all whitespace-nowrap ${filter === 'cpp' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-500/50' : 'text-blue-300 hover:text-blue-100 hover:bg-blue-500/20 hover:shadow-md'}`}>
            C++ <span className="text-[9px] md:text-xs bg-black/50 px-1 py-0.5 rounded min-w-[1.5rem] font-bold">{stats.cpp}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function AboutMe() {
  return (
    <section className="max-w-4xl mx-auto px-3 sm:px-6 mt-24 mb-12">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-[2rem] blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-black/40 backdrop-blur-xl rounded-[2rem] p-5 sm:p-8 md:p-12 border border-white/10 ring-1 ring-white/20">

          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
                About Me
              </h2>
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-6">
                Hi, I'm <span className="text-white font-bold">Satchit Kamat</span>. I build interactive web experiences and love simplifying complex coding concepts. This platform is my playground for sharing tutorials from my YouTube channel <span className="text-white font-bold">MiniCodeHub</span>.
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-4">
                <a href="https://youtube.com/@MiniCodeHub" target="_blank" rel="noopener noreferrer"
                  className="p-2 sm:p-3 bg-white/5 rounded-xl hover:bg-white/20 hover:scale-110 transition-all text-red-500 hover:text-red-400 border border-white/10">
                  <Youtube className="w-5 h-5 sm:w-6 sm:h-6" />
                </a>
                <a href="https://github.com/satchitkamat" target="_blank" rel="noopener noreferrer"
                  className="p-2 sm:p-3 bg-white/5 rounded-xl hover:bg-white/20 hover:scale-110 transition-all text-gray-300 hover:text-white border border-white/10" title="Personal GitHub">
                  <Github className="w-5 h-5 sm:w-6 sm:h-6" />
                </a>
                <a href="https://github.com/MiniCodeHub" target="_blank" rel="noopener noreferrer"
                  className="p-2 sm:p-3 bg-white/5 rounded-xl hover:bg-white/20 hover:scale-110 transition-all text-gray-300 hover:text-white border border-white/10" title="MiniCodeHub GitHub">
                  <Github className="w-5 h-5 sm:w-6 sm:h-6" />
                </a>
                <a href="https://www.linkedin.com/in/satchitkamat-kamat-815256390" target="_blank" rel="noopener noreferrer"
                  className="p-2 sm:p-3 bg-white/5 rounded-xl hover:bg-white/20 hover:scale-110 transition-all text-blue-300 hover:text-blue-400 border border-white/10">
                  <Linkedin className="w-5 h-5 sm:w-6 sm:h-6" />
                </a>
                <a href="mailto:contact@minicodehub.com"
                  className="p-2 sm:p-3 bg-white/5 rounded-xl hover:bg-white/20 hover:scale-110 transition-all text-pink-300 hover:text-pink-400 border border-white/10">
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                </a>
              </div>
            </div>

            <div className="shrink-0 relative order-first md:order-none mt-4 md:mt-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-1 shadow-2xl overflow-hidden">
                <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                  <img
                    src="/profile.png"
                    alt="Satchit Kamat"
                    className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function Home() {
  const [videos, setVideos] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, html: 0, react: 0, cpp: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scrollY, setScrollY] = useState(0);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] = useState('up');
  const [isScrolled, setIsScrolled] = useState(false);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        lang: filter,
        page: currentPage,
        limit: 20
      });

      console.log('🔄 Fetching:', params.toString()); // DEBUG

      const [videosRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/videos?${params}`),
        fetch(`${API_BASE}/api/stats`)
      ]);

      if (!videosRes.ok || !statsRes.ok) {
        throw new Error(`Server returned ${videosRes.status} ${statsRes.status}`);
      }

      const videoContentType = videosRes.headers.get("content-type");
      if (!videoContentType || !videoContentType.includes("application/json")) {
        throw new Error("Received non-JSON response from server");
      }

      const videoData = await videosRes.json();
      const statsData = await statsRes.json();

      console.log('📊 Page data:', videoData); // DEBUG

      setVideos(Array.isArray(videoData.videos) ? videoData.videos : []);
      setTotalPages(videoData.totalPages || 1);
      setStats({
        total: statsData.total || 0,
        html: statsData.html || 0,
        react: statsData.react || 0,
        cpp: statsData.cpp || 0
      });
    } catch (error) {
      console.error('❌ API Error:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [search, filter, currentPage]);

  useEffect(() => {
    let ticking = false;
    const updateScroll = () => {
      const newScrollY = window.scrollY;
      setScrollY(newScrollY);
      setIsScrolled(newScrollY > 50);

      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollDirection(newScrollY > lastScrollY ? 'down' : 'up');
          setLastScrollY(newScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateScroll);
  }, [lastScrollY]);

  useEffect(() => {
    console.log('📄 Page changed to:', currentPage, 'Filter:', filter); // DEBUG
    fetchVideos();
    window.scrollTo(0, 0); // Instant scroll to top on page key change
  }, [currentPage, search, filter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 text-white overflow-x-hidden">
      <Navbar
        filter={filter}
        setFilter={setFilter}
        search={search}
        setSearch={setSearch}
        stats={stats}
        scrollDirection={scrollDirection}
        isScrolled={isScrolled}
      />

      <main className="pt-48 md:pt-24 lg:pt-28 pb-12">
        {/* Filter Status */}
        <div className="max-w-7xl mx-auto px-6 mb-8 pt-8 flex justify-center md:justify-start">
          <div className={`inline-flex items-center gap-4 px-8 py-5 rounded-3xl backdrop-blur-xl font-bold text-xl bg-white/10 border border-white/20 shadow-2xl ${filter !== 'all' ? 'border-purple-500/50 bg-purple-500/10 ring-2 ring-purple-500/30' : ''
            }`}>
            <div className={`w-6 h-6 rounded-full shadow-lg ${filter === 'html' ? 'bg-orange-400' :
              filter === 'reactjs' ? 'bg-emerald-400' :
                filter === 'cpp' ? 'bg-blue-400' : 'bg-purple-400'
              }`} />
            <span>{filter === 'all' ? 'ALL' : filter.toUpperCase()} TUTORIALS</span>
            <span className="text-purple-300">({videos.length})</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6">
          {loading ? (
            <div className="flex flex-col items-center py-40">
              <div className="w-36 h-36 border-8 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-16 shadow-2xl"></div>
              <p className="text-4xl font-bold text-purple-300 tracking-wide">Loading {filter.toUpperCase()}...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-40 max-w-2xl mx-auto">
              <div className="w-36 h-36 bg-white/10 backdrop-blur-xl rounded-3xl p-10 mx-auto mb-12 flex items-center justify-center shadow-2xl border border-white/20">
                <Monitor className="w-24 h-24 text-gray-500" />
              </div>
              <h2 className="text-5xl font-black text-gray-300 mb-8">No {filter} tutorials</h2>
              <p className="text-2xl text-gray-400 leading-relaxed">Try switching filters or search terms</p>
            </div>
          ) : (
            <>
              {/* ✅ TOP PAGINATION BUTTONS */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 bg-white/5 backdrop-blur-xl rounded-3xl p-4 sm:p-8 border border-white/20 shadow-2xl mx-4 sm:mx-0 mb-8">
                  <div className="text-purple-300 font-bold text-base sm:text-xl text-center">
                    Page {currentPage} of {totalPages} • {videos.length} tutorials
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || loading}
                      className={`px-4 py-2 sm:px-6 sm:py-3 rounded-2xl font-bold text-sm sm:text-lg transition-all shadow-lg flex items-center gap-2 ${currentPage === 1 || loading
                        ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-purple-500/50 hover:shadow-xl'
                        }`}
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                      Previous
                    </button>

                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                      const pageNum = currentPage <= 4
                        ? i + 1
                        : currentPage >= totalPages - 3
                          ? totalPages - 6 + i
                          : currentPage - 3 + i;

                      if (pageNum < 1 || pageNum > totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          disabled={loading}
                          className={`hidden sm:flex w-14 h-14 rounded-2xl font-bold text-lg transition-all shadow-lg items-center justify-center ${currentPage === pageNum
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-500/50 scale-110 ring-4 ring-purple-500/30'
                            : loading
                              ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                              : 'bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white hover:shadow-xl hover:scale-105'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || loading}
                      className={`px-4 py-2 sm:px-6 sm:py-3 rounded-2xl font-bold text-sm sm:text-lg transition-all shadow-lg flex items-center gap-2 ${currentPage === totalPages || loading
                        ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-purple-500/50 hover:shadow-xl'
                        }`}
                    >
                      Next
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 rotate-180" />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                {videos.map((video) => (
                  <Link key={video.id} to={`/video/${video.id}`} className="group block h-full">
                    <div className="bg-white/10 backdrop-blur-md rounded-3xl overflow-hidden border border-white/20 hover:border-purple-500/50 hover:bg-white/20 transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl h-full flex flex-col">
                      <div className="relative h-48 overflow-hidden bg-gray-800/50">
                        <img
                          src={video.thumbnail.replace('mqdefault.jpg', 'hqdefault.jpg')}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          loading="lazy"
                        />
                        <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-lg ${video.codeLang === 'html' ? 'bg-orange-500/95 text-white' :
                          video.codeLang === 'reactjs' ? 'bg-emerald-500/95 text-white' :
                            video.codeLang === 'cpp' ? 'bg-blue-500/95 text-white' :
                              'bg-purple-500/95 text-white'
                          }`}>
                          {video.codeLang?.toUpperCase()}
                        </span>
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <h3 className="font-bold text-lg mb-4 line-clamp-2 group-hover:text-purple-300 transition-colors leading-tight">
                          {video.title}
                        </h3>
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600/90 to-pink-600/90 backdrop-blur-sm text-white font-semibold px-6 py-3 rounded-2xl transition-all group-hover:from-purple-700 group-hover:to-pink-700 w-full justify-center">
                          <Play className="w-5 h-5" />
                          Watch + Code
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* ✅ BOTTOM PAGINATION BUTTONS */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 bg-white/5 backdrop-blur-xl rounded-3xl p-4 sm:p-8 border border-white/20 shadow-2xl mx-4 sm:mx-0">
                  <div className="text-purple-300 font-bold text-base sm:text-xl text-center">
                    Page {currentPage} of {totalPages} • {videos.length} tutorials
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || loading}
                      className={`px-4 py-2 sm:px-6 sm:py-3 rounded-2xl font-bold text-sm sm:text-lg transition-all shadow-lg flex items-center gap-2 ${currentPage === 1 || loading
                        ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-purple-500/50 hover:shadow-xl'
                        }`}
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                      Previous
                    </button>

                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                      const pageNum = currentPage <= 4
                        ? i + 1
                        : currentPage >= totalPages - 3
                          ? totalPages - 6 + i
                          : currentPage - 3 + i;

                      if (pageNum < 1 || pageNum > totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          disabled={loading}
                          className={`hidden sm:flex w-14 h-14 rounded-2xl font-bold text-lg transition-all shadow-lg items-center justify-center ${currentPage === pageNum
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-500/50 scale-110 ring-4 ring-purple-500/30'
                            : loading
                              ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                              : 'bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white hover:shadow-xl hover:scale-105'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || loading}
                      className={`px-4 py-2 sm:px-6 sm:py-3 rounded-2xl font-bold text-sm sm:text-lg transition-all shadow-lg flex items-center gap-2 ${currentPage === totalPages || loading
                        ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-purple-500/50 hover:shadow-xl'
                        }`}
                    >
                      Next
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 rotate-180" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <AboutMe />
      </main>
    </div>
  );
}

const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const socketRef = useRef(null);
  const terminalEndRef = useRef(null);

  useEffect(() => {
    fetch(`/api/video/${id}`)
      .then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then(data => {
        setVideo({ ...data, terminalOutput: '', isRunning: false });
      })
      .catch((err) => {
        console.error("Video Fetch Error:", err);
      });
  }, [id]);

  useEffect(() => {
    socketRef.current = io(API_BASE);

    socketRef.current.on('output', (data) => {
      setVideo(v => {
        if (!v) return null;
        return {
          ...v,
          terminalOutput: (v.terminalOutput || '') + data
        };
      });
      if (terminalEndRef.current) {
        terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    });

    socketRef.current.on('done', () => {
      setVideo(v => v ? ({ ...v, isRunning: false }) : null);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const handleRun = () => {
    if (!socketRef.current || !video) return;
    setVideo(v => ({ ...v, isRunning: true, terminalOutput: '' }));
    socketRef.current.emit('run-cpp', {
      code: video.codeData?.fetchedCode || video.codeData?.code
    });
  };

  const handleStop = () => {
    setVideo(v => ({ ...v, isRunning: false }));
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  };

  const handleTerminalInput = (e) => {
    if (e.key === 'Enter') {
      const input = e.target.value;
      if (socketRef.current && video.isRunning) {
        socketRef.current.emit('input', input);
        setVideo(v => ({
          ...v,
          terminalOutput: (v.terminalOutput || '') + input + '\n',
          inputBuffer: ''
        }));
      }
    }
  };

  const isHtml = video?.codeLang === 'html';
  const isReact = video?.codeLang === 'reactjs';
  const isCpp = video?.codeLang === 'cpp' || video?.codeLang === 'c++';

  const sandpackFiles = useMemo(() => {
    if (!video?.codeData) return {};
    const code = video.codeData.fetchedCode || video.codeData.code;

    if (isReact) {
      return {
        "App.tsx": code,
        "public/index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Minicodehub Showcase</title>
    <style>
      html, body, #root {
        height: 100%;
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
      };
    }
    if (isHtml) {
      return {
        "index.html": code
      };
    }
    return {};
  }, [video, isReact, isHtml]);

  if (!video) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-purple-900 pt-40">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-2 pb-12 px-3 sm:px-4 md:px-6 bg-gradient-to-br from-slate-900 to-purple-900 overflow-x-hidden">
      <button
        onClick={() => navigate(-1)}
        className="mb-8 inline-flex items-center gap-3 text-purple-400 hover:text-white font-bold text-xl py-4 px-3 border-b-2 border-transparent hover:pr-8 hover:border-purple-400 transition-all duration-500 ease-in-out"
      >
        <ChevronLeft size={24} />
        Back
      </button>

      {/* Top Section: Info & Video */}
      <div className="max-w-[1920px] mx-auto mb-8 flex flex-col items-center">
        {/* Info */}
        <div className="w-full flex justify-between items-end mb-6">
          <div className="shrink-0">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2 truncate">
              {video.title}
            </h1>
            <div className="flex gap-4 items-center">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${isHtml ? 'bg-orange-500/20 text-orange-300' :
                isReact ? 'bg-emerald-500/20 text-emerald-300' :
                  'bg-blue-500/20 text-blue-300'
                }`}>
                {video.codeLang}
              </span>
            </div>
          </div>
        </div>

        {/* Video Player - Centered & Large */}
        <div className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl shrink-0">
          <iframe
            src={`https://www.youtube.com/embed/${video.videoId}?rel=0`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      {/* Bottom Section: Code & Preview Side-by-Side */}
      <div className="max-w-[1920px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start">

        {/* React/HTML: Sandpack Full Width */}
        {(isReact || isHtml) && (
          <div className={`col-span-1 lg:col-span-2 h-auto min-h-fit lg:h-fit`}>
            {isHtml ? (
              <SandpackProvider
                template="static"
                theme={draculaTheme}
                files={sandpackFiles}
              >
                <div className="flex flex-col lg:flex-row h-fit w-full gap-6 md:gap-8">
                  <div className="flex-1 h-1/2 lg:h-full overflow-hidden order-2 lg:order-1 rounded-3xl border border-white/10 shadow-xl bg-[#1e1e1e]">
                    <SandpackCodeEditor
                      showTabs
                      showLineNumbers
                      wrapContent
                      readOnly={true}
                      style={{ height: '1400px' }}
                    />
                  </div>
                  <div className="flex-1 h-full lg:h-full order-1 lg:order-2 rounded-3xl border border-white/10 shadow-xl bg-[#1e1e1e] overflow-hidden">
                    <SandpackPreview
                      showNavigator={true}
                      style={{ height: '1400px' }}
                    />
                  </div>
                </div>
              </SandpackProvider>
            ) : (
              <SandpackProvider
                template="react-ts"
                theme={draculaTheme}
                files={sandpackFiles}
                customSetup={{
                  dependencies: {
                    "lucide-react": "latest",
                    "tailwindcss": "latest",
                    "clsx": "latest",
                    "tailwind-merge": "latest",
                    "@babel/runtime": "latest",
                    "framer-motion": "latest",
                    "react-parallax-tilt": "latest",
                    "react-tilt": "latest"
                  }
                }}
                options={{
                  externalResources: ["https://cdn.tailwindcss.com"]
                }}
              >
                <div className="flex flex-col lg:flex-row h-fit w-full gap-6 md:gap-8">
                  <div className="flex-1 h-1/2 lg:h-full overflow-hidden order-2 lg:order-1 rounded-3xl border border-white/10 shadow-xl bg-[#1e1e1e]">
                    <SandpackCodeEditor
                      showTabs
                      showLineNumbers
                      showInlineErrors
                      wrapContent
                      closableTabs
                      readOnly={true}
                      style={{ height: '100vh' }}
                    />
                  </div>
                  <div className="flex-1 h-full lg:h-full order-1 lg:order-2 rounded-3xl border border-white/10 shadow-xl bg-[#1e1e1e] overflow-hidden">
                    <SandpackPreview
                      showNavigator={true}
                      showOpenInCodeSandbox={false}
                      style={{ height: '100vh' }}
                    />
                  </div>
                </div>
              </SandpackProvider>
            )}
          </div>
        )}

        {/* C++: Keep Original Grid Layout */}
        {isCpp && (
          <>
            {/* Left Column: Code View */}
            <div className="h-[100vh] bg-[#1e1e1e] rounded-3xl overflow-hidden border border-white/10 shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-6 py-3 bg-white/5">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-sm text-gray-300">Source Code</span>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed custom-scrollbar text-gray-300">
                <pre>{video.codeData?.fetchedCode || video.codeData?.code}</pre>
              </div>
            </div>

            {/* Right Column: Execution */}
            <div className="col-span-1 h-[100vh] bg-[#1e1e1e] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 bg-[#2d2d2d] border-b border-black/20 shrink-0">
                {/* ... terminal header ... */}
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  </div>
                  <span className="font-mono text-sm text-gray-400 ml-2">minicodehub-terminal</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRun}
                    disabled={video.isRunning}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${video.isRunning
                      ? 'bg-gray-700 text-gray-500 cursor-wait'
                      : 'bg-green-600 hover:bg-green-500 text-white shadow-lg transform hover:scale-105'
                      }`}
                  >
                    <Play size={12} className={video.isRunning ? 'animate-spin' : ''} />
                    {video.isRunning ? 'Compiling...' : 'Run Code'}
                  </button>
                  {video.isRunning && (
                    <button
                      onClick={handleStop}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-lg flex items-center gap-2"
                    >
                      <Square size={12} fill="currentColor" /> Stop
                    </button>
                  )}
                </div>
              </div>

              <div
                className="flex-1 bg-[#0c0c0c] p-6 font-mono text-sm overflow-auto custom-scrollbar"
                onClick={() => document.getElementById('terminal-input')?.focus()}
              >
                <div className="flex flex-col min-h-full text-gray-300">
                  <div className="mb-4 text-gray-500 select-none">
                    MinicodeHub v2.0.0 [C++ Execution Environment]<br />
                    Type input below when prompted.
                  </div>

                  <div className="whitespace-pre-wrap break-words text-gray-300 leading-relaxed">
                    {video.terminalOutput}
                    <div ref={terminalEndRef} />
                  </div>

                  {video.isRunning && (
                    <div className="mt-2 flex items-center gap-2 group">
                      <span className="text-green-500 font-bold">➜</span>
                      <input
                        id="terminal-input"
                        type="text"
                        value={video.inputBuffer || ''}
                        onChange={(e) => setVideo(v => ({ ...v, inputBuffer: e.target.value }))}
                        onKeyDown={handleTerminalInput}
                        className="flex-1 bg-transparent border-none text-white focus:ring-0 p-0 font-mono caret-green-500 outline-none placeholder-gray-700"
                        placeholder="Type input here..."
                        autoComplete="off"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

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
