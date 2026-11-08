import React from 'react';
import { Camera, Grid3X3, Sliders, Palette, FolderOpen, Image as ImageIcon } from 'lucide-react';
import type { PhotographySession } from '../../types/session';

export type MainNavTab = 'camera' | 'grid' | 'pro' | 'look' | 'sessions' | 'gallery';

interface MainNavigationBarProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  activeSession?: PhotographySession | null;
  photoCount?: number;
  activeLookName?: string | null;
}

export const MainNavigationBar: React.FC<MainNavigationBarProps> = ({
  activeTab,
  onSelectTab,
  activeSession,
  photoCount = 0,
  activeLookName,
}) => {
  const tabs: { id: MainNavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'camera', label: 'Camera', icon: <Camera size={15} /> },
    { id: 'grid', label: 'Grid', icon: <Grid3X3 size={16} /> },
    { id: 'pro', label: 'Pro', icon: <Sliders size={16} /> },
    {
      id: 'look',
      label: 'Look',
      icon: <Palette size={16} />,
      badge: activeLookName ? 'LUT' : undefined,
    },
    {
      id: 'sessions',
      label: 'Sessions',
      icon: <FolderOpen size={16} />,
      badge: activeSession ? 'ACTIVE' : undefined,
    },
    {
      id: 'gallery',
      label: 'Gallery',
      icon: <ImageIcon size={16} />,
      badge: photoCount > 0 ? `${photoCount}` : undefined,
    },
  ];

  return (
    <nav aria-label="Primary" className="w-full bg-[#0a0b0e] px-2 py-0.5 flex items-center justify-between select-none z-30">
      <div className="flex items-center gap-1 w-full justify-around sm:justify-center sm:gap-2 text-xs font-mono overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              aria-current={isSelected ? 'page' : undefined}
              title={tab.label}
              className={`relative h-9 w-12 justify-center rounded-full flex items-center transition-colors flex-shrink-0 ${
                isSelected ? 'text-amber-400' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {tab.icon}
              {/* Inactive tabs are icon-only so six tabs fit a phone; label stays for screen readers */}
              <span className="sr-only">{tab.label}</span>
              {isSelected && <span aria-hidden="true" className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />}

              {/* Status Badge */}
              {tab.badge &&
                (/^\d+$/.test(tab.badge) ? (
                  <span className="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-black text-[10px] font-bold leading-4 text-center">
                    {tab.badge}
                  </span>
                ) : (
                  // Status words become a small dot; the word stays for screen readers
                  <span
                    className={`absolute top-1.5 right-2 w-2 h-2 rounded-full ${tab.badge === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  >
                    <span className="sr-only">{tab.badge}</span>
                  </span>
                ))}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
