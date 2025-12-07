'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSetRepo } from '@/hooks/useGitData';
import { useAppDispatch } from '@/store/hooks';
import { setRepoInfo } from '@/store/slices/appSlice';
import { SignedIn, SignedOut, SignInButton, useAuth, UserButton } from '@clerk/nextjs';
import { Github, Sparkles } from 'lucide-react';

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
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [selectedRepo, setSelectedRepo] = useState('');
    const [downloading, setDownloading] = useState(false);

    const dispatch = useAppDispatch();
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
        const nodeCount = 40;

        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 2 + 1,
            });
        }

        let animationId: number;
        const animate = () => {
            ctx.fillStyle = 'hsl(0 0% 2%)';
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

                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(other.x, other.y);
                        ctx.strokeStyle = `hsla(356, 100%, 35%, ${0.1 * (1 - dist / 150)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                });

                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'hsla(356, 100%, 40%, 0.4)';
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

    // Fetch repos when signed in
    useEffect(() => {
        if (isLoaded && isSignedIn) {
            fetchRepos();
        }
    }, [isLoaded, isSignedIn]);

    const fetchRepos = async () => {
        setLoadingRepos(true);
        try {
            const res = await fetch('/api/github/repos');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setRepos(data);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingRepos(false);
        }
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
            dispatch(setRepoInfo(repoInfo));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to open repository');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
            {/* Canvas background matching home screen */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 opacity-50"
            />

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

            <div className="relative z-10 w-full max-w-2xl mx-auto px-6 lg:px-8">
                {/* Logo and branding */}
                <div className="flex flex-col items-center mb-12">
                    <div className="relative mb-6">
                        <Image
                            src="/logo.png"
                            alt="Synn Logo"
                            width={280}
                            height={280}
                            className="drop-shadow-2xl"
                            priority
                        />
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight mb-3">
                        <span className="text-balance">
                            Select your{' '}
                            <span className="text-primary">SIN</span>
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground text-center max-w-xl">
                        Choose a repository to visualize your Git history
                    </p>
                </div>

                <div className="min-h-[300px]">
                    <div className="space-y-6">
                        <SignedOut>
                            <div className="text-center py-12 bg-card/50 backdrop-blur-sm border border-border rounded-xl p-8">
                                <Github className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-foreground mb-2 text-lg font-medium">Connect your GitHub</p>
                                <p className="text-muted-foreground mb-6 text-sm">Sign in to access your repositories</p>
                                <SignInButton mode="modal">
                                    <button className="relative inline-flex items-center gap-2 py-3.5 px-8 
                                                 bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f59e0b]
                                                 hover:from-[#b91c1c] hover:via-[#c2410c] hover:to-[#d97706]
                                                 text-white font-bold rounded-lg 
                                                 transition-all duration-300
                                                 shadow-[0_0_20px_rgba(220,38,38,0.5),0_0_40px_rgba(234,88,12,0.3)]
                                                 hover:shadow-[0_0_30px_rgba(220,38,38,0.7),0_0_60px_rgba(234,88,12,0.5)]
                                                 transform hover:scale-[1.05] active:scale-[0.98]
                                                 overflow-hidden group">
                                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                                                       translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                        <Github className="w-5 h-5 relative z-10 drop-shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
                                        <span className="relative z-10 drop-shadow-[0_0_4px_rgba(0,0,0,0.5)]">Sign In with GitHub</span>
                                    </button>
                                </SignInButton>
                            </div>
                        </SignedOut>
                        <SignedIn>
                            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        <span className="text-sm text-muted-foreground font-medium">Connected to GitHub</span>
                                    </div>
                                    <UserButton />
                                </div>
                                
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-foreground mb-3">
                                            <span className="text-foreground">Select your </span>
                                            <span className="text-primary font-black text-xl tracking-wider">
                                                SIN
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={selectedRepo}
                                                onChange={(e) => setSelectedRepo(e.target.value)}
                                                disabled={loadingRepos || downloading}
                                                className="w-full px-4 py-3.5 bg-background border-2 border-border rounded-lg 
                                                         text-foreground font-medium
                                                         focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                                                         transition-all duration-200 appearance-none
                                                         hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed
                                                         shadow-lg"
                                            >
                                                <option value="" disabled>
                                                    {loadingRepos ? 'Loading repositories...' : 'Choose your repository...'}
                                                </option>
                                                {repos.map((repo) => (
                                                    <option key={repo.id} value={repo.full_name}>
                                                        {repo.full_name} {repo.private ? '🔒' : '🌐'}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={handleGithubSubmit}
                                        disabled={downloading || !selectedRepo || setRepo.isPending}
                                        className="relative w-full py-4 px-6 
                                                 bg-gradient-to-r from-[#dc2626] via-[#ea580c] to-[#f59e0b]
                                                 hover:from-[#b91c1c] hover:via-[#c2410c] hover:to-[#d97706]
                                                 disabled:from-gray-700 disabled:via-gray-600 disabled:to-gray-700
                                                 disabled:text-gray-400 disabled:cursor-not-allowed
                                                 text-white font-bold rounded-lg 
                                                 transition-all duration-300
                                                 shadow-[0_0_20px_rgba(220,38,38,0.5),0_0_40px_rgba(234,88,12,0.3)]
                                                 hover:shadow-[0_0_30px_rgba(220,38,38,0.7),0_0_60px_rgba(234,88,12,0.5)]
                                                 disabled:shadow-none
                                                 focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-background
                                                 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none
                                                 overflow-hidden group"
                                    >
                                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                                                       translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 
                                                       disabled:translate-x-0" />
                                        {downloading || setRepo.isPending ? (
                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-5 w-5 drop-shadow-[0_0_4px_rgba(0,0,0,0.5)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span className="drop-shadow-[0_0_4px_rgba(0,0,0,0.5)]">Opening Repository...</span>
                                            </span>
                                        ) : (
                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                <Sparkles className="w-5 h-5 drop-shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
                                                <span className="drop-shadow-[0_0_4px_rgba(0,0,0,0.5)]">Visualize Repository</span>
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </SignedIn>
                    </div>

                    {error && (
                        <div className="mt-6 p-4 bg-destructive/20 border-2 border-destructive/50 rounded-lg text-destructive text-sm backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-sm text-muted-foreground">
                        Select your <span className="text-primary font-bold">SIN</span> to begin visualizing
                    </p>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </div>
    );
}
