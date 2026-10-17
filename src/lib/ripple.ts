import type { MouseEvent } from 'react';

export function createRipple(event: MouseEvent<HTMLElement>) {
  const target = event.currentTarget;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const existing = target.querySelector('.ripple-wave');
  if (existing) existing.remove();

  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const wave = document.createElement('span');
  wave.className = 'ripple-wave';
  wave.style.width = `${size}px`;
  wave.style.height = `${size}px`;
  wave.style.left = `${event.clientX - rect.left - size / 2}px`;
  wave.style.top = `${event.clientY - rect.top - size / 2}px`;

  target.appendChild(wave);
  setTimeout(() => wave.remove(), 600);
}
