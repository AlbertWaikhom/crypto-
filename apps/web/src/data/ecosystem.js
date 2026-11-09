export const ECOSYSTEM_CATEGORIES = [
  'All Entities',
  'Algorithmic & Automated Trading Systems',
  'Investment & Hybrid Structures',
  'Alerts & Market Intelligence',
  'Funded Capital Programs',
  'Financial Education',
];

export const ECOSYSTEM_ENTITIES = [
  {
    id: 'botxp',
    name: 'Botxp',
    code: 'NVX-ENG-01',
    tagline: 'Structured Semi-Automated Execution',
    category: 'Algorithmic & Automated Trading Systems',
    shortDescription:
      'Disciplined semi-automated trading infrastructure pairing systematic signal logic with live execution oversight.',
    fullDescription:
      'Botxp operates a semi-automated quantitative execution infrastructure engineered around disciplined market exposure, predefined drawdown guardrails, and human-in-the-loop supervisory controls across major liquid pairs.',
    whoItsFor: [
      'Passive Capital Allocators',
      'MT5 Bridge Participants',
      'Systematic Strategy Seekers',
      'Risk-Aware Traders',
    ],
    performanceModel:
      'Structured monthly settlement cycle driven by rule-based entries, dynamic position sizing, and volatility-adjusted risk caps.',
    riskStructure: [
      'Hard equity drawdown circuit breakers',
      'Session-capped exposure framework',
      'Real-time human desk supervision',
    ],
    architectureHighlights: [
      { label: 'Execution Venue', value: 'MT5 Institutional Bridge' },
      { label: 'Settlement Cycle', value: 'Monthly Reconciled' },
      { label: 'Oversight Mode', value: 'Hybrid Desk + Algo' },
    ],
    cadence: 'Monthly Cycle',
    riskTier: 'Moderate · Controlled',
    accessModel: 'Dedicated MT5 Bridge',
    accentColor: '#F5B82E',
    sparkline: [38, 42, 41, 47, 52, 50, 57, 63, 66, 74, 79, 86],
    url: 'https://www.botxp.io/',
    badge: 'Semi-Automated',
    iconName: 'Cpu',
  },
  {
    id: 'tradex03',
    name: 'Tradex0.3',
    code: 'NVX-ENG-02',
    tagline: 'High-Velocity Quantitative Momentum',
    category: 'Algorithmic & Automated Trading Systems',
    shortDescription:
      'High-beta algorithmic execution engine engineered for active liquidity regimes and amplified capital velocity.',
    fullDescription:
      'Tradex0.3 deploys multi-timeframe momentum and liquidity-sweep algorithms designed for elevated performance environments, combining rapid order routing with strict per-cycle risk-to-reward asymmetry.',
    whoItsFor: [
      'Growth-Oriented Allocators',
      'Active Systematic Traders',
      'High-Beta Portfolio Sleeves',
    ],
    performanceModel:
      'Tactical high-alpha execution model capturing intraday directional expansions under strict position-level stop governance.',
    riskStructure: [
      'Asymmetric risk-to-reward sizing',
      'Volatility-gated session filters',
      'Segregated tactical capital sleeve',
    ],
    architectureHighlights: [
      { label: 'Execution Latency', value: '< 18ms Order Routing' },
      { label: 'Strategy Profile', value: 'Tactical Momentum' },
      { label: 'Risk Governance', value: 'Per-Cycle Stop Cap' },
    ],
    cadence: 'Active 24/5',
    riskTier: 'Elevated · Tactical Alpha',
    accessModel: 'Managed Algo Sleeve',
    accentColor: '#F97316',
    sparkline: [30, 36, 33, 45, 42, 56, 53, 68, 64, 79, 85, 94],
    url: 'https://www.tradex03.com/',
    badge: 'High-Performance',
    iconName: 'TrendingUp',
  },
  {
    id: 'arb24x5',
    name: 'ARB24x5',
    code: 'NVX-ENG-03',
    tagline: 'Autonomous Hedge & Spread Engine',
    category: 'Algorithmic & Automated Trading Systems',
    shortDescription:
      'Fully automated hedge architecture neutralizing directional beta through continuous 24/5 multi-pair balancing.',
    fullDescription:
      'ARB24x5 runs a zero-touch automated hedge system engineered to reduce directional market sensitivity by pairing correlated instruments and systematically harvesting spread mean-reversion across global trading sessions.',
    whoItsFor: [
      'Preservation-Focused Allocators',
      'Treasury Diversifiers',
      'Market-Neutral Mandates',
    ],
    performanceModel:
      'Continuous 24/5 autonomous execution balancing long/short exposure deltas within mathematical correlation bands.',
    riskStructure: [
      'Delta-balanced hedge pairing',
      'Zero manual emotional intervention',
      'Automated margin-buffer protection',
    ],
    architectureHighlights: [
      { label: 'Operating Window', value: '24/5 Continuous' },
      { label: 'Beta Exposure', value: 'Hedge-Balanced' },
      { label: 'Automation Level', value: '100% Autonomous' },
    ],
    cadence: '24/5 Autonomous',
    riskTier: 'Balanced · Hedge-Neutral',
    accessModel: 'Automated Hedge Vault',
    accentColor: '#10B981',
    sparkline: [46, 48, 50, 51, 54, 56, 58, 61, 63, 66, 69, 73],
    url: 'https://www.arb24x5.com/',
    badge: 'Automated Hedge',
    iconName: 'Shield',
  },
  {
    id: 'novex-portfolio',
    name: 'Novex Portfolio',
    code: 'NVX-ENG-04',
    tagline: 'Structured Hybrid Capital Pools',
    category: 'Investment & Hybrid Structures',
    shortDescription:
      'Institutional pooled allocation framework offering weekly, monthly, and annual maturity vaults with transparent ledger accounting.',
    fullDescription:
      'Novex Portfolio aggregates participant liquidity into structured, duration-matched hybrid vaults, enabling streamlined access to diversified yield mandates with predictable lock-up horizons and clear redemption schedules.',
    whoItsFor: ['USDT Vault Investors', 'Passive Yield Allocators', 'Multi-Horizon Treasuries'],
    performanceModel:
      'Duration-tiered pooled capital vaults spanning weekly, 30-day, 90-day, and annual compounding schedules.',
    riskStructure: [
      'Defined maturity & escrow schedules',
      'Portfolio-level diversification',
      'Double-entry yield credit proofs',
    ],
    architectureHighlights: [
      { label: 'Vault Tenors', value: '7D · 30D · 90D · 365D' },
      { label: 'Settlement Asset', value: 'BEP-20 USDT' },
      { label: 'Accounting', value: 'Append-Only Ledger' },
    ],
    cadence: 'Weekly / Monthly',
    riskTier: 'Structured · Pooled',
    accessModel: 'USDT Maturity Vaults',
    accentColor: '#38BDF8',
    sparkline: [40, 44, 48, 52, 55, 59, 63, 67, 71, 75, 80, 85],
    url: 'https://www.novexportfolio.com/',
    badge: 'Hybrid Capital Pool',
    iconName: 'PieChart',
  },
  {
    id: 'volatility-blaze',
    name: 'Volatility Blaze',
    code: 'NVX-ENG-05',
    tagline: 'Real-Time Macro & Volatility Desk',
    category: 'Alerts & Market Intelligence',
    shortDescription:
      'Low-latency market intelligence, institutional order-flow setups, and Telegram research dispatches for self-directed desks.',
    fullDescription:
      'Volatility Blaze delivers institutional-grade intraday market structure briefings, volatility regime alerts, and precision Telegram dispatches while preserving 100% self-custody and discretionary trade execution.',
    whoItsFor: ['Self-Directed Traders', 'Discretionary FX & Gold Desks', 'Macro Analysts'],
    performanceModel:
      'Zero-custody research and real-time alert stream backed by structured session briefings and invalidation levels.',
    riskStructure: [
      'Zero client capital custody',
      '100% user-controlled execution',
      'Explicit invalidation & R-multiple levels',
    ],
    architectureHighlights: [
      { label: 'Delivery Channel', value: 'Encrypted Telegram Desk' },
      { label: 'Custody Profile', value: 'Zero Custody' },
      { label: 'Coverage', value: 'FX · Indices · Commodities' },
    ],
    cadence: 'Real-Time Intraday',
    riskTier: 'Non-Custodial · Research',
    accessModel: 'Intelligence Subscription',
    accentColor: '#A855F7',
    sparkline: [35, 42, 46, 44, 53, 58, 60, 66, 70, 74, 78, 83],
    url: 'https://www.volatilityblaze.com/',
    badge: 'Market Intelligence',
    iconName: 'Zap',
  },
  {
    id: 'funded-master',
    name: 'Funded Master',
    code: 'NVX-ENG-06',
    tagline: 'Proprietary Trader Capital Allocation',
    category: 'Funded Capital Programs',
    shortDescription:
      'Meritocratic evaluation challenges empowering disciplined traders with institutional funded account allocations and performance splits.',
    fullDescription:
      'Funded Master identifies disciplined market operators through transparent, rule-based evaluation phases—unlocking scalable funded trading accounts with institutional spreads and rapid profit-split settlements.',
    whoItsFor: [
      'Proprietary Traders',
      'Systematic Strategy Operators',
      'Skilled Undercapitalized Talent',
    ],
    performanceModel:
      'Objective benchmark qualification unlocking funded liquidity tiers with competitive performance profit splits.',
    riskStructure: [
      'Transparent daily & max drawdown rules',
      'Automated risk-breach telemetry',
      'Merit-based scaling milestones',
    ],
    architectureHighlights: [
      { label: 'Qualification', value: 'Rule-Based Evaluation' },
      { label: 'Payout Model', value: 'Performance Split' },
      { label: 'Terminal Support', value: 'Institutional MT5' },
    ],
    cadence: 'Bi-Weekly Splits',
    riskTier: 'Rule-Governed Prop',
    accessModel: 'Prop Evaluation Tier',
    accentColor: '#F59E0B',
    sparkline: [32, 38, 43, 49, 53, 58, 62, 69, 73, 78, 84, 90],
    url: 'https://www.fundedmaster.com/',
    badge: 'Funded Prop Accounts',
    iconName: 'Briefcase',
  },
  {
    id: 'stockarth-academy',
    name: 'Stockarth Academy',
    code: 'NVX-ENG-07',
    tagline: 'Equities, Derivatives & FX Curriculum',
    category: 'Financial Education',
    shortDescription:
      'Structured practitioner academy specializing in Indian equity markets, options microstructure, and institutional Forex methodology.',
    fullDescription:
      'Stockarth Academy equips emerging and intermediate market participants with rigorous technical, derivatives, and risk-management frameworks tailored for Indian NSE/BSE equities and global currency markets.',
    whoItsFor: [
      'Indian Equity & Options Traders',
      'Emerging Portfolio Builders',
      'Structured Cohort Learners',
    ],
    performanceModel:
      'Cohort-based curriculum combining market microstructure theory, live charting labs, and disciplined risk journaling.',
    riskStructure: [
      'Strictly educational & non-advisory',
      'Zero capital pooling or brokerage custody',
      'Capital preservation-first pedagogy',
    ],
    architectureHighlights: [
      { label: 'Primary Focus', value: 'Indian Equities & FX' },
      { label: 'Format', value: 'Structured Cohorts + Labs' },
      { label: 'Mandate', value: 'Purely Educational' },
    ],
    cadence: 'Cohort Mentorship',
    riskTier: 'Educational · Non-Custodial',
    accessModel: 'Academy Enrollment',
    accentColor: '#14B8A6',
    sparkline: [40, 43, 47, 51, 55, 60, 64, 68, 73, 77, 82, 87],
    url: 'https://www.stockarth.in/',
    badge: 'Equities & FX Academy',
    iconName: 'GraduationCap',
  },
  {
    id: 'finup-global',
    name: 'Finup Global',
    code: 'NVX-ENG-08',
    tagline: 'Global Macro & Live FX Mentorship',
    category: 'Financial Education',
    shortDescription:
      'International live-session Forex mentorship delivering institutional liquidity concepts, macro fundamentals, and London/NY execution labs.',
    fullDescription:
      'Finup Global connects international learners with veteran macro and FX educators through interactive live sessions, multi-session liquidity mapping, and structured competency tracks.',
    whoItsFor: [
      'Global FX Participants',
      'Live-Session Apprentices',
      'Macro & Technical Practitioners',
    ],
    performanceModel:
      'Interactive live trading rooms, macro fundamental breakdowns, and progressive trader development pathways.',
    riskStructure: [
      'Educational & analytical mentorship only',
      'No client fund custody or trade execution',
      'Position-sizing & psychology governance',
    ],
    architectureHighlights: [
      { label: 'Primary Focus', value: 'Global FX & Macro' },
      { label: 'Delivery', value: 'Live Interactive Desks' },
      { label: 'Reach', value: '60+ Jurisdictions' },
    ],
    cadence: 'Live Global Sessions',
    riskTier: 'Educational · Non-Custodial',
    accessModel: 'Global Live Track',
    accentColor: '#60A5FA',
    sparkline: [42, 45, 49, 53, 57, 61, 65, 70, 74, 79, 83, 88],
    url: 'https://www.finupglobal.com/',
    badge: 'Global FX Academy',
    iconName: 'Globe',
  },
];

