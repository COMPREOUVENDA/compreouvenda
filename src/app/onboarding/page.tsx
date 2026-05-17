'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const ONBOARDING_KEY = 'onboarding_completed';

// ── SVG Icons ──────────────────────────────────────────────────────────────

function IconCamera() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
      <rect x="4" y="12" width="40" height="28" rx="5" stroke="white" strokeWidth="2.5" />
      <circle cx="24" cy="26" r="8" stroke="white" strokeWidth="2.5" />
      <circle cx="24" cy="26" r="3.5" fill="white" />
      <path d="M16 12l3-5h10l3 5" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="38" cy="18" r="2" fill="white" />
    </svg>
  );
}

function IconIA() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
      <rect x="6" y="10" width="36" height="28" rx="5" stroke="white" strokeWidth="2.5" />
      <text x="24" y="29" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="sans-serif">IA</text>
      <path d="M14 6v4M24 4v6M34 6v4" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14 38v4M24 38v6M34 38v4" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function IconPeople() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
      <circle cx="16" cy="16" r="6" stroke="white" strokeWidth="2.5" />
      <circle cx="32" cy="16" r="6" stroke="white" strokeWidth="2.5" />
      <path d="M4 40c0-7 5.4-12 12-12s12 5 12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M28 40c0-7 5.4-12 12-12s12 5 12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* outer glow ring */}
      <ellipse cx="40" cy="58" rx="32" ry="8" fill="#5B2D8E" opacity="0.4" />
      <ellipse cx="40" cy="54" rx="24" ry="5" fill="#5B2D8E" opacity="0.3" />
      {/* heart */}
      <path
        d="M40 62s-22-14-22-29a13 13 0 0 1 22-9.6A13 13 0 0 1 62 33c0 15-22 29-22 29z"
        fill="none"
        stroke="#F5921E"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* people inside heart */}
      <circle cx="33" cy="36" r="4" stroke="white" strokeWidth="1.8" />
      <path d="M27 47c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="47" cy="36" r="4" stroke="white" strokeWidth="1.8" />
      <path d="M41 47c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      {/* neon rings */}
      <ellipse cx="40" cy="66" rx="16" ry="3" stroke="#5B2D8E" strokeWidth="1.5" opacity="0.8" />
      <ellipse cx="40" cy="69" rx="10" ry="2" stroke="#0099DB" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

// ── Slide types ─────────────────────────────────────────────────────────────

type SlideIndex = 0 | 1 | 2;

// ── Main component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [current, setCurrent] = useState<SlideIndex>(0);
  const [animDir, setAnimDir] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if already completed — redirect to login
  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (done === 'true') {
      router.replace('/login');
    }
  }, [router]);

  const finish = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    router.push('/login');
  }, [router]);

  const goTo = useCallback(
    (index: number) => {
      if (isAnimating || index === current) return;
      const dir: 'left' | 'right' = index > current ? 'left' : 'right';
      setAnimDir(dir);
      setIsAnimating(true);
      setTimeout(() => {
        setCurrent(index as SlideIndex);
        setAnimDir(null);
        setIsAnimating(false);
      }, 320);
    },
    [current, isAnimating]
  );

  const goNext = useCallback(() => {
    if (current < 2) goTo(current + 1);
    else finish();
  }, [current, goTo, finish]);

  const goPrev = useCallback(() => {
    if (current > 0) goTo(current - 1);
  }, [current, goTo]);

  // Touch / drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Mouse drag for desktop
  const mouseStartX = useRef<number | null>(null);
  const handleMouseDown = (e: React.MouseEvent) => { mouseStartX.current = e.clientX; };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const dx = e.clientX - mouseStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) goNext();
      else goPrev();
    }
    mouseStartX.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden bg-[#0D0B1F] select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{ cursor: 'grab' }}
    >
      {/* Slides wrapper */}
      <div
        className="flex h-full w-full"
        style={{
          transform: animDir === 'left'
            ? 'translateX(-6%)'
            : animDir === 'right'
            ? 'translateX(6%)'
            : 'translateX(0)',
          opacity: isAnimating ? 0 : 1,
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.32s ease',
        }}
      >
        {current === 0 && <Slide1 onNext={goNext} onSkip={finish} goTo={goTo} />}
        {current === 1 && <Slide2 onNext={goNext} onSkip={finish} goTo={goTo} />}
        {current === 2 && <Slide3 onFinish={finish} goTo={goTo} />}
      </div>
    </div>
  );
}

// ── Shared header with logo ──────────────────────────────────────────────────

