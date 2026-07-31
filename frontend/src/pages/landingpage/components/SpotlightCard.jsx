import { useRef } from 'react';

export default function SpotlightCard({ children, className = '' }) {
  const ref = useRef(null);

  const handleMove = (event) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    ref.current.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
    ref.current.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
  };

  return (
    <div ref={ref} className={`spotlight-card ${className}`} onMouseMove={handleMove}>
      {children}
    </div>
  );
}
