'use client';

import { useState, useEffect } from 'react';
import { useSetRepo } from '@/hooks/useGitData';
import { useAppDispatch } from '@/store/hooks';
import { setRepoInfo } from '@/store/slices/appSlice';
import { SignedIn, SignedOut, SignInButton, useAuth, UserButton } from '@clerk/nextjs';

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

    // GitHub State
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [selectedRepo, setSelectedRepo] = useState('');
    const [downloading, setDownloading] = useState(false);

    const dispatch = useAppDispatch();
    const setRepo = useSetRepo();
    const { isLoaded, isSignedIn } = useAuth();

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
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1117] p-8">
            <div className="w-full max-w-md">
                <h1 className="text-3xl font-bold text-center mb-2 text-white">
                    Synn
                </h1>
                <p className="text-center text-gray-400 mb-8">
                    A beautiful Git branch visualizer
                </p>

                <div className="min-h-[200px]">
                    <div className="space-y-4">
                        <SignedOut>
                            <div className="text-center py-8">
                                <p className="text-gray-400 mb-4">Sign in to access your repositories</p>
                                <SignInButton mode="modal">
                                    <button className="py-2 px-4 bg-[#238636] hover:bg-[#2ea043] text-white font-medium rounded-lg transition-colors">
                                        Sign In with GitHub
                                    </button>
                                </SignInButton>
                            </div>
                        </SignedOut>
                        <SignedIn>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm text-gray-400">Connected to GitHub</span>
                                <UserButton />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Select Repository
                                </label>
                                <select
                                    value={selectedRepo}
                                    onChange={(e) => setSelectedRepo(e.target.value)}
                                    disabled={loadingRepos || downloading}
                                    className="w-full px-4 py-3 bg-[#161b22] border border-[#30363d] rounded-lg 
                                             text-gray-100 
                                             focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:border-transparent
                                             transition-colors appearance-none"
                                >
                                    <option value="" disabled>
                                        {loadingRepos ? 'Loading Repos...' : 'Choose a repository...'}
                                    </option>
                                    {repos.map((repo) => (
                                        <option key={repo.id} value={repo.full_name}>
                                            {repo.full_name} ({repo.private ? 'Private' : 'Public'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleGithubSubmit}
                                disabled={downloading || !selectedRepo || setRepo.isPending}
                                className="w-full py-3 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#238636]/50
                                         text-white font-medium rounded-lg transition-colors
                                         focus:outline-none focus:ring-2 focus:ring-[#ef4444]"
                            >
                                {downloading || setRepo.isPending ? 'Opening Repository...' : 'Visualise Repository'}
                            </button>
                        </SignedIn>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>Import a repository from GitHub to visualize</p>
                </div>
            </div>
        </div>
    );
}