function LogoHeader() {
  return (
    <div className="flex justify-center pt-12 pb-2 px-6">
      <Image
        src="/logo-full.png"
        alt="CompreOuVenda.com"
        width={200}
        height={67}
        className="h-16 w-auto object-contain"
        priority
        draggable={false}
      />
    </div>
  );
}

// ── Dots indicator ───────────────────────────────────────────────────────────

interface DotsProps {
  current: number;
  goTo: (i: number) => void;
}

function Dots({ current, goTo }: DotsProps) {
  return (
    <div className="flex gap-2 justify-center mt-auto mb-8">
      {[0, 1, 2].map((i) => (
        <button
          key={i}
          onClick={() => goTo(i)}
          aria-label={`Ir para tela ${i + 1}`}
          className="rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            background: i === current ? '#5B2D8E' : 'rgba(255,255,255,0.3)',
          }}
        />
      ))}
    </div>
  );
}

// ── Skip button ──────────────────────────────────────────────────────────────

function SkipButton({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      onClick={onSkip}
      className="absolute top-14 right-6 text-white/50 text-sm font-medium hover:text-white/80 transition-colors z-10"
    >
      Pular
    </button>
  );
}

// ── SLIDE 1: Apresentação ────────────────────────────────────────────────────

interface Slide1Props {
  onNext: () => void;
  onSkip: () => void;
  goTo: (i: number) => void;
}

function Slide1({ onNext, onSkip, goTo }: Slide1Props) {
  return (
    <div className="relative flex flex-col w-full h-full overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="/images/onboarding-bg.jpeg"
          alt=""
          fill
          className="object-cover object-center"
          priority
          draggable={false}
        />
        {/* dark overlay gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(13,11,31,0.55) 0%, rgba(13,11,31,0.3) 40%, rgba(13,11,31,0.75) 70%, rgba(13,11,31,0.97) 100%)',
          }}
        />
      </div>

      {/* Skip */}
      <SkipButton onSkip={onSkip} />

      {/* Logo */}
      <div className="relative z-10">
        <LogoHeader />
      </div>

      {/* Spacer — pushes content down */}
      <div className="flex-1" />

      {/* Bottom content */}
      <div className="relative z-10 px-7 pb-0">
        <h1 className="font-display font-extrabold leading-tight text-white mb-3"
          style={{ fontSize: 'clamp(2rem, 8vw, 2.75rem)' }}>
          Venda fácil.
          <br />
          Doe com{' '}
          <span style={{ color: '#F5921E' }}>propósito.</span>
        </h1>
        <p className="text-white/65 font-body mb-8 leading-relaxed"
          style={{ fontSize: 'clamp(0.9rem, 3.5vw, 1.05rem)' }}>
          Transforme o que está parado em dinheiro e impacto social.
        </p>
      </div>

      {/* Dots */}
      <div className="relative z-10">
        <Dots current={0} goTo={goTo} />
      </div>
    </div>
  );
}

// ── SLIDE 2: Como funciona ───────────────────────────────────────────────────

interface Slide2Props {
  onNext: () => void;
  onSkip: () => void;
  goTo: (i: number) => void;
}

const steps = [
  {
    num: 1,
    color: '#F5921E',
    Icon: IconCamera,
    title: 'Tire uma foto ou vídeo',
    desc: 'Mostre seu produto de forma simples e rápida.',
  },
  {
    num: 2,
    color: '#5B2D8E',
    Icon: IconIA,
    title: 'A IA cria seu anúncio',
    desc: 'Geramos título, descrição, preço sugerido e categoria.',
  },
  {
    num: 3,
    color: '#F5921E',
    Icon: IconPeople,
    title: 'Conectamos você ao comprador',
    desc: 'Nossa plataforma divulga e aproxima quem quer comprar.',
  },
];

