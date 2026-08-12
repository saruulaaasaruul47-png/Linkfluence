import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { resolveMediaUrl } from '../../../api/mediaUrl'

const colors = ['#8ac43f', '#ff7bbb', '#7fc6ff', '#f3a85a', '#bbf7d0']
const wrap = (value, length) => ((value % length) + length) % length

function compactFollowers(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return 'New creator'
  return `${new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)} followers`
}

function creatorImage(creator) {
  const portfolioMedia = creator.portfolio?.find((item) => item.thumbnailUrl || item.mediaUrl)
  return resolveMediaUrl(
    creator.coverUrl
      || creator.cover
      || portfolioMedia?.thumbnailUrl
      || portfolioMedia?.mediaUrl
      || creator.avatarUrl
      || creator.avatar,
  )
}

export default function CreatorStack({ creators = [], onImageError }) {
  const navigate = useNavigate()
  const [active, setActive] = useState(0)
  const [direction, setDirection] = useState(1)
  const creatorData = useMemo(() => creators
    .map((creator, index) => ({
      id: creator.id,
      name: creator.name || creator.channelName,
      niche: creator.niche || creator.categories?.[0] || 'Creator',
      followers: compactFollowers(creator.followerCount),
      location: creator.location || 'VYRA creator',
      image: creatorImage(creator),
      color: colors[index % colors.length],
    }))
    .filter((creator) => creator.id && creator.name && creator.image), [creators])

  const visible = useMemo(() => {
    if (!creatorData.length) return []
    return Array.from({ length: Math.min(3, creatorData.length) }, (_, offset) => (
      creatorData[wrap(active + offset, creatorData.length)]
    ))
  }, [active, creatorData])

  const move = (step) => {
    if (creatorData.length < 2) return
    setDirection(step)
    setActive((current) => wrap(current + step, creatorData.length))
  }

  const handleCardClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    move(event.clientX - rect.left < rect.width / 2 ? -1 : 1)
  }

  if (!creatorData.length) {
    return (
      <div className="creator-stack-empty" role="status">
        Registered creators with published media will appear here.
      </div>
    )
  }

  return (
    <div className="creator-stack-shell">
      <div className="creator-glow" aria-hidden="true" />
      <div className="creator-stack" aria-live="polite">
        {visible.slice().reverse().map((creator, reverseIndex) => {
          const index = visible.length - 1 - reverseIndex
          const isFront = index === 0
          return (
            <motion.article
              key={creator.id}
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
              onClick={isFront ? handleCardClick : undefined}
            >
              <img src={creator.image} alt={`${creator.name} creator profile`} loading={isFront ? 'eager' : 'lazy'} onError={() => onImageError?.(creator.image)} />
              <div className="creator-card-shade" />
              <div className="creator-meta-top">
                <span className="creator-index">{String(active + 1).padStart(2, '0')}</span>
                <span>{creator.location}</span>
              </div>
              <div className="creator-card-copy">
                <p className="creator-niche">{creator.niche}</p>
                <h3>{creator.name}</h3>
                <p className="creator-followers">{creator.followers}</p>
                <button
                  type="button"
                  className="creator-profile-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    navigate(`/creators/${creator.id}`)
                  }}
                >
                  View <ArrowUpRight size={15} strokeWidth={2.25} aria-hidden="true" />
                </button>
              </div>
            </motion.article>
          )
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
      </div>
    </div>
  )
}
