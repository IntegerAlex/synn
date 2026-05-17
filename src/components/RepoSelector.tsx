"use client";

import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Github,
  GitFork,
  Globe,
  Search,
  Shield,
  SortAsc,
  Star,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { useSetRepo } from "@/hooks/useGitData";
import { useAppStore } from "@/store/useAppStore";

interface Repo {
  id: number;
  name: string;
  full_name: string;
  owner: string | {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  default_branch: string;
  private: boolean;
  stargazers_count?: number;
  stars_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  updated_at?: string;
  metadata?: {
    description?: string;
    updatedAt?: string;
    pushedAt?: string;
    forks_count?: number;
    open_issues_count?: number;
  };
}

type SortOption = "name" | "stars" | "updated";
type VisibilityFilter = "all" | "public" | "private";

export function RepoSelector() {
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // GitHub State
  const [selectedRepo, setSelectedRepo] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("updated");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");

  const setRepoInfoStore = useAppStore((state) => state.setRepoInfo);
  const setRepo = useSetRepo();
  const { isLoaded, isSignedIn } = useAuth();

  // Canvas animation matching home screen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }

    const nodes: Node[] = [];
    const nodeCount = 40;

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: Math.random() * 1.5 + 1,
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.fillStyle = "#0d1117";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      nodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        nodes.forEach((other, j) => {
          if (i === j) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 200) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.05 * (1 - dist / 200)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Fetch repos using TanStack Query
  const { data: repos = [], isLoading: loadingRepos } = useQuery({
    queryKey: ["repos"],
    queryFn: async () => {
      const res = await fetch("/api/github/repos");
      if (!res.ok) {
        throw new Error("Failed to fetch repositories");
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const filteredAndSortedRepos = useMemo(() => {
    let result = [...repos];

    // Filter by visibility
    if (visibility !== "all") {
      result = result.filter((repo) =>
        visibility === "private" ? repo.private : !repo.private,
      );
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (repo: Repo) =>
          repo.full_name.toLowerCase().includes(query) ||
          repo.name.toLowerCase().includes(query) ||
          (repo.description?.toLowerCase().includes(query) ?? false) ||
          (repo.metadata?.description?.toLowerCase().includes(query) ?? false),
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      
      if (sortBy === "stars") {
        const aStars = (a.stars_count ?? a.stargazers_count) || 0;
        const bStars = (b.stars_count ?? b.stargazers_count) || 0;
        return bStars - aStars;
      }
      
      if (sortBy === "updated") {
        const aDateStr = a.updated_at || a.metadata?.updatedAt || a.metadata?.pushedAt || 0;
        const bDateStr = b.updated_at || b.metadata?.updatedAt || b.metadata?.pushedAt || 0;
        
        const aTime = aDateStr ? new Date(aDateStr).getTime() : 0;
        const bTime = bDateStr ? new Date(bDateStr).getTime() : 0;
        
        // Handle invalid dates
        const finalA = isNaN(aTime) ? 0 : aTime;
        const finalB = isNaN(bTime) ? 0 : bTime;
        
        return finalB - finalA;
      }
      return 0;
    });

    return result;
  }, [repos, searchQuery, sortBy, visibility]);

  // Repository usage state
  const [recentRepos, setRecentRepos] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("recent_repos");
    if (saved) {
      try {
        setRecentRepos(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load recent repos", e);
      }
    }
  }, []);

  const addToRecent = (fullName: string) => {
    const updated = [
      fullName,
      ...recentRepos.filter((r) => r !== fullName),
    ].slice(0, 10);
    setRecentRepos(updated);
    localStorage.setItem("recent_repos", JSON.stringify(updated));
  };

  const handleGithubSubmit = async (repoName?: string) => {
    const targetRepo = repoName || selectedRepo;
    if (!targetRepo) return;

    const repo = repos.find((r: Repo) => r.full_name === targetRepo);
    if (!repo) return;

    setDownloading(true);
    setError(null);
    try {
      const repoInfo = await setRepo.mutateAsync({
        repoFullName: repo.full_name,
        defaultBranch: repo.default_branch || "main",
      });
      addToRecent(repo.full_name);
      setRepoInfoStore(repoInfo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open repository");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-bg-main overflow-hidden text-text-main">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 pointer-events-none opacity-50"
      />

      <Header />

      <main className="flex-1 relative z-10 w-full max-w-[1600px] mx-auto px-6 py-8 flex flex-col gap-8 min-h-0">
        <SignedOut>
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-md w-full text-center py-12 bg-bg-card/80 backdrop-blur-xl border border-border-main rounded-2xl p-8 shadow-2xl">
              <Github className="w-16 h-16 text-text-sub mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-text-main mb-2">
                Connect GitHub
              </h2>
              <p className="text-text-sub mb-8 max-w-sm mx-auto font-medium">
                Sync your repositories to start visualizing your commit patterns
                and branch history.
              </p>
              <SignInButton mode="modal">
                <button
                  className="w-full flex items-center justify-center gap-3 py-4 px-8 
                                             bg-text-main hover:opacity-90 text-bg-main font-bold rounded-xl
                                             transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                                             shadow-xl"
                >
                  <Github className="w-5 h-5" />
                  <span>Sign In with GitHub</span>
                </button>
              </SignInButton>
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          {/* Header Section */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-text-main mb-1">
                  Repositories
                </h2>
                <p className="text-text-sub font-medium">
                  Select a project to visualize its development history.
                </p>
              </div>
              <div className="flex items-center gap-4">
                {recentRepos.length > 0 && (
                  <div className="flex -space-x-2 overflow-hidden py-1 px-1">
                    {recentRepos.slice(0, 3).map((name, _i) => (
                      <div
                        key={name}
                        className="inline-block h-8 w-8 rounded-full ring-2 ring-bg-main bg-bg-card flex items-center justify-center text-[10px] font-bold text-accent-main border border-border-main cursor-help"
                        title={name}
                      >
                        {name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {recentRepos.length > 3 && (
                      <div className="inline-block h-8 w-8 rounded-full ring-2 ring-bg-main bg-bg-card flex items-center justify-center text-[10px] font-bold text-text-sub border border-border-main">
                        +{recentRepos.length - 3}
                      </div>
                    )}
                  </div>
                )}
                <div className="h-8 w-px bg-border-main" />
                <div className="text-sm font-medium text-text-sub">
                  <span className="text-text-main font-bold">
                    {filteredAndSortedRepos.length}
                  </span>{" "}
                  projects
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-4 bg-bg-card border border-border-main p-5 rounded-3xl shadow-xl shadow-black/20">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-sub group-focus-within:text-accent-main transition-colors" />
                <input
                  type="text"
                  placeholder="Search repositories by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-bg-main border border-border-main rounded-2xl 
                                             text-text-main font-medium text-sm
                                             focus:outline-none focus:ring-2 focus:ring-accent-main/40 focus:border-accent-main
                                             transition-all duration-200 placeholder-text-sub/40 shadow-inner"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Visibility Filter */}
                <div className="flex items-center bg-bg-main border border-border-main rounded-2xl p-1.5 shadow-inner">
                  {(["all", "public", "private"] as VisibilityFilter[]).map(
                    (v) => (
                      <button
                        key={v}
                        onClick={() => setVisibility(v)}
                        className={`px-6 py-2 text-xs font-black rounded-xl transition-all duration-300 uppercase tracking-widest
                                                      ${
                                                        visibility === v
                                                          ? "bg-accent-main text-white shadow-lg shadow-accent-main/30 scale-105"
                                                          : "text-text-sub hover:text-text-main hover:bg-bg-hover"
                                                      }`}
                      >
                        {v}
                      </button>
                    ),
                  )}
                </div>

                <div className="h-10 w-px bg-border-main hidden sm:block opacity-50" />

                {/* Sort Dropdown */}
                <div className="flex items-center gap-3 bg-bg-main border border-border-main rounded-2xl px-4 py-2.5 shadow-inner hover:border-text-sub/30 transition-colors">
                  <SortAsc className="w-4.5 h-4.5 text-accent-main" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-text-sub leading-none mb-0.5 tracking-tighter">Sort by</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="bg-transparent text-xs font-bold text-text-main focus:outline-none cursor-pointer appearance-none pr-4"
                    >
                      <option value="updated">Recently Updated</option>
                      <option value="stars">Popularity (Stars)</option>
                      <option value="name">Repository Name</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Repository Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar pb-12">
            {loadingRepos ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                <div className="w-12 h-12 border-4 border-accent-main border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.2)]" />
                <span className="text-lg text-text-sub font-bold tracking-tight animate-pulse">
                  Scanning GitHub ecosystem...
                </span>
              </div>
            ) : filteredAndSortedRepos.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className="p-6 bg-bg-card rounded-full border border-border-main">
                  <Search className="w-12 h-12 text-text-sub opacity-20" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-text-main">
                    No repositories found
                  </h3>
                  <p className="text-text-sub max-w-xs mx-auto">
                    Try adjusting your search query or filters to find what
                    you're looking for.
                  </p>
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-accent-main font-bold hover:underline underline-offset-4"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {filteredAndSortedRepos.map((repo: Repo) => (
                  <button
                    key={repo.id}
                    type="button"
                    onClick={() => setSelectedRepo(repo.full_name)}
                    onDoubleClick={() => handleGithubSubmit(repo.full_name)}
                    className={`group relative text-left p-6 rounded-3xl border transition-all duration-300 flex flex-col h-full
                                                   ${
                                                     selectedRepo ===
                                                     repo.full_name
                                                       ? "bg-accent-main/5 border-accent-main ring-1 ring-accent-main shadow-2xl shadow-accent-main/10 scale-[1.02]"
                                                       : "bg-bg-card border-border-main hover:border-gray-500 hover:bg-bg-hover hover:scale-[1.01] shadow-lg shadow-black/10"
}`}
                  >
                    {/* Selection Active Indicator */}
                    {selectedRepo === repo.full_name && (
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-accent-main tracking-tighter">
                          Selected
                        </span>
                        <div className="w-2.5 h-2.5 rounded-full bg-accent-main shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                      </div>
                    )}

                    {/* Visibility Badge */}
                    {!selectedRepo && (
                      <div className="absolute top-4 right-4">
                        {repo.private ? (
                          <Shield className="w-3.5 h-3.5 text-orange-500/50" />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-green-500/50" />
                        )}
                      </div>
                    )}

                    {/* Repo Header */}
                    <div className="flex items-start gap-4 mb-5">
                      <div
                        className={`shrink-0 w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all duration-300
                                                          ${selectedRepo === repo.full_name ? "border-accent-main" : "border-border-main group-hover:border-gray-500"}`}
                      >
                        <img
                          src={typeof repo.owner === "string" ? `https://github.com/${repo.owner}.png` : repo.owner.avatar_url}
                          alt={typeof repo.owner === "string" ? repo.owner : repo.owner.login}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <h4
                          className={`text-lg font-bold truncate transition-colors ${selectedRepo === repo.full_name ? "text-accent-main" : "text-text-main"}`}
                        >
                          {repo.name}
                        </h4>
                        <p className="text-xs text-text-sub truncate opacity-70 font-medium">
                          {typeof repo.owner === "string" ? repo.owner : repo.owner?.login}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-text-sub line-clamp-3 mb-6 flex-1 font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                      {repo.description || repo.metadata?.description || "No description provided."}
                    </p>

                    {/* Metadata Footer */}
                    <div
                      className={`flex flex-wrap items-center gap-x-5 gap-y-2 pt-5 border-t transition-colors mt-auto
                                                       ${selectedRepo === repo.full_name ? "border-accent-main/20" : "border-border-main/50"}`}
                    >
                      <div
                        className="flex items-center gap-1.5 text-text-sub group-hover:text-text-main transition-colors"
                        title="Stars"
                      >
                        <Star className="w-4 h-4 text-yellow-500/80" />
                        <span className="text-xs font-bold tabular-nums">
                          {(repo.stars_count ?? repo.stargazers_count) || 0}
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-1.5 text-text-sub group-hover:text-text-main transition-colors"
                        title="Forks"
                      >
                        <GitFork className="w-4 h-4 text-blue-500/80" />
                        <span className="text-xs font-bold tabular-nums">
                          {(repo.forks_count ?? repo.metadata?.forks_count) || 0}
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-1.5 text-text-sub group-hover:text-text-main transition-colors"
                        title="Issues"
                      >
                        <AlertCircle className="w-4 h-4 text-orange-500/80" />
                        <span className="text-xs font-bold tabular-nums">
                          {(repo.open_issues_count ?? repo.metadata?.open_issues_count) || 0}
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-1.5 text-text-sub group-hover:text-text-main transition-colors"
                        title="Last Updated"
                      >
                        <Clock className="w-4 h-4 text-accent-main/80" />
                        <span className="text-xs font-bold whitespace-nowrap">
                          {(() => {
                            const dateStr = repo.updated_at || repo.metadata?.updatedAt || repo.metadata?.pushedAt;
                            if (!dateStr) return "N/A";
                            const date = new Date(dateStr);
                            return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric" },
                            );
                          })()}
                        </span>
                      </div>
                      <div className="ml-auto flex items-center gap-1.5 text-text-sub">
                        <div
                          className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border
                                                              ${
                                                                repo.private
                                                                  ? "bg-orange-500/5 text-orange-500/70 border-orange-500/20"
                                                                  : "bg-green-500/5 text-green-500/70 border-green-500/20"
                                                              }`}
                        >
                          {repo.private ? "Private" : "Public"}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SignedIn>
      </main>

      {/* Sticky Action Footer for Selection */}
      {selectedRepo && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card/80 backdrop-blur-xl border-t border-accent-main/30 p-6 flex items-center justify-center animate-in slide-in-from-bottom-full duration-300">
          <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-accent-main flex items-center justify-center text-white shadow-lg shadow-accent-main/20">
                <Github className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase text-accent-main tracking-widest mb-0.5">
                  Ready to visualize
                </div>
                <div className="text-lg font-bold text-text-main truncate">
                  {selectedRepo}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                onClick={() => setSelectedRepo("")}
                className="flex-1 sm:flex-none px-6 py-4 text-sm font-bold text-text-sub hover:text-text-main transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleGithubSubmit()}
                disabled={downloading || setRepo.isPending}
                className="flex-1 sm:flex-none min-w-[240px] py-4 px-10 bg-accent-main hover:opacity-90 disabled:bg-bg-tertiary
                                         disabled:text-text-sub disabled:cursor-not-allowed
                                         text-white font-black uppercase tracking-widest rounded-2xl 
                                         transition-all duration-300 shadow-2xl shadow-accent-main/30
                                         transform hover:scale-[1.02] active:scale-[0.98] border border-white/10"
              >
                {downloading || setRepo.isPending ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing codebase...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <span>Explore Project</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-2xl text-red-500 text-sm font-bold backdrop-blur-xl shadow-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-500/20 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
