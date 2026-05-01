'use client';

import { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react';

interface VideoPlayerProps {
  src?: string;
  thumbnail?: string;
  title?: string;
  autoPlay?: boolean;
}

export default function VideoPlayer({ src, thumbnail, title, autoPlay = false }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = 20; // 20 seconds

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      // Simulate playback progress
      const interval = setInterval(() => {
        setCurrentTime((t) => {
          if (t >= duration) {
            clearInterval(interval);
            setIsPlaying(false);
            return 0;
          }
          setProgress(((t + 0.1) / duration) * 100);
          return t + 0.1;
        });
      }, 100);
    }
  };

  return (
    <div className="relative aspect-[9/16] bg-gray-900 rounded-3xl overflow-hidden group">
      {/* Thumbnail / Video */}
      {thumbnail && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${thumbnail})` }}
        />
      )}
      <div className="absolute inset-0 bg-black/20" />

      {/* Play/Pause Overlay */}
      <button
        onClick={togglePlay}
        className="absolute inset-0 flex items-center justify-center z-10"
      >
        {!isPlaying && (
          <div className="bg-white/20 backdrop-blur-md rounded-full p-5 hover:bg-white/30 transition-all transform hover:scale-105">
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
        )}
      </button>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        {/* Progress bar */}
        <div className="w-full h-1 bg-white/20 rounded-full mb-3 cursor-pointer">
          <div
            className="h-full bg-white rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-white hover:text-brand-gold transition-colors">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
            </button>
            <button onClick={() => setIsMuted(!isMuted)} className="text-white hover:text-brand-gold transition-colors">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <span className="text-white/60 text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {title && (
            <span className="text-white text-xs font-medium truncate max-w-[120px]">{title}</span>
          )}
        </div>
      </div>

      {/* Video type badge */}
      <div className="absolute top-3 left-3 z-10">
        <span className="bg-brand-purple/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
          <Play className="w-2.5 h-2.5 fill-white" /> 20s
        </span>
      </div>
    </div>
  );
}