export const INSTITUTIONAL_FAQS = [
  {
    q: 'How does NAVRIX separate platform infrastructure from individual strategy risk?',
    a: 'NAVRIX operates strictly as an ecosystem gateway and sovereign ledger coordinator. Each of the 8 ecosystem companies—spanning Botxp, Tradex0.3, ARB24x5, Novex Portfolio, Funded Master, Volatility Blaze, Stockarth Academy, and Finup Global—operates under an independent risk model, execution desk, and governance boundary with zero cross-entity liability commingling.',
  },
  {
    q: 'How are USDT deposits verified and credited inside the Investor Portal?',
    a: 'Every registered participant is assigned a unique USR-xxxx identifier paired with our BNB Smart Chain (BEP-20) USDT treasury workflow. When you generate a deposit request, you receive a dynamic QR code and submit your 66-character BSC transaction hash for 12-block confirmation verification and double-entry ledger crediting within our 24-hour SLA.',
  },
  {
    q: 'What does "Append-Only Double-Entry Solvency" mean in practice?',
    a: 'Unlike conventional dashboards that overwrite a single balance column, NAVRIX records every deposit, vault allocation, yield credit, escrow lock, and outbound payout as an immutable row-locked credit/debit entry. Our Master Sovereign Console continuously reconciles aggregate user wallet equity against net ledger entries to maintain 0.00000000 discrepancy.',
  },
  {
    q: 'How do withdrawals and escrow locks protect platform liquidity?',
    a: 'When you initiate a BEP-20 USDT withdrawal, the requested amount is atomically transitioned from your Available balance into an Escrow-Locked state inside a database transaction. This prevents double-spending or overdrafts while Treasury Operations dispatches your on-chain payout and attaches the verified BSC transaction hash.',
  },
  {
    q: 'Does NAVRIX guarantee fixed investment returns or act as a bank?',
    a: 'No. NAVRIX is a financial technology infrastructure gateway, not a bank, custodian of fiat deposits, or licensed investment advisor. Algorithmic trading, hedge models, and pooled digital asset structures carry market and smart-contract risks, and historical model metrics do not guarantee future performance.',
  },
  {
    q: 'Can institutional desks or independent quant teams partner with NAVRIX?',
    a: 'Yes. Qualified trading engines, liquidity providers, brokerage bridges, and regional educational cohorts can apply for ecosystem integration through our Institutional Relations Desk on the Contact page.',
  },
];

