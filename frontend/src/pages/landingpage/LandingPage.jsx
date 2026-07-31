import { motion } from 'motion/react';
import { BrandLogo } from '../../components/BrandLogo';
import BlurText from './components/BlurText';
import CreatorStack from './components/CreatorStack';
import Magnet from './components/Magnet';
import ScrollReveal from './components/ScrollReveal';
import SpotlightCard from './components/SpotlightCard';
import './landingpage.css';

const services = [
  ['01', 'Creator discovery'],
  ['02', 'Campaign strategy'],
  ['03', 'Content production'],
  ['04', 'Realtime collaboration'],
  ['05', 'Analytics & reporting'],
];

const work = [
  {
    brand: 'NOVA RUN',
    type: 'SPORT / UGC',
    stat: '+214% ENGAGEMENT',
    image: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1000&q=86',
  },
  {
    brand: 'KINDRED',
    type: 'BEAUTY / LAUNCH',
    stat: '8.4M IMPRESSIONS',
    image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=86',
  },
  {
    brand: 'LUMA',
    type: 'TRAVEL / FILM',
    stat: '42K SAVES',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=86',
  },
  {
    brand: 'SOUND/ON',
    type: 'MUSIC / SOCIAL',
    stat: '3.2X ROAS',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=86',
  },
];

const marquee = ['CREATORS', 'STRATEGY', 'CULTURE', 'CAMPAIGNS', 'COMMUNITY', 'RESULTS'];

function LandingPage() {
  return (
    <main id="top" className="landing-page">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <nav className="navbar">
        <BrandLogo href="#top" />
        <div className="nav-links">
          <a href="#work">Our work</a>
          <a href="/showcase">Showcase</a>
          <a href="#services">Services</a>
        </div>
        <div className="landing-actions">
          <a className="landing-sign-in" href="/login">Sign In</a>
          <Magnet>
            <a className="contact-pill" href="/register">
              <span className="contact-dot" /> Get Started
            </a>
          </Magnet>
        </div>
      </nav>

      <header className="hero section-pad">
        <motion.div
          className="hero-kicker"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          CREATOR MARKETPLACE · 2026
        </motion.div>

        <div className="hero-title-wrap">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            WE <span className="hero-cutout hero-cutout-one" aria-hidden="true" /> ARE
            <br />
            <span className="script-word">match</span> MAKERS
          </motion.h1>
          <motion.div
            className="hero-image-card"
            initial={{ opacity: 0, rotate: -9, scale: 0.85 }}
            animate={{ opacity: 1, rotate: -5, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=90"
              alt="Athlete creator running on a track"
            />
            <span>CREATOR 0042</span>
          </motion.div>
        </div>

        <div className="hero-bottom">
          <p>
            We connect ambitious brands with the right creators — then turn that match into culture-moving work.
          </p>
          <a href="#creators" className="text-link">
            Discover talent <span>↘</span>
          </a>
        </div>
      </header>

      <section className="manifesto section-pad">
        <ScrollReveal className="section-label">THE MATCH IS THE STRATEGY</ScrollReveal>
        <div className="manifesto-copy">
          <BlurText>FROM CULTURE SHAPERS +</BlurText>
          <BlurText delay={0.06}>STORYTELLERS TO DIGITAL</BlurText>
          <BlurText delay={0.12}>ICONS, WE SELECT THE</BlurText>
          <BlurText className="muted-line" delay={0.18}>RIGHT VOICE FOR YOUR BRAND.</BlurText>
        </div>
        <ScrollReveal className="manifesto-note" delay={0.18}>
          No endless spreadsheets. No random outreach. Just curated creators, clear collaboration, and measurable results.
        </ScrollReveal>
      </section>

      <section id="work" className="work-section section-pad">
        <div className="section-heading-row">
          <div>
            <p className="section-label">SELECTED WORK</p>
            <h2>Campaigns that<br /><span className="script-word">move</span> people.</h2>
          </div>
          <p className="section-side-copy">Strategy, talent and production — handled under one roof.</p>
        </div>

        <div className="work-grid">
          {work.map((item, index) => (
            <ScrollReveal key={item.brand} delay={index * 0.07}>
              <SpotlightCard className="work-card">
                <img src={item.image} alt="" loading="lazy" />
                <div className="work-overlay" />
                <div className="work-topline">
                  <span>{item.type}</span>
                  <span>0{index + 1}</span>
                </div>
                <div className="work-caption">
                  <h3>{item.brand}</h3>
                  <p>{item.stat}</p>
                </div>
              </SpotlightCard>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section id="creators" className="creator-section section-pad">
        <div className="creator-section-copy">
          <p className="section-label">CURATED CREATOR NETWORK</p>
          <h2>
            Find the face<br />your audience<br /><span className="script-word pink">trusts.</span>
          </h2>
          <p className="creator-body">
            Browse verified creators across fashion, gaming, food, travel, tech and sport. Every profile includes audience quality, performance history and collaboration fit.
          </p>
          <div className="creator-mini-stats">
            <div><strong>2.4K+</strong><span>verified creators</span></div>
            <div><strong>38</strong><span>creator markets</span></div>
            <div><strong>91%</strong><span>repeat campaigns</span></div>
          </div>
        </div>
        <ScrollReveal className="creator-stack-column" delay={0.12}>
          <CreatorStack />
        </ScrollReveal>
      </section>

      <section id="services" className="services-section section-pad">
        <div className="services-intro">
          <p className="section-label">FULL-SERVICE, ZERO CHAOS</p>
          <h2>A talent-first approach to <span className="pink">brand stories.</span></h2>
        </div>
        <div className="service-list">
          {services.map(([number, label]) => (
            <motion.div
              className="service-row"
              key={label}
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.55 }}
              whileHover={{ x: 10 }}
            >
              <span>{number}</span>
              <strong>{label}</strong>
              <span className="service-arrow">↗</span>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <motion.div
          className="marquee-track"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
        >
          {[...marquee, ...marquee].map((item, index) => (
            <span key={`${item}-${index}`}>{item}<i>✦</i></span>
          ))}
        </motion.div>
      </div>

      <section className="brands-section section-pad">
        <p className="section-label">TRUSTED BY TEAMS AT</p>
        <div className="brand-cloud">
          {['NIKE', 'ORACLE', 'SONY', 'GLOSSIER', 'adidas', 'CANON'].map((brand, index) => (
            <motion.span
              key={brand}
              initial={{ opacity: 0.15 }}
              whileInView={{ opacity: index === 1 ? 1 : 0.52 }}
              whileHover={{ opacity: 1, scale: 1.04 }}
              viewport={{ once: true }}
            >
              {brand}
            </motion.span>
          ))}
        </div>
      </section>

      <footer id="contact" className="footer section-pad">
        <div className="footer-title">
          <span>SAY</span>
          <motion.span
            className="script-word footer-script"
            whileHover={{ rotate: -4, scale: 1.06 }}
          >
            hello
          </motion.span>
        </div>
        <div className="footer-cta-row">
          <p>Have a campaign, a launch or a slightly wild idea?</p>
          <Magnet>
            <a className="big-contact-button" href="mailto:hello@vyra.studio">
              START A PROJECT <span>↗</span>
            </a>
          </Magnet>
        </div>
        <div className="footer-bottom">
          <BrandLogo href="#top" />
          <div><a href="#top">BACK TO TOP ↑</a></div>
          <div><a href="#">INSTAGRAM</a><a href="#">LINKEDIN</a></div>
          <span>© 2026 VYRA STUDIO</span>
        </div>
      </footer>
    </main>
  );
}

export default LandingPage;
