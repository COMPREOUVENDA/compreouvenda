'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  sizes?: string;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  fallbackSrc?: string;
}

const DEFAULT_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3Cpath d='M160 140h80v80h-80z' fill='%23e5e7eb'/%3E%3Cpath d='M200 100l60 80H140l60-80z' fill='%23d1d5db'/%3E%3Ccircle cx='240' cy='160' r='15' fill='%23d1d5db'/%3E%3C/svg%3E";

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  containerClassName,
  priority = false,
  sizes = '(max-width: 768px) 100vw, 50vw',
  aspectRatio,
  objectFit = 'cover',
  fallbackSrc,
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src || DEFAULT_FALLBACK);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(!src);

  const handleError = () => {
    setHasError(true);
    setImgSrc(fallbackSrc || DEFAULT_FALLBACK);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (fill) {
    return (
      <div
        className={cn('relative overflow-hidden', containerClassName)}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {/* Shimmer while loading */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" aria-hidden="true" />
        )}

        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
            <svg
              className="w-10 h-10 text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs text-gray-400">{alt}</span>
          </div>
        ) : (
          <Image
            src={imgSrc}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className={cn(
              'transition-opacity duration-300',
              isLoading ? 'opacity-0' : 'opacity-100',
              objectFit === 'cover' && 'object-cover',
              objectFit === 'contain' && 'object-contain',
              objectFit === 'fill' && 'object-fill',
              className
            )}
            onError={handleError}
            onLoad={handleLoad}
            placeholder="blur"
            blurDataURL={DEFAULT_FALLBACK}
          />
        )}
      </div>
    );
  }

  // Fixed size
  return (
    <div
      className={cn('relative overflow-hidden', containerClassName)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {isLoading && !hasError && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse rounded-inherit"
          aria-hidden="true"
        />
      )}

      {hasError ? (
        <div
          className="flex flex-col items-center justify-center bg-gray-100"
          style={{ width: width || '100%', height: height || '100%' }}
        >
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      ) : (
        <Image
          src={imgSrc}
          alt={alt}
          width={width || 400}
          height={height || 400}
          sizes={sizes}
          priority={priority}
          className={cn(
            'transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100',
            objectFit === 'cover' && 'object-cover',
            objectFit === 'contain' && 'object-contain',
            className
          )}
          onError={handleError}
          onLoad={handleLoad}
          placeholder="blur"
          blurDataURL={DEFAULT_FALLBACK}
        />
      )}
    </div>
  );
}
