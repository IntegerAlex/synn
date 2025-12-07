'use client';

import { useState } from 'react';
import { useSetRepo } from '@/hooks/useGitData';
import { useAppDispatch } from '@/store/hooks';
import { setRepoInfo } from '@/store/slices/appSlice';

export function RepoSelector() {
    const [path, setPath] = useState('/home/akshat/projects/gitkarken');
    const [error, setError] = useState<string | null>(null);
    const dispatch = useAppDispatch();
    const setRepo = useSetRepo();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const repoInfo = await setRepo.mutateAsync(path);
            dispatch(setRepoInfo(repoInfo));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to open repository');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1117] p-8">
            <div className="w-full max-w-md">
                <h1 className="text-3xl font-bold text-center mb-2 text-white">
                    GitVis
                </h1>
                <p className="text-center text-gray-400 mb-8">
                    A beautiful Git branch visualizer
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="repo-path"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Repository Path
                        </label>
                        <input
                            id="repo-path"
                            type="text"
                            value={path}
                            onChange={(e) => setPath(e.target.value)}
                            placeholder="/path/to/git/repo"
                            className="w-full px-4 py-3 bg-[#161b22] border border-[#30363d] rounded-lg 
                                     text-gray-100 placeholder-gray-500 
                                     focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent
                                     transition-colors"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={setRepo.isPending || !path.trim()}
                        className="w-full py-3 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#238636]/50
                                 text-white font-medium rounded-lg transition-colors
                                 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]"
                    >
                        {setRepo.isPending ? 'Opening...' : 'Open Repository'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>Enter the absolute path to a Git repository</p>
                </div>
            </div>
        </div>
    );
}
