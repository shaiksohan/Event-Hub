import { useEffect, type CSSProperties } from 'react';

type MotionStyle = CSSProperties & {
  '--motion-x'?: string;
  '--motion-y'?: string;
};

export default function DepthMotion() {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    const updateParallax = (event: PointerEvent) => {
      if (reducedMotion.matches) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = ((event.clientX / window.innerWidth) - 0.5) * 22;
        const y = ((event.clientY / window.innerHeight) - 0.5) * 16;
        document.documentElement.style.setProperty('--motion-x', `${x.toFixed(2)}px`);
        document.documentElement.style.setProperty('--motion-y', `${y.toFixed(2)}px`);
      });
    };

    window.addEventListener('pointermove', updateParallax, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', updateParallax);
    };
  }, []);

  const style: MotionStyle = {
    '--motion-x': '0px',
    '--motion-y': '0px',
  };

  return (
    <div className="depth-motion" aria-hidden="true" style={style}>
      <div className="depth-motion__aurora" />
      <div className="depth-motion__grid" />
      <div className="depth-motion__orb depth-motion__orb--one" />
      <div className="depth-motion__orb depth-motion__orb--two" />
      <div className="depth-motion__orb depth-motion__orb--three" />
      <div className="depth-motion__ring depth-motion__ring--one" />
      <div className="depth-motion__ring depth-motion__ring--two" />
      <div className="depth-motion__shape depth-motion__shape--one" />
      <div className="depth-motion__shape depth-motion__shape--two" />
      <div className="depth-motion__shape depth-motion__shape--three" />
      <div className="depth-motion__spark depth-motion__spark--one" />
      <div className="depth-motion__spark depth-motion__spark--two" />
      <div className="depth-motion__spark depth-motion__spark--three" />
      <div className="depth-motion__spark depth-motion__spark--four" />
      <div className="depth-motion__spark depth-motion__spark--five" />
    </div>
  );
}
