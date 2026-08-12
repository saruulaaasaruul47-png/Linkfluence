import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { marketplaceApi } from '../../api/marketplace.api'
import { resolveMediaUrl } from '../../api/mediaUrl'
import { BrandLogo } from '../../components/BrandLogo'
import { LanguageSwitcher } from '../../components/navigation/LanguageSwitcher'
import { useAuth } from '../../context/auth-context'
import { useLanguage } from '../../context/language-context'
import BlurText from './components/BlurText'
import CreatorStack from './components/CreatorStack'
import Magnet from './components/Magnet'
import ScrollReveal from './components/ScrollReveal'
import SpotlightCard from './components/SpotlightCard'
import './landingpage.css'

const compact = (value) => new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(Number(value) || 0)

function creatorImage(creator) {
  const portfolioMedia = creator?.portfolio?.find((item) => item.thumbnailUrl || item.mediaUrl)
  return resolveMediaUrl(
    creator?.coverUrl
      || creator?.cover
      || portfolioMedia?.thumbnailUrl
      || portfolioMedia?.mediaUrl
      || creator?.avatarUrl
      || creator?.avatar,
  )
}

function LandingPage() {
  const { session, hasRole, isInitializing } = useAuth()
  const { t } = useLanguage()
  const [landingData, setLandingData] = useState(null)
  const [landingError, setLandingError] = useState('')
  const [failedImageUrls, setFailedImageUrls] = useState(() => new Set())

  const markImageFailed = useCallback((url) => {
    if (!url) return
    setFailedImageUrls((current) => {
      if (current.has(url)) return current
      const next = new Set(current)
      next.add(url)
      return next
    })
  }, [])

  useEffect(() => {
    let active = true
    marketplaceApi.discover({ limit: 12 })
      .then((result) => {
        if (!active) return
        setLandingData(result)
        setLandingError('')
      })
      .catch(() => {
        if (active) setLandingError('landing.dataError')
      })
    return () => { active = false }
  }, [])

  const creators = useMemo(() => (landingData?.creators || [])
    .filter((creator) => {
      const image = creatorImage(creator)
      return image && !failedImageUrls.has(image)
    })
    .sort((left, right) => Number(right.verified) - Number(left.verified)), [failedImageUrls, landingData])
  const heroCreator = creators[0]
  const heroImage = creatorImage(heroCreator)
  const work = useMemo(() => [...(landingData?.showcase || [])]
    .sort((left, right) => Number(right.creator?.verified) - Number(left.creator?.verified))
    .filter((item) => item.mediaType !== 'VIDEO' || item.thumbnailUrl)
    .map((item) => ({
      id: item.id,
      brand: item.title,
      type: [item.category, item.creator?.name].filter(Boolean).join(' / '),
      stat: item.reactionCount
        ? `${compact(item.reactionCount)} likes`
        : `By ${item.creator?.name || 'a VYRA creator'}`,
      image: resolveMediaUrl(item.thumbnailUrl || item.image || item.mediaUrl),
      route: item.route || `/showcase/${item.id}`,
    }))
    .filter((item) => item.image && !failedImageUrls.has(item.image))
    .slice(0, 4), [failedImageUrls, landingData])
  const stats = landingData?.stats || {}
  const activeCategories = (landingData?.categories || []).filter((item) => item.creatorCount > 0)
  const services = [
    [compact(stats.creatorCount), t('landing.registeredCreators')],
    [compact(stats.businessCount), t('landing.businessChannels')],
    [compact(stats.showcaseCount), t('landing.publishedWork')],
    [compact(stats.activeCategoryCount), t('landing.activeCategories')],
    [compact(stats.featuredAudience), t('landing.featuredAudienceReach')],
  ]
  const marquee = activeCategories.map((item) => item.name.toUpperCase())
  let lastDashboardRole = ''
  try { lastDashboardRole = window.localStorage.getItem('vyra:last-dashboard-role') || '' } catch { /* Fall back to role priority. */ }
  const dashboardRole = hasRole('admin')
    ? 'admin'
    : ['creator', 'business'].includes(lastDashboardRole) && hasRole(lastDashboardRole)
      ? lastDashboardRole
      : hasRole('business')
        ? 'business'
        : hasRole('creator')
          ? 'creator'
          : ''
  const dashboardTarget = dashboardRole === 'admin' ? '/admin/dashboard' : dashboardRole ? `/${dashboardRole}/dashboard` : '/account'

  return (
    <main id="top" className="landing-page">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <nav className="navbar">
        <BrandLogo href="#top" />
        <div className="nav-links">
          <a href="#work">{t('landing.ourWork')}</a>
          <Link to="/showcase">{t('common.showcase')}</Link>
          <a href="#services">{t('landing.services')}</a>
        </div>
        <div className="landing-actions">
          {session ? (
            <Link to={dashboardTarget} className="landing-account-button" aria-label={t('landing.accountAria')}>
              <UserRound size={17} />
            </Link>
          ) : !isInitializing && (
            <>
              <Link className="landing-sign-in" to="/login">{t('common.signIn')}</Link>
              <Magnet>
                <Link className="contact-pill" to="/register">
                  <span className="contact-dot" /> {t('common.getStarted')}
                </Link>
              </Magnet>
            </>
          )}
          <LanguageSwitcher compact />
        </div>
      </nav>

      <header className="hero section-pad">
        <motion.div className="hero-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.7 }}>
          {t('landing.kicker', { year: new Date().getFullYear() })}
        </motion.div>

        <div className="hero-title-wrap">
          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
            {t('landing.heroLine1')} <span className="hero-cutout hero-cutout-one" aria-hidden="true" /> {t('landing.heroLine1Tail')}
            <br />
            <span className="script-word pink">{t('landing.heroScript')}</span> {t('landing.heroLine2')}
          </motion.h1>
          {heroImage && (
            <motion.div className="hero-image-card" initial={{ opacity: 0, rotate: -9, scale: 0.85 }} animate={{ opacity: 1, rotate: -5, scale: 1 }} transition={{ delay: 0.25, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
              <img src={heroImage} alt={`${heroCreator.name} creator profile`} onError={() => markImageFailed(heroImage)} />
              <span>{heroCreator.name}</span>
            </motion.div>
          )}
        </div>

        <div className="hero-bottom">
          <p>{t('landing.heroCopy')}</p>
          <a href="#creators" className="text-link">{t('landing.discoverTalent')} <span>↘</span></a>
        </div>
      </header>

      <section className="manifesto section-pad">
        <ScrollReveal className="section-label">{t('landing.strategy')}</ScrollReveal>
        <div className="manifesto-copy">
          <BlurText>{t('landing.manifesto1')}</BlurText>
          <BlurText delay={0.06}>{t('landing.manifesto2')}</BlurText>
          <BlurText delay={0.12}>{t('landing.manifesto3')}</BlurText>
          <BlurText className="muted-line" delay={0.18}>{t('landing.manifesto4')}</BlurText>
        </div>
        <ScrollReveal className="manifesto-note" delay={0.18}>
          {t('landing.manifestoNote')}
        </ScrollReveal>
      </section>

      <section id="work" className="work-section section-pad">
        <div className="section-heading-row">
          <div>
            <p className="section-label">{t('landing.liveShowcase')}</p>
            <h2>{t('landing.workTitle')}<br /><span className="script-word pink">{t('landing.moves')}</span> {t('landing.people')}</h2>
          </div>
          <p className="section-side-copy">{t('landing.workCopy')}</p>
        </div>

        {landingError && <p className="landing-data-state" role="alert">{t(landingError)}</p>}
        <div className="work-grid">
          {work.map((item, index) => (
            <ScrollReveal key={item.id} delay={index * 0.07}>
              <SpotlightCard className="work-card">
                <Link to={item.route} aria-label={`Open ${item.brand}`}>
                  <img src={item.image} alt={item.brand} loading="lazy" onError={() => markImageFailed(item.image)} />
                  <div className="work-overlay" />
                  <div className="work-topline">
                    <span>{item.type}</span>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="work-caption">
                    <h3>{item.brand}</h3>
                    <p>{item.stat}</p>
                  </div>
                </Link>
              </SpotlightCard>
            </ScrollReveal>
          ))}
        </div>
        {!landingData && !landingError && <p className="landing-data-state" role="status">{t('landing.loadingWork')}</p>}
        {landingData && !work.length && <p className="landing-data-state">{t('landing.emptyWork')}</p>}
      </section>

      <section id="creators" className="creator-section section-pad">
        <div className="creator-section-copy">
          <p className="section-label">{t('landing.creatorNetwork')}</p>
          <h2>{t('landing.findFace')}<br />{t('landing.yourAudience')}<br /><span className="script-word pink">{t('landing.trusts')}</span></h2>
          <p className="creator-body">{t('landing.creatorBody')}</p>
          <div className="creator-mini-stats">
            <div><strong>{compact(stats.creatorCount)}</strong><span>{t('landing.registeredCreators')}</span></div>
            <div><strong>{compact(stats.activeCategoryCount)}</strong><span>{t('landing.activeCategories')}</span></div>
            <div><strong>{compact(stats.featuredAudience)}</strong><span>{t('landing.featuredReach')}</span></div>
          </div>
        </div>
        <ScrollReveal className="creator-stack-column" delay={0.12}>
          <CreatorStack creators={creators} onImageError={markImageFailed} />
        </ScrollReveal>
      </section>

      <section id="services" className="services-section section-pad">
        <div className="services-intro">
          <p className="section-label">{t('landing.liveMarketplace')}</p>
          <h2>{t('landing.networkView')} <span className="pink">{t('landing.creatorNetworkLower')}</span></h2>
        </div>
        <div className="service-list">
          {services.map(([value, label]) => (
            <motion.div className="service-row" key={label} initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.55 }} whileHover={{ x: 10 }}>
              <span>{value}</span>
              <strong>{label}</strong>
              <span className="service-arrow">↗</span>
            </motion.div>
          ))}
        </div>
      </section>

      {marquee.length > 0 && (
        <div className="marquee" aria-hidden="true">
          <motion.div className="marquee-track" animate={{ x: ['0%', '-50%'] }} transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}>
            {[...marquee, ...marquee].map((item, index) => <span key={`${item}-${index}`}>{item}<i>✦</i></span>)}
          </motion.div>
        </div>
      )}

      <section className="brands-section section-pad">
        <p className="section-label">{t('landing.trustedBy')}</p>
        <div className="brand-cloud">
          {['NIKE', 'ORACLE', 'SONY', 'GLOSSIER', 'adidas', 'CANON'].map((brand, index) => (
            <motion.span key={brand} initial={{ opacity: 0.15 }} whileInView={{ opacity: index === 1 ? 1 : 0.52 }} whileHover={{ opacity: 1, scale: 1.04 }} viewport={{ once: true }}>
              {brand}
            </motion.span>
          ))}
        </div>
      </section>

      <footer id="contact" className="footer section-pad">
        <div className="footer-title">
          <span>{t('landing.say')}</span>
          <motion.span className="script-word footer-script" whileHover={{ rotate: -4, scale: 1.06 }}>{t('landing.hello')}</motion.span>
        </div>
        <div className="footer-cta-row">
          <p>{t('landing.footerCopy')}</p>
          <Magnet>
            <Link className="big-contact-button" to="/login">{t('landing.startProject')} <span>↗</span></Link>
          </Magnet>
        </div>
        <div className="footer-bottom">
          <BrandLogo href="#top" />
          <div><a href="#top">{t('landing.backTop')}</a></div>
          <span>© {new Date().getFullYear()} VYRA STUDIO</span>
        </div>
      </footer>
    </main>
  )
}

export default LandingPage
