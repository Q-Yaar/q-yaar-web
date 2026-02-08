import React from 'react';
import { Shield } from 'lucide-react';

interface TeamAvatarProps {
  teamName: string;
  teamColor: string;
  className?: string; // Allow overriding/adding styles
}

export function TeamAvatar({
  teamName,
  teamColor,
  className,
}: TeamAvatarProps) {
  // Helper to get border color class
  const getBorderColor = (color: string) => {
    if (!color) return 'border-gray-400';

    const normalizeColor = color.toLowerCase();

    // Explicit color names
    if (normalizeColor.includes('red')) return 'border-red-500';
    if (normalizeColor.includes('blue')) return 'border-blue-500';
    if (normalizeColor.includes('green')) return 'border-green-500';
    if (normalizeColor.includes('yellow')) return 'border-yellow-500';
    if (normalizeColor.includes('purple')) return 'border-purple-500';
    if (normalizeColor.includes('pink')) return 'border-pink-500';
    if (normalizeColor.includes('indigo')) return 'border-indigo-500';
    if (normalizeColor.includes('gray')) return 'border-gray-500';
    if (normalizeColor.includes('orange')) return 'border-orange-500';
    if (normalizeColor.includes('teal')) return 'border-teal-500';
    if (normalizeColor.includes('cyan')) return 'border-cyan-500';

    // If it's a tailwind bg class (e.g. bg-red-500), convert to border
    if (color.startsWith('bg-')) {
      return color.replace('bg-', 'border-');
    }

    return 'border-gray-400';
  };

  const getColor = (color: string) => {
    const boarderColor = getBorderColor(color);
    return boarderColor.replace('border-', '');
  };

  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center bg-white border-2 shadow-sm  text-${getColor(teamColor)} ${getBorderColor(
        teamColor,
      )} ${className || ''}`}
      title={teamName}
    >
      <Shield className={`fill-${getColor(teamColor)}`} />
    </div>
  );
}