export const ALLOCATOR_PROFILES = [
  {
    id: 'quant-treasury',
    persona: 'Multi-Strategy Private Treasury',
    region: 'Singapore · APAC Corridor',
    mandate: '60% ARB24x5 Hedge · 40% Novex 90D Vault',
    highlightMetric: '0.00000000 Variance',
    quote:
      'Consolidating our systematic hedge exposure and duration-matched USDT vaults behind a single double-entry ledger eliminated spreadsheet reconciliation across four separate portals.',
    tags: ['BEP-20 Settlement', 'Delta-Neutral Core', 'Audit Trail'],
  },
  {
    id: 'systematic-allocator',
    persona: 'Algorithmic Capital Allocator',
    region: 'Dubai · DIFC / MENA Hub',
    mandate: 'Botxp Semi-Auto + Tradex0.3 Tactical Sleeve',
    highlightMetric: '24/5 MT5 Telemetry',
    quote:
      'Separating core semi-automated execution in Botxp from our higher-beta Tradex0.3 sleeve gives us clean risk compartmentalization without sacrificing execution speed.',
    tags: ['Ring-Fenced Risk', 'MT5 Bridge', 'Monthly Cycle'],
  },
  {
    id: 'prop-operator',
    persona: 'Evaluated Proprietary Desk Operator',
    region: 'London · European Session',
    mandate: 'Funded Master Allocation + Volatility Blaze Feed',
    highlightMetric: 'Rule-Based Scaling',
    quote:
      'Pairing Volatility Blaze session structure briefings with Funded Master evaluation rules transformed how our desk approaches London-New York overlap liquidity.',
    tags: ['Funded Capital', 'Zero-Custody Alerts', 'Strict Drawdown'],
  },
  {
    id: 'cohort-graduate',
    persona: 'Derivatives & FX Cohort Participant',
    region: 'Mumbai & Frankfurt Corridors',
    mandate: 'Stockarth Academy + Finup Global Live Track',
    highlightMetric: 'Practitioner Curriculum',
    quote:
      'Learning position sizing and macro liquidity structure first—before deploying capital into automated vaults—set a completely different standard of risk discipline.',
    tags: ['Structured Learning', 'Live FX Rooms', 'Risk First'],
  },
];
