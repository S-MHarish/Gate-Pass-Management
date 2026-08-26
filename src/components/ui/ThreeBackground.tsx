'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  alpha: number;
  color: string;
  pulseSpeed: number;
}

export const ThreeBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    // Check user preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setReducedMotion(true);
    }
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX - width / 2) * 0.05;
      mouseRef.current.targetY = (e.clientY - height / 2) * 0.05;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // Particle Palette
    const colors = [
      'rgba(52, 211, 153, ',  // Emerald 400
      'rgba(16, 185, 129, ',  // Emerald 500
      'rgba(56, 189, 248, ',  // Sky 400 (Cyan accent)
      'rgba(45, 212, 191, ',  // Teal 400
    ];

    let particles: Particle[] = [];
    const count = Math.min(Math.floor((width * height) / 16000), 75);

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < count; i++) {
        const baseSize = Math.random() * 2.2 + 0.8;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          size: baseSize,
          baseSize,
          alpha: Math.random() * 0.6 + 0.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          pulseSpeed: Math.random() * 0.02 + 0.005,
        });
      }
    };

    initParticles();

    let angle = 0;

    const render = () => {
      angle += 0.01;

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Deep emerald ambient gradient background
      const bgGrad = ctx.createRadialGradient(
        width / 2 + mouseRef.current.x * 2,
        height * 0.3 + mouseRef.current.y * 2,
        50,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.85
      );
      bgGrad.addColorStop(0, '#042820');
      bgGrad.addColorStop(0.5, '#021a15');
      bgGrad.addColorStop(1, '#010f0c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle 3D Geometric Grid Lines
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.035)';
      ctx.lineWidth = 1;
      const gridSize = 70;
      const offsetX = (mouseRef.current.x * 0.5) % gridSize;
      const offsetY = (mouseRef.current.y * 0.5) % gridSize;

      ctx.beginPath();
      for (let x = offsetX; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = offsetY; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Connect nearby particles with subtle glowing lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const lineAlpha = (1 - dist / 130) * 0.18;
            ctx.strokeStyle = `rgba(52, 211, 153, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw Particles with 3D Depth Glow
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx + mouseRef.current.x * 0.015;
        p.y += p.vy + mouseRef.current.y * 0.015;

        // Wrap edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Pulse size
        const currentSize = p.baseSize + Math.sin(angle + i) * 0.6;

        // Outer glow
        const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize * 3);
        glowGrad.addColorStop(0, `${p.color}${p.alpha})`);
        glowGrad.addColorStop(0.5, `${p.color}${p.alpha * 0.3})`);
        glowGrad.addColorStop(1, `${p.color}0)`);

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = `${p.color}${p.alpha * 1.5})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.8, currentSize), 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [reducedMotion]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {!reducedMotion ? (
        <canvas ref={canvasRef} className="w-full h-full block" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#042820] via-[#021a15] to-[#010f0c]" />
      )}

      {/* Decorative ambient glowing orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 left-1/4 w-[32rem] h-[32rem] bg-emerald-600/10 rounded-full blur-3xl" />
    </div>
  );
};
