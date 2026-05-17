'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { useSetRepo } from '@/hooks/useGitData';
import { useAppStore } from '@/store/useAppStore';
import { SignedIn, SignedOut, SignInButton, useAuth, UserButton } from '@clerk/nextjs';
import { Github, Sparkles, Search, History } from 'lucide-react';

interface Repo {
    id: number;
    name: string;
    full_name: string;
    owner: string;
    default_branch: string;
    private: boolean;
}

export function RepoSelector() {
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // GitHub State
    const [selectedRepo, setSelectedRepo] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const setRepoInfoStore = useAppStore((state) => state.setRepoInfo);
    const setRepo = useSetRepo();
    const { isLoaded, isSignedIn } = useAuth();

    // Canvas animation matching home screen
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        interface Node {
            x: number;
            y: number;
            vx: number;
            vy: number;
            radius: number;
        }

        const nodes: Node[] = [];
        const nodeCount = 30; // Reduced for performance

        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                radius: Math.random() * 1.5 + 1,
            });
        }

        let animationId: number;
        const animate = () => {
            ctx.fillStyle = 'var(--bg-primary)';
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

                    if (dist < 180) {
                        ctx.beginPath();
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(other.x, other.y);
                        ctx.strokeStyle = `var(--accent-primary)${Math.floor(0.1 * (1 - dist / 180) * 255).toString(16).padStart(2, '0')}`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                });

                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'var(--accent-primary)33';
                ctx.fill();
            });

            animationId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    }, []);

    // Fetch repos using TanStack Query
    const {
        data: repos = [],
        isLoading: loadingRepos,
    } = useQuery({
        queryKey: ['repos'],
        queryFn: async () => {
            const res = await fetch('/api/github/repos');
            if (!res.ok) {
                throw new Error('Failed to fetch repositories');
            }
                const data = await res.json();
            return Array.isArray(data) ? data : [];
        },
        enabled: isLoaded && isSignedIn,
        staleTime: 5 * 60 * 1000,
        retry: 2,
    });

    const filteredRepos = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return repos.filter((repo: Repo) =>
            repo.full_name.toLowerCase().includes(query) ||
            repo.name.toLowerCase().includes(query)
        );
    }, [repos, searchQuery]);

    // Repository usage state
    const [recentRepos, setRecentRepos] = useState<string[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('recent_repos');
        if (saved) {
            try {
                setRecentRepos(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load recent repos', e);
            }
        }
    }, []);

    const addToRecent = (fullName: string) => {
        const updated = [fullName, ...recentRepos.filter(r => r !== fullName)].slice(0, 5);
        setRecentRepos(updated);
        localStorage.setItem('recent_repos', JSON.stringify(updated));
    };

    const handleGithubSubmit = async () => {
        if (!selectedRepo) return;

        const repo = repos.find(r => r.full_name === selectedRepo);
        if (!repo) return;

        setDownloading(true);
        setError(null);
        try {
            const repoInfo = await setRepo.mutateAsync({ 
                repoFullName: repo.full_name, 
                defaultBranch: repo.default_branch || 'main'
            });
            addToRecent(repo.full_name);
            setRepoInfoStore(repoInfo);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to open repository');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-bg-main overflow-hidden text-text-main">
            <canvas ref={canvasRef} className="absolute inset-0" />
            
            <div className="relative z-10 w-full max-w-2xl mx-auto px-6 lg:px-8 py-12">
                <div className="flex flex-col items-center mb-12">
                    <div className="relative mb-6 transform hover:scale-105 transition-transform duration-500">
                        <Image
                            src="/logo.png"
                            alt="Synn Logo"
                            width={160}
                            height={160}
                            className="drop-shadow-[0_0_40px_rgba(59,130,246,0.4)]"
                            priority
                        />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-text-main tracking-tight mb-3">
                        Synn <span className="text-accent-main text-3xl font-medium ml-2 opacity-80 italic">v2.0</span>
                    </h1>
                    <p className="text-text-sub text-center max-w-md text-lg">
                        Visualize your development journey
                    </p>
                </div>

                <div className="space-y-6">
                    <SignedOut>
                        <div className="text-center py-12 bg-bg-card/80 backdrop-blur-xl border border-border-main rounded-2xl p-8 shadow-2xl">
                            <Github className="w-16 h-16 text-text-sub mx-auto mb-6" />
                            <h2 className="text-2xl font-bold text-text-main mb-2">Connect GitHub</h2>
                            <p className="text-text-sub mb-8 max-w-sm mx-auto font-medium">Sync your repositories to start visualizing your commit patterns and branch history.</p>
                            <SignInButton mode="modal">
                                <button className="w-full flex items-center justify-center gap-3 py-4 px-8 
                                             bg-text-main hover:opacity-90 text-bg-main font-bold rounded-xl
                                             transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                                             shadow-xl">
                                    <Github className="w-5 h-5" />
                                    <span>Sign In with GitHub</span>
                                </button>
                            </SignInButton>
                        </div>
                    </SignedOut>

                    <SignedIn>
                        <div className="bg-bg-card/90 backdrop-blur-xl border border-border-main rounded-2xl p-8 shadow-2xl">
                            <div className="flex justify-between items-center mb-8 bg-bg-main/50 p-4 rounded-xl border border-border-main">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" />
                                    <span className="text-sm font-semibold text-text-sub tracking-wide uppercase">GitHub Connected</span>
                                </div>
                                <UserButton />
                            </div>
                            
                            <div className="space-y-8">
                                {recentRepos.length > 0 && !searchQuery && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3 px-1">
                                            <History className="w-4 h-4 text-accent-main" />
                                            <h3 className="text-xs font-bold text-text-sub uppercase tracking-widest">Recently Viewed</h3>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {recentRepos.map((repoName) => (
                                                <button
                                                    key={repoName}
                                                    onClick={() => setSelectedRepo(repoName)}
                                                    className={`text-left px-4 py-3.5 rounded-xl border transition-all duration-200 group
                                                               ${selectedRepo === repoName 
                                                                 ? 'bg-accent-main border-accent-main text-white shadow-lg shadow-accent-main/20' 
                                                                 : 'bg-bg-main border-border-main text-text-sub hover:border-gray-500 hover:bg-bg-card'}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-semibold truncate">{repoName}</span>
                                                        <Sparkles className={`w-4 h-4 transition-all duration-300 ${selectedRepo === repoName ? 'opacity-100 scale-110' : 'opacity-0 scale-50'}`} />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <Search className="w-4 h-4 text-text-sub" />
                                        <h3 className="text-xs font-bold text-text-sub uppercase tracking-widest">
                                            {searchQuery ? 'Search Results' : 'Select Repository'}
                                        </h3>
                                    </div>
                                    <div className="relative mb-4">
                                        <input
                                            type="text"
                                            placeholder="Type to search your repos..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-6 pr-4 py-4 bg-bg-main border border-border-main rounded-2xl 
                                                     text-text-main font-medium text-base
                                                     focus:outline-none focus:ring-2 focus:ring-accent-main/50 focus:border-accent-main
                                                     transition-all duration-200 placeholder-text-sub/50 shadow-inner"
                                        />
                                    </div>

                                    <div role="listbox" className="max-h-64 overflow-y-auto rounded-2xl border border-border-main bg-bg-main custom-scrollbar">
                                        {loadingRepos ? (
                                            <div className="py-16 flex flex-col items-center gap-4">
                                                <div className="w-8 h-8 border-2 border-accent-main border-t-transparent rounded-full animate-spin" />
                                                <span className="text-sm text-text-sub font-bold tracking-tight">Accessing GitHub Vault...</span>
                                            </div>
                                        ) : filteredRepos.length === 0 ? (
                                            <div className="py-16 text-center text-sm text-text-sub font-medium">
                                                {searchQuery ? 'No matches found' : 'No repositories available'}
                                            </div>
                                        ) : (
                                            filteredRepos.map((repo: Repo) => (
                                                <button
                                                    key={repo.id}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={selectedRepo === repo.full_name}
                                                    onClick={() => setSelectedRepo(repo.full_name)}
                                                    className={`w-full text-left px-6 py-4.5 border-b border-border-main/30 last:border-b-0
                                                               hover:bg-bg-hover transition-all duration-200
                                                               ${selectedRepo === repo.full_name ? 'bg-accent-main/10' : ''}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-sm font-bold transition-colors ${selectedRepo === repo.full_name ? 'text-accent-main' : 'text-text-main'}`}>
                                                            {repo.full_name}
                                                        </span>
                                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-bg-card text-text-sub border border-border-main">
                                                            {repo.private ? 'Private' : 'Public'}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                                
                                <button
                                    onClick={handleGithubSubmit}
                                    disabled={downloading || !selectedRepo || setRepo.isPending}
                                    className="w-full py-5 px-6 bg-accent-main hover:opacity-90 disabled:bg-bg-tertiary
                                             disabled:text-text-sub disabled:cursor-not-allowed
                                             text-white font-black uppercase tracking-widest rounded-2xl 
                                             transition-all duration-300 shadow-xl shadow-accent-main/20
                                             transform hover:scale-[1.01] active:scale-[0.99] border border-white/10"
                                >
                                    {downloading || setRepo.isPending ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Building History...</span>
                                        </div>
                                    ) : (
                                        <span>Start Visualizing</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </SignedIn>
                </div>
            </div>

            {error && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
                    <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-2xl text-red-500 text-sm font-bold backdrop-blur-xl shadow-2xl flex items-center gap-3">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
