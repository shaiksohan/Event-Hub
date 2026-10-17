import { useEffect } from 'react';

export function useScrollReveal() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) {
      const revealAll = () => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('reveal--visible'));
      revealAll();
      const interval = setInterval(revealAll, 1000);
      return () => clearInterval(interval);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    const scan = () => {
      document.querySelectorAll('.reveal:not(.reveal--visible)').forEach((el) => observer.observe(el));
    };

    scan();

    const timer = setTimeout(scan, 200);
    const loadTimer = setTimeout(scan, 800);
    const longTimer = setTimeout(scan, 2000);

    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mo.disconnect();
      clearTimeout(timer);
      clearTimeout(loadTimer);
      clearTimeout(longTimer);
    };
  }, []);
}
