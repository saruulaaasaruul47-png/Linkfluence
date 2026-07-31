import { motion } from 'motion/react';

export default function BlurText({ children, className = '', delay = 0 }) {
  const words = String(children).split(' ');

  return (
    <span className={`blur-text ${className}`} aria-label={children}>
      {words.map((word, index) => (
        <motion.span
          aria-hidden="true"
          key={`${word}-${index}`}
          initial={{ opacity: 0, y: 22, filter: 'blur(12px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.65 }}
          transition={{
            duration: 0.72,
            delay: delay + index * 0.065,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {word}&nbsp;
        </motion.span>
      ))}
    </span>
  );
}
