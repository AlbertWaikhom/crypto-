'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pause,
  Play,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@navrix/ui';
import { ECOSYSTEM_ENTITIES } from '../../data/ecosystem';
import styles from './engine-showcase-carousel.module.css';

function buildSvgPaths(points = [], width = 420, height = 115) {
  if (!points.length) return { line: '', area: '', coords: [] };
  const min = Math.min(...points) - 6;
  const max = Math.max(...points) + 6;
  const range = Math.max(1, max - min);

  const coords = points.map((val, idx) => {
    const x = (idx / Math.max(1, points.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 18) - 9;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  const line = coords.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  return { line, area, coords };
}

export function EngineShowcaseCarousel({ initialEngineId = null }) {
  const [activeIndex, setActiveIndex] = React.useState(() => {
    if (!initialEngineId) return 0;
    const found = ECOSYSTEM_ENTITIES.findIndex((e) => e.id === initialEngineId);
    return found >= 0 ? found : 0;
  });
  const [playing, setPlaying] = React.useState(true);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (!initialEngineId) return;
    const found = ECOSYSTEM_ENTITIES.findIndex((e) => e.id === initialEngineId);
    if (found >= 0) {
      setActiveIndex(found);
      setProgress(0);
    }
  }, [initialEngineId]);

  React.useEffect(() => {
    if (!playing) return;
    const stepMs = 60;
    const durationMs = 5600;
    const delta = (stepMs / durationMs) * 100;

    const id = window.setInterval(() => {
      setProgress((prev) => {
        if (prev + delta >= 100) {
          setActiveIndex((curr) => (curr + 1) % ECOSYSTEM_ENTITIES.length);
          return 0;
        }
        return prev + delta;
      });
    }, stepMs);

    return () => window.clearInterval(id);
  }, [playing, activeIndex]);

  const activeEntity = ECOSYSTEM_ENTITIES[activeIndex] || ECOSYSTEM_ENTITIES[0];
  const { line, area, coords } = React.useMemo(
    () => buildSvgPaths(activeEntity.sparkline),
    [activeEntity],
  );
  const lastCoord = coords[coords.length - 1] || { x: 420, y: 20 };

  const selectSlide = (idx) => {
    setActiveIndex(idx);
    setProgress(0);
  };

  const handlePrev = () => {
    setActiveIndex((curr) => (curr - 1 + ECOSYSTEM_ENTITIES.length) % ECOSYSTEM_ENTITIES.length);
    setProgress(0);
  };

  const handleNext = () => {
    setActiveIndex((curr) => (curr + 1) % ECOSYSTEM_ENTITIES.length);
    setProgress(0);
  };

  return (
    <div
      className={styles.carouselRoot}
      onMouseEnter={() => setPlaying(false)}
      onMouseLeave={() => setPlaying(true)}
    >
      {/* Top Engine Selector Pills + Playback Controls */}
      <div className={styles.topBar}>
        <div className={`${styles.selectorStrip} nv-no-scrollbar`} role="tablist">
          {ECOSYSTEM_ENTITIES.map((ent, idx) => {
            const active = idx === activeIndex;
            return (
              <button
                key={ent.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectSlide(idx)}
                className={`${styles.selectorPill} ${active ? styles.selectorPillActive : ''}`}
              >
                <span className={styles.selectorIndex}>0{idx + 1}</span>
                <span>{ent.name}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.navControls}>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className={styles.ctrlBtn}
            aria-label={playing ? 'Pause Carousel' : 'Play Carousel'}
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
            <span>{playing ? 'Auto' : 'Paused'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrev}
            className={styles.ctrlBtn}
            aria-label="Previous Engine"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className={styles.ctrlBtn}
            aria-label="Next Engine"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Carousel Stage */}
      <div className={styles.stageCard}>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{
              width: `${playing ? progress : 100}%`,
              background: activeEntity.accentColor,
            }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeEntity.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className={styles.slideGrid}
          >
            {/* Left Institutional Overview */}
            <div className={styles.leftCol}>
              <div>
                <div className={styles.metaBadgeRow}>
                  <span className={styles.engineCodePill}>{activeEntity.code}</span>
                  <span className={styles.categoryPill}>{activeEntity.category}</span>
                </div>

                <h3 className={styles.engineTitle}>{activeEntity.name}</h3>
                <div className={styles.engineTagline} style={{ color: activeEntity.accentColor }}>
                  {activeEntity.tagline}
                </div>
                <p className={styles.engineDesc}>{activeEntity.fullDescription}</p>
              </div>

              {/* 3 Architecture Spec Tiles */}
              <div className={styles.specTilesGrid}>
                {(activeEntity.architectureHighlights || []).map((spec) => (
                  <div key={spec.label} className={styles.specTile}>
                    <div className={styles.specTileLabel}>{spec.label}</div>
                    <div className={styles.specTileVal}>{spec.value}</div>
                  </div>
                ))}
              </div>

              {/* Risk Governance Checklist */}
              <div className={styles.riskRow}>
                {activeEntity.riskStructure.map((item) => (
                  <span key={item} className={styles.riskItem}>
                    <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className={styles.ctaRow}>
                <Link href={`/ecosystem?engine=${activeEntity.id}`}>
                  <Button variant="gold" size="md" className="w-full">
                    <span>Inspect Architecture</span>
                    <ArrowRight size={14} />
                  </Button>
                </Link>
                <a href={activeEntity.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="md" className="w-full">
                    <span>Official Entity Website</span>
                    <ExternalLink size={14} />
                  </Button>
                </a>
              </div>
            </div>

            {/* Right Strategy Telemetry Graphic Card */}
            <div className={styles.rightGraphicCard}>
              <div className={styles.graphicTop}>
                <span className={styles.graphicLiveTag}>
                  <ShieldCheck size={13} style={{ color: activeEntity.accentColor }} />
                  <span>Ring-Fenced Model Telemetry</span>
                </span>
                <span
                  className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${activeEntity.accentColor}20`,
                    color: activeEntity.accentColor,
                    border: `1px solid ${activeEntity.accentColor}45`,
                  }}
                >
                  {activeEntity.badge}
                </span>
              </div>

              {/* Custom SVG Telemetry Sparkline Graphic */}
              <div className={styles.svgChartBox}>
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="font-bold" style={{ color: 'var(--nv-text)' }}>
                    Normalized Model Consistency Index
                  </span>
                  <span className="font-bold" style={{ color: activeEntity.accentColor }}>
                    {activeEntity.cadence}
                  </span>
                </div>

                <svg
                  viewBox="0 0 420 115"
                  className="w-full h-[112px] overflow-visible"
                  role="img"
                  aria-label={`${activeEntity.name} model curve`}
                >
                  <defs>
                    <linearGradient id={`grad-${activeEntity.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={activeEntity.accentColor} stopOpacity="0.34" />
                      <stop offset="95%" stopColor={activeEntity.accentColor} stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {[24, 58, 92].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      y1={y}
                      x2="420"
                      y2={y}
                      stroke="rgba(148,163,184,0.16)"
                      strokeDasharray="3 3"
                    />
                  ))}

                  <path d={area} fill={`url(#grad-${activeEntity.id})`} />
                  <path
                    d={line}
                    fill="none"
                    stroke={activeEntity.accentColor}
                    strokeWidth="2.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {coords
                    .filter((_, idx) => idx % 3 === 0)
                    .map((pt, idx) => (
                      <circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r="3.2"
                        fill={activeEntity.accentColor}
                      />
                    ))}

                  <circle
                    cx={lastCoord.x}
                    cy={lastCoord.y}
                    r="5"
                    fill={activeEntity.accentColor}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              {/* Risk & Access Metadata */}
              <div className={styles.telemetryMetaGrid}>
                <div className={styles.telemetryMetaItem}>
                  <div className={styles.telemetryMetaLbl}>Risk Classification</div>
                  <div className={styles.telemetryMetaVal}>{activeEntity.riskTier}</div>
                </div>
                <div className={styles.telemetryMetaItem}>
                  <div className={styles.telemetryMetaLbl}>Onboarding Pathway</div>
                  <div className={styles.telemetryMetaVal}>{activeEntity.accessModel}</div>
                </div>
              </div>

              {/* Ideal Allocator Personas */}
              <div className={styles.personaBox}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Engineered For
                </div>
                <div className={styles.personaChips}>
                  {activeEntity.whoItsFor.map((persona) => (
                    <span key={persona} className={styles.personaChip}>
                      {persona}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide Progress Dots */}
      <div className={styles.dotsBar}>
        {ECOSYSTEM_ENTITIES.map((ent, idx) => (
          <button
            key={ent.id}
            type="button"
            onClick={() => selectSlide(idx)}
            aria-label={`View ${ent.name}`}
            className={`${styles.dotBtn} ${idx === activeIndex ? styles.dotBtnActive : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

export default EngineShowcaseCarousel;
