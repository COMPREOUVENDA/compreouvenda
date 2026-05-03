'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  endDate: string;
  onExpire?: () => void;
  compact?: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function CountdownTimer({ endDate, onExpire, compact = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        onExpire?.();
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ days, hours, minutes, seconds, expired: false });
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endDate, onExpire]);

  const totalHoursLeft =
    timeLeft.days * 24 + timeLeft.hours;
  const isUrgent = !timeLeft.expired && totalHoursLeft < 1;

  if (timeLeft.expired) {
    return (
      <span className={`flex items-center gap-1 text-gray-400 ${compact ? 'text-[10px]' : 'text-sm'}`}>
        <Clock className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        Expirado
      </span>
    );
  }

  if (compact) {
    const display = timeLeft.days > 0
      ? `${timeLeft.days}d ${pad(timeLeft.hours)}h`
      : `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;

    return (
      <span
        className={`flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full ${
          isUrgent
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-brand-orange/10 text-brand-orange'
        }`}
      >
        <Clock className="w-3 h-3" />
        {display}
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 ${
        isUrgent ? 'text-red-500' : 'text-brand-orange'
      }`}
    >
      <Clock className={`w-4 h-4 ${isUrgent ? 'animate-pulse' : ''}`} />
      {timeLeft.days > 0 && (
        <span className="font-display font-bold">
          {timeLeft.days}d{' '}
        </span>
      )}
      <div className="flex items-center gap-1 font-display font-bold text-lg">
        <span>{pad(timeLeft.hours)}</span>
        <span className={isUrgent ? 'animate-pulse' : ''}>:</span>
        <span>{pad(timeLeft.minutes)}</span>
        <span className={isUrgent ? 'animate-pulse' : ''}>:</span>
        <span>{pad(timeLeft.seconds)}</span>
      </div>
    </div>
  );
}
