'use client';

import { useUser } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GitHubContributionGraph } from '@/components/profile/GitHubContributionGraph';
import { Flame, Mail, Calendar, Skull, HelpCircle } from 'lucide-react';
import { useState, useRef } from 'react';

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const profileContentRef = useRef<HTMLDivElement>(null);

  const {
    data: roastData,
    isLoading: roastLoading,
    isError: roastError,
  } = useQuery({
    queryKey: ['roast'],
    queryFn: async () => {
      const res = await fetch('/api/roast');
      const json = await res.json();
      if (!res.ok && res.status !== 409) {
        throw new Error(json?.message || 'Failed to fetch roast');
      }
      return json;
    },
    staleTime: 10 * 60 * 1000,
    enabled: isLoaded && !!user,
  });

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
          <div className="w-5 h-5 border-2 border-t-transparent border-[#ef4444] rounded-full animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in</h1>
          <p className="text-gray-400">You need to be signed in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Animated embers/flames */}
        <div className="absolute top-0 left-0 w-full h-full">
          {[...Array(20)].map((_, i) => {
            const delay = Math.random() * 5;
            const duration = Math.random() * 10 + 10;
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            const size = Math.random() * 4 + 2;
            
            return (
              <div
                key={i}
                className="absolute rounded-full opacity-20"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: '#ef4444',
                  animation: `float-ember ${duration}s infinite ease-in-out`,
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}
        </div>
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(#ef4444 1px, transparent 1px),
              linear-gradient(90deg, #ef4444 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
        
        {/* Radial gradient overlays */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ef4444]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#7d1a1a]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Decorative text overlay - subtle */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.02]">
          <div className="text-[#ef4444] text-9xl font-bold select-none" style={{ fontFamily: 'var(--font-mono)' }}>
            SIN
          </div>
        </div>
      </div>

      <Header />
      
      <main ref={profileContentRef} className="flex-1 container mx-auto px-4 py-8 max-w-6xl relative z-10">
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr] items-stretch">
          <div className="flex flex-col gap-6 h-full">
            {/* Profile Header */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 relative overflow-hidden">
              {/* Subtle hellfire glow effect */}
              <div className="absolute inset-0 bg-linear-to-br from-[#ef4444]/5 via-transparent to-transparent pointer-events-none" />
              
              <div className="flex items-start gap-6 relative z-10">
                {/* Avatar */}
                <div className="shrink-0 relative">
                  <img
                    src={user.imageUrl}
                    alt={user.fullName || user.username || 'Profile'}
                    className="relative w-24 h-24 rounded-full border-2 border-[#ef4444]/50"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-[#161b22] rounded-full p-1 border border-[#ef4444]/30">
                    <Flame className="w-4 h-4 text-[#ef4444]" />
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white mb-1">
                    {user.fullName || user.username || 'User'}
                  </h1>
                  {user.username && (
                    <p className="text-[#ef4444] mb-4">@{user.username}</p>
                  )}

                  {/* User Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {user.primaryEmailAddress && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Mail className="w-4 h-4 text-[#ef4444]/70" />
                        <span className="text-sm">{user.primaryEmailAddress.emailAddress}</span>
                      </div>
                    )}
                    
                    {user.createdAt && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="w-4 h-4 text-[#ef4444]/70" />
                        <span className="text-sm">
                          Descended {new Date(user.createdAt).toLocaleDateString('en-US', { 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-gray-300">
                      <Skull className="w-4 h-4 text-[#ef4444]/70" />
                      <span className="text-sm">
                        {(user.publicMetadata?.role as string) || 'Sinner'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contribution Graph Section */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 flex-1">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <span className="text-[#ef4444]">🔥</span> Sin Registry
                </h2>
                <div className="group relative">
                  <HelpCircle className="w-4 h-4 text-gray-500 hover:text-[#ef4444] cursor-help transition-colors" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-[#21262d] border border-[#ef4444]/30 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="text-xs mb-1 font-semibold text-[#ef4444]">Why "Sins"?</div>
                    <div className="text-xs text-gray-300 leading-relaxed">
                      Each commit is a <span className="text-[#ef4444]">sin</span> — you're adding more tech debt, 
                      your garbage code makes the world worse, and sometimes you <span className="text-[#ef4444]">put production down</span>. 
                      This is your eternal record of transgressions. Welcome to hell. 🔥
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#ef4444]/30" />
                  </div>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-6">
                Your transgressions across all repositories over the past year
              </p>
              <GitHubContributionGraph profileContentRef={profileContentRef} />
            </div>
          </div>

          {/* My Thoughts */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-[#ef4444]" />
              <h3 className="text-lg font-semibold text-white">I know what you've done</h3>
            </div>

            {roastLoading && (
              <div className="text-gray-400 text-sm">Conjuring torment...</div>
            )}

            {roastError && (
              <div className="text-red-400 text-sm">Failed to summon my thoughts.</div>
            )}

            {!roastLoading && !roastError && roastData?.needsSync && (
              <div className="text-gray-400 text-sm">
                Sync your contributions first. I await fresh sins.
              </div>
            )}

            {!roastLoading && !roastError && roastData?.roast && (
              <p className="text-[#ef4444] text-sm leading-relaxed whitespace-pre-wrap">
                {roastData.roast}
              </p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