function Slide2({ onNext, onSkip, goTo }: Slide2Props) {
  return (
    <div className="relative flex flex-col w-full h-full bg-[#0D0B1F] overflow-hidden">
      {/* subtle background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(91,45,142,0.18) 0%, transparent 70%)',
        }}
      />

      {/* Skip */}
      <SkipButton onSkip={onSkip} />

      {/* Logo */}
      <LogoHeader />

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1 px-7 pt-6 pb-0">
        <h2
          className="font-display font-extrabold text-white mb-2 leading-tight"
          style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)' }}
        >
          É simples, rápido e seguro.
        </h2>
        <p className="text-white/60 font-body mb-8 leading-relaxed"
          style={{ fontSize: 'clamp(0.875rem, 3.2vw, 1rem)' }}>
          Nossa IA cuida do trabalho pesado para você vender mais.
        </p>

        <div className="flex flex-col gap-5">
          {steps.map((step) => (
            <div key={step.num} className="flex items-start gap-4">
              {/* icon circle */}
              <div
                className="relative flex-shrink-0 flex items-center justify-center rounded-full"
                style={{
                  width: 60,
                  height: 60,
                  background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.18) 0%, ${step.color}44 60%, ${step.color}22 100%)`,
                  border: `1.5px solid ${step.color}66`,
                  boxShadow: `0 0 18px ${step.color}44`,
                }}
              >
                <step.Icon />
                {/* number badge */}
                <span
                  className="absolute -top-1 -right-1 font-display font-extrabold text-white rounded-full flex items-center justify-center"
                  style={{
                    width: 20,
                    height: 20,
                    fontSize: 11,
                    background: step.color,
                    boxShadow: `0 2px 8px ${step.color}88`,
                  }}
                >
                  {step.num}
                </span>
              </div>
              {/* text */}
              <div className="flex-1 pt-1">
                <p className="font-display font-bold text-white leading-tight mb-1"
                  style={{ fontSize: 'clamp(0.95rem, 3.5vw, 1.1rem)' }}>
                  {step.title}
                </p>
                <p className="text-white/55 font-body leading-snug"
                  style={{ fontSize: 'clamp(0.8rem, 2.8vw, 0.9rem)' }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1" />
      </div>

      {/* Dots */}
      <Dots current={1} goTo={goTo} />
    </div>
  );
}

// ── SLIDE 3: Impacto Social ──────────────────────────────────────────────────

interface Slide3Props {
  onFinish: () => void;
  goTo: (i: number) => void;
}

function Slide3({ onFinish, goTo }: Slide3Props) {
  return (
    <div className="relative flex flex-col w-full h-full overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="/images/onboarding-bg.jpeg"
          alt=""
          fill
          className="object-cover object-center"
          draggable={false}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(13,11,31,0.7) 0%, rgba(13,11,31,0.4) 35%, rgba(13,11,31,0.6) 60%, rgba(13,11,31,0.96) 85%, rgba(13,11,31,1) 100%)',
          }}
        />
      </div>

      {/* Logo */}
      <div className="relative z-10">
        <LogoHeader />
      </div>

      {/* Main headline — top area */}
      <div className="relative z-10 px-7 pt-6">
        <h1 className="font-display font-extrabold leading-tight text-white"
          style={{ fontSize: 'clamp(1.75rem, 7.5vw, 2.5rem)' }}>
          Você vende.
          <br />
          O bem{' '}
          <span style={{ color: '#F5921E' }}>se multiplica.</span>
        </h1>
        <p className="text-white/65 font-body mt-3 leading-relaxed"
          style={{ fontSize: 'clamp(0.875rem, 3.2vw, 1rem)' }}>
          Parte do valor pode ser destinada a instituições beneficentes.
        </p>
      </div>

      {/* Heart icon centered */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <div
          className="relative"
          style={{
            width: 'min(45vw, 180px)',
            height: 'min(45vw, 180px)',
          }}
        >
          {/* outer neon glow ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(245,146,30,0.12) 0%, rgba(91,45,142,0.25) 50%, transparent 75%)',
              animation: 'pulse-slow 3s ease-in-out infinite',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <IconHeart />
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 px-7 pb-2">
        {/* Começar agora */}
        <button
          onClick={onFinish}
          className="w-full flex items-center justify-center gap-3 font-display font-bold text-white rounded-2xl transition-all duration-200 active:scale-[0.97] mb-3"
          style={{
            background: '#F5921E',
            padding: '16px 24px',
            fontSize: 'clamp(1rem, 3.8vw, 1.15rem)',
            boxShadow: '0 6px 28px rgba(245,146,30,0.45)',
          }}
        >
          Começar agora
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h12M10 4l6 6-6 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Pular */}
        <button
          onClick={onFinish}
          className="w-full flex items-center justify-center font-display font-semibold text-white rounded-2xl transition-all duration-200 active:scale-[0.97]"
          style={{
            padding: '14px 24px',
            fontSize: 'clamp(0.95rem, 3.5vw, 1.1rem)',
            border: '1.5px solid rgba(255,255,255,0.35)',
            background: 'transparent',
          }}
        >
          Pular
        </button>
      </div>

      {/* Dots */}
      <div className="relative z-10">
        <Dots current={2} goTo={goTo} />
      </div>
    </div>
  );
}
