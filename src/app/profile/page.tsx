'use client';

import { useUser } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GitHubContributionGraph } from '@/components/profile/GitHubContributionGraph';
import { Mail, Calendar, User, HelpCircle, ChevronLeft, Github, BarChart3 } from 'lucide-react';
import { useState, useRef } from 'react';
import { ShareModal } from '@/components/profile/ShareModal';
import { SharePopover } from '@/components/profile/SharePopover';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const profileContentRef = useRef<HTMLDivElement>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const {
    data: contributionsData,
  } = useQuery({
    queryKey: ['contributions'],
    queryFn: async () => {
      const res = await fetch('/api/contributions?days=371');
      if (!res.ok) {
        throw new Error('Failed to fetch contributions');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: isLoaded && !!user,
  });

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-t-transparent border-blue-500 rounded-full animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-[#161b22] border border-[#30363d] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <User className="w-8 h-8 text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Sign in Required</h1>
          <p className="text-gray-400 mb-8">Please sign in to view your developer profile and activity history.</p>
          <Link href="/app">
            <button className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20">
              Go to App
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col relative overflow-hidden">
      {/* Soft background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />
      </div>

      <Header />
      
      <main ref={profileContentRef} className="flex-1 container mx-auto px-4 py-12 max-w-5xl relative z-10">
        <div className="flex flex-col gap-8">
          {/* Profile Header */}
          <div className="bg-[#161b22]/50 backdrop-blur-xl border border-[#30363d] rounded-2xl p-8 relative overflow-hidden shadow-2xl">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
              {/* Avatar */}
              <div className="shrink-0 relative">
                <img
                  src={user.imageUrl}
                  alt={user.fullName || user.username || 'Profile'}
                  className="w-32 h-32 rounded-3xl border-4 border-[#30363d] shadow-2xl object-cover"
                />
                <div className="absolute -bottom-2 -right-2 bg-blue-600 rounded-xl p-2 shadow-lg border-2 border-[#161b22]">
                  <Github className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="mb-6">
                  <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">
                    {user.fullName || user.username || 'Developer'}
                  </h1>
                  {user.username && (
                    <p className="text-blue-500 font-mono text-lg font-bold">@{user.username}</p>
                  )}
                </div>

                {/* User Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {user.primaryEmailAddress && (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0d1117]/50 rounded-xl border border-[#30363d]/50 text-gray-300">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium truncate">{user.primaryEmailAddress.emailAddress}</span>
                    </div>
                  )}
                  
                  {user.createdAt && (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0d1117]/50 rounded-xl border border-[#30363d]/50 text-gray-300">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">
                        Joined {new Date(user.createdAt).toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex md:flex-col gap-2">
                <button 
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20"
                >
                  Share Profile
                </button>
              </div>
            </div>
          </div>

          {/* Contribution Graph Section */}
          <div className="bg-[#161b22]/50 backdrop-blur-xl border border-[#30363d] rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Activity Overview</h2>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mt-0.5">Commit History</p>
                </div>
              </div>
              
              <div className="group relative">
                <HelpCircle className="w-5 h-5 text-gray-600 hover:text-blue-500 cursor-help transition-colors" />
                <div className="absolute right-0 bottom-full mb-3 w-72 p-4 bg-[#1c2128] border border-[#30363d] rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                  <div className="text-sm font-bold text-white mb-2">How it works</div>
                  <div className="text-xs text-gray-400 leading-relaxed">
                    This graph visualizes your unique commit activity across all repositories synced with Synn. 
                    Each square represents a day of development.
                  </div>
                  <div className="absolute right-2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-[#1c2128]" />
                </div>
              </div>
            </div>

            <div className="bg-[#0d1117]/50 rounded-2xl p-6 border border-[#30363d]/50">
              <GitHubContributionGraph profileContentRef={profileContentRef} />
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {isLoaded && user && (
        <ShareModal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)}
          contributionsData={contributionsData}
          profileContentRef={profileContentRef}
        />
      )}
    </div>
  );
}
