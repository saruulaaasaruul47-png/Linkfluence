import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const creatorData = [
  {
    name: 'Marina Matos',
    niche: 'Lifestyle Creator',
    followers: '125K followers',
    location: 'Barcelona · ES',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=88',
    color: '#8ac43f',
  },
  {
    name: 'Ari Lennox',
    niche: 'Fashion & Beauty',
    followers: '890K followers',
    location: 'London · UK',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=88',
    color: '#ff7bbb',
  },
  {
    name: 'Noah Kim',
    niche: 'Tech Storyteller',
    followers: '340K followers',
    location: 'Seoul · KR',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1000&q=88',
    color: '#7fc6ff',
  },
  {
    name: 'Zoe Parker',
    niche: 'Travel Filmmaker',
    followers: '2.1M followers',
    location: 'Sydney · AU',
    image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1000&q=88',
    color: '#f3a85a',
  },
];

const wrap = (value, length) => ((value % length) + length) % length;

export default function CreatorStack() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);

  const visible = useMemo(
    () => [0, 1, 2].map((offset) => creatorData[wrap(active + offset, creatorData.length)]),
    [active],
  );

  const move = (step) => {
    setDirection(step);
    setActive((current) => wrap(current + step, creatorData.length));
  };

  return (
    <div className="creator-stack-shell">
      <div className="creator-glow" aria-hidden="true" />
      <div className="creator-stack" aria-live="polite">
        {visible
          .slice()
          .reverse()
          .map((creator, reverseIndex) => {
            const index = visible.length - 1 - reverseIndex;
            const isFront = index === 0;
            return (
              <motion.article
                key={`${creator.name}-${index}`}
                className={`creator-card ${isFront ? 'is-front' : ''}`}
                initial={{ opacity: 0, y: direction > 0 ? 50 : -50, scale: 0.92 }}
                animate={{
                  opacity: 1 - index * 0.24,
                  y: -index * 34,
                  scale: 1 - index * 0.055,
                  zIndex: 10 - index,
                }}
                transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                style={{ '--creator-color': creator.color }}
              >
                <img src={creator.image} alt="" loading={isFront ? 'eager' : 'lazy'} />
                <div className="creator-card-shade" />
                <div className="creator-meta-top">
                  <span className="creator-index">0{active + 1}</span>
                  <span>{creator.location}</span>
                </div>
                <div className="creator-card-copy">
                  <p className="creator-niche">{creator.niche}</p>
                  <h3>{creator.name}</h3>
                  <p className="creator-followers">{creator.followers}</p>
                  <button type="button" className="creator-profile-button">
                    View <span aria-hidden="true">↗</span>
                  </button>
                </div>
              </motion.article>
            );
          })}

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            className="creator-counter"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {String(active + 1).padStart(2, '0')} / {String(creatorData.length).padStart(2, '0')}
          </motion.div>
        </AnimatePresence>
        <button className="stack-arrow stack-arrow-left" type="button" onClick={() => move(-1)} aria-label="Previous creator">
          <ChevronLeft size={22} strokeWidth={1.6} />
        </button>
        <button className="stack-arrow stack-arrow-right" type="button" onClick={() => move(1)} aria-label="Next creator">
          <ChevronRight size={22} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}
