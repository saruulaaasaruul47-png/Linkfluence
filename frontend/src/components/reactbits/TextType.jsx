import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

export function TextType({
  text,
  typingSpeed = 45,
  initialDelay = 0,
  pauseDuration = 1200,
  deletingSpeed = 25,
  loop = true,
  showCursor = true,
  cursorCharacter = '|',
  className = '',
  cursorClassName = '',
  onSentenceComplete,
}) {
  const prefersReducedMotion = useReducedMotion()
  const sentences = useMemo(
    () => (Array.isArray(text) ? text : [text]).filter(Boolean).map(String),
    [text],
  )
  const [typingState, setTypingState] = useState({
    sentenceIndex: 0,
    characterCount: 0,
    deleting: false,
  })
  const sentence = sentences[typingState.sentenceIndex] || ''
  const visibleText = prefersReducedMotion
    ? sentence
    : sentence.slice(0, typingState.characterCount)
  const complete = typingState.characterCount === sentence.length && !typingState.deleting

  useEffect(() => {
    if (prefersReducedMotion || !sentence) return undefined

    let delay = typingSpeed
    let nextState

    if (!typingState.deleting && typingState.characterCount < sentence.length) {
      delay = typingState.characterCount === 0 ? initialDelay + typingSpeed : typingSpeed
      nextState = {
        ...typingState,
        characterCount: typingState.characterCount + 1,
      }
    } else if (!typingState.deleting) {
      onSentenceComplete?.(sentence, typingState.sentenceIndex)
      if (!loop && typingState.sentenceIndex === sentences.length - 1) return undefined
      delay = pauseDuration
      nextState = { ...typingState, deleting: true }
    } else if (typingState.characterCount > 0) {
      delay = deletingSpeed
      nextState = {
        ...typingState,
        characterCount: typingState.characterCount - 1,
      }
    } else {
      nextState = {
        sentenceIndex: (typingState.sentenceIndex + 1) % sentences.length,
        characterCount: 0,
        deleting: false,
      }
    }

    const timer = window.setTimeout(() => setTypingState(nextState), delay)
    return () => window.clearTimeout(timer)
  }, [
    deletingSpeed,
    initialDelay,
    loop,
    onSentenceComplete,
    pauseDuration,
    prefersReducedMotion,
    sentence,
    sentences.length,
    typingSpeed,
    typingState,
  ])

  return (
    <span className={`inline-grid min-w-0 items-center whitespace-nowrap ${className}`}>
      <span className="sr-only">{sentence}</span>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">{sentence}{showCursor ? cursorCharacter : ''}</span>
      <span aria-hidden="true" className="col-start-1 row-start-1 flex min-w-0 items-center">
        <span className="truncate">{visibleText}</span>
        {showCursor && (
          <motion.span
            animate={prefersReducedMotion ? undefined : { opacity: [1, 1, 0, 0] }}
            transition={{ duration: .72, repeat: Infinity, ease: 'linear' }}
            className={`ml-0.5 shrink-0 ${complete ? 'opacity-60' : 'opacity-100'} ${cursorClassName}`}
          >
            {cursorCharacter}
          </motion.span>
        )}
      </span>
    </span>
  )
}
