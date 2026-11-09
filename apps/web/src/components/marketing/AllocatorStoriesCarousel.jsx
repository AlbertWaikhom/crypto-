'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { ALLOCATOR_PROFILES, INSTITUTIONAL_FAQS } from '../../data/ecosystem';
import styles from './allocator-stories-carousel.module.css';

export function AllocatorStoriesCarousel() {
  const [storyIdx, setStoryIdx] = React.useState(0);
  const [openFaqIdx, setOpenFaqIdx] = React.useState(0);

  const activeStory = ALLOCATOR_PROFILES[storyIdx] || ALLOCATOR_PROFILES[0];

  const prevStory = () =>
    setStoryIdx((i) => (i - 1 + ALLOCATOR_PROFILES.length) % ALLOCATOR_PROFILES.length);
  const nextStory = () => setStoryIdx((i) => (i + 1) % ALLOCATOR_PROFILES.length);

  return (
    <div className={styles.splitGrid}>
      {/* Left: Participant Case Profiles Carousel */}
      <div className={styles.storyCard}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStory.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col gap-4"
          >
            <div className={styles.storyTop}>
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-400">
                <Quote size={14} />
                Allocator Case Profile 0{storyIdx + 1} / 0{ALLOCATOR_PROFILES.length}
              </span>
              <span className={styles.storyMetricBadge}>{activeStory.highlightMetric}</span>
            </div>

            <blockquote className={styles.storyQuote}>&ldquo;{activeStory.quote}&rdquo;</blockquote>

            <div className={styles.mandateBox}>
              <div className={styles.mandateLbl}>Configured Ecosystem Sleeve</div>
              <div className={styles.mandateVal}>{activeStory.mandate}</div>
            </div>

            <div className={styles.tagList}>
              {activeStory.tags.map((tag) => (
                <span key={tag} className={styles.tagPill}>
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className={styles.storyFooter}>
          <div>
            <div className={styles.personaTitle}>{activeStory.persona}</div>
            <div className={styles.personaRegion}>{activeStory.region}</div>
          </div>

          <div className={styles.storyNavBtns}>
            <button
              type="button"
              onClick={prevStory}
              className={styles.roundBtn}
              aria-label="Previous Profile"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={nextStory}
              className={styles.roundBtn}
              aria-label="Next Profile"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Institutional Due-Diligence FAQ Accordion */}
      <div className={styles.faqList}>
        {INSTITUTIONAL_FAQS.map((faq, idx) => {
          const isOpen = openFaqIdx === idx;
          return (
            <div key={faq.q} className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ''}`}>
              <button
                type="button"
                onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                className={styles.faqTrigger}
                aria-expanded={isOpen}
              >
                <span>{faq.q}</span>
                <ChevronDown
                  size={16}
                  className="flex-shrink-0 transition-transform duration-200"
                  style={{
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    color: isOpen ? 'var(--nv-gold)' : 'var(--nv-text-muted)',
                  }}
                />
              </button>

              {isOpen && <div className={styles.faqAnswer}>{faq.a}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AllocatorStoriesCarousel;
