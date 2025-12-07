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

    // Fire/flame background animation
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

        const particles: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            life: number;
            maxLife: number;
            size: number;
        }> = [];

        const createParticle = () => {
            particles.push({
                x: Math.random() * canvas.width,
                y: canvas.height + 20,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -Math.random() * 2 - 1,
                life: 0,
                maxLife: Math.random() * 100 + 50,
                size: Math.random() * 3 + 2,
            });
        };

        // Create initial particles
        for (let i = 0; i < 30; i++) {
            createParticle();
        }

        const animate = () => {
            ctx.fillStyle = 'rgba(13, 17, 23, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Create new particles
            if (Math.random() < 0.3) {
                createParticle();
            }

            // Update and draw particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life++;
                p.vy *= 0.98; // Gravity effect
                p.vx *= 0.99; // Friction

                const lifeRatio = p.life / p.maxLife;
                const alpha = 1 - lifeRatio;
                const size = p.size * (1 - lifeRatio * 0.5);

                // Draw flame particle with gradient
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2);
                gradient.addColorStop(0, `rgba(239, 68, 68, ${alpha * 0.8})`);
                gradient.addColorStop(0.5, `rgba(249, 115, 22, ${alpha * 0.6})`);
                gradient.addColorStop(1, `rgba(239, 68, 68, 0)`);

                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Remove dead particles
                if (p.life >= p.maxLife || p.y < -20) {
                    particles.splice(i, 1);
                }
            }

            requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resize);
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
            // Select repository using GitHub API (no download needed)
            const repoInfo = await setRepo.mutateAsync({ 
                repoFullName: repo.full_name, 
                defaultBranch: repo.default_branch || 'main' // Ensure it's always a string
            });
            dispatch(setRepoInfo(repoInfo));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to open repository');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1117] p-8 relative overflow-hidden">
            {/* Fire/flame background canvas */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 opacity-40 pointer-events-none"
            />

            {/* Background gradient effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117]" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ef4444]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#238636]/5 rounded-full blur-3xl" />
            
            <div className="relative z-10 w-full max-w-lg">
                {/* Logo and branding */}
                <div className="flex flex-col items-center mb-12">
                    <div className="relative mb-6">
                        <Image
                            src="/logo.png"
                            alt="Synn Logo"
                            width={140}
                            height={140}
                            className="drop-shadow-2xl"
                            priority
                        />
                        <div className="absolute -top-1 -right-1">
                            <Sparkles className="w-5 h-5 text-[#ef4444] animate-pulse" />
                        </div>
                    </div>
                    <h1 className="text-5xl font-bold text-center mb-3 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                        Synn
                    </h1>
                    <p className="text-center text-gray-400 text-lg">
                        Visualize your Git history
                    </p>
                </div>

                <div className="min-h-[300px]">
                    <div className="space-y-6">
                        <SignedOut>
                            <div className="text-center py-12 bg-[#161b22]/50 backdrop-blur-sm border border-[#30363d] rounded-xl p-8">
                                <Github className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-300 mb-2 text-lg font-medium">Connect your GitHub</p>
                                <p className="text-gray-500 mb-6 text-sm">Sign in to access your repositories</p>
                                <SignInButton mode="modal">
                                    <button className="inline-flex items-center gap-2 py-3 px-6 bg-gradient-to-r from-[#238636] to-[#2ea043] hover:from-[#2ea043] hover:to-[#238636] text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-[#238636]/20 hover:shadow-[#238636]/40">
                                        <Github className="w-5 h-5" />
                                        Sign In with GitHub
                                    </button>
                                </SignInButton>
                            </div>
                        </SignedOut>
                        <SignedIn>
                            <div className="bg-[#161b22]/50 backdrop-blur-sm border border-[#30363d] rounded-xl p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-[#238636] animate-pulse" />
                                        <span className="text-sm text-gray-400 font-medium">Connected to GitHub</span>
                                    </div>
                                    <UserButton />
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="flex text-sm font-semibold text-gray-200 mb-3 items-center gap-2">
                                            <span className="text-gray-300">Select your</span>
                                            <span className="text-[#8b1a1a] font-black text-xl tracking-wider drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                                                SIN
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={selectedRepo}
                                                onChange={(e) => setSelectedRepo(e.target.value)}
                                                disabled={loadingRepos || downloading}
                                                className="w-full px-4 py-3.5 bg-[#0d1117] border-2 border-[#30363d] rounded-lg 
                                                         text-gray-100 font-medium
                                                         focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:border-[#ef4444]
                                                         transition-all duration-200 appearance-none
                                                         hover:border-[#40464d] disabled:opacity-50 disabled:cursor-not-allowed
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
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={handleGithubSubmit}
                                        disabled={downloading || !selectedRepo || setRepo.isPending}
                                        className="w-full py-3.5 px-6 bg-gradient-to-r from-[#ef4444] to-[#f97316] hover:from-[#f97316] hover:to-[#ef4444] 
                                                 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed
                                                 text-white font-semibold rounded-lg transition-all duration-300
                                                 focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:ring-offset-2 focus:ring-offset-[#0d1117]
                                                 shadow-lg shadow-[#ef4444]/20 hover:shadow-[#ef4444]/40
                                                 transform hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {downloading || setRepo.isPending ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Opening Repository...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                <Sparkles className="w-5 h-5" />
                                                Visualize Repository
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </SignedIn>
                    </div>

                    {error && (
                        <div className="mt-6 p-4 bg-red-900/20 border-2 border-red-800/50 rounded-lg text-red-300 text-sm backdrop-blur-sm">
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
                    <p className="text-sm text-gray-500">
                        Select your <span className="text-[#8b1a1a] font-bold drop-shadow-[0_0_4px_rgba(239,68,68,0.3)]">SIN</span> to begin visualizing
                    </p>
                </div>
            </div>
        </div>
    );
}
