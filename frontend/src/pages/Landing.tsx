import React from 'react';
import './Landing.css';

const features = [
  {
    icon: '⚡',
    title: 'Unified Signal Intake',
    copy: 'Stream structured metrics, unstructured logs, and experiment context into a single telemetry fabric that learns what healthy looks like for each model.'
  },
  {
    icon: '🧭',
    title: 'Real-Time Drift Orchestration',
    copy: 'Detect drift in minutes with adaptive thresholds, automated baselines, and workflows that trigger the right retraining or rollback action.'
  },
  {
    icon: '🛡️',
    title: 'Quality Guardrails',
    copy: 'Prove compliance instantly with living documentation, auditor-ready evidence packs, and lineage across datasets, experiments, and deployments.'
  },
  {
    icon: '🤝',
    title: 'Human-In-The-Loop Decisions',
    copy: 'Route critical events to the right owner with guided reviews, contextual chat, and approvals that sync back to your issue tracker.'
  }
];

const process = [
  {
    phase: 'Phase 01',
    title: 'Sense the Unknowns',
    copy: 'Recalibra ingests production signals, benchmark datasets, and external factors to establish ground truth of model behaviour in the wild.'
  },
  {
    phase: 'Phase 02',
    title: 'Diagnose & Explain',
    copy: 'Our insight engine surfaces the root cause of destabilization with layered dashboards, pin-point cohort splits, and narrative-ready summaries.'
  },
  {
    phase: 'Phase 03',
    title: 'Recalibrate',
    copy: 'Auto-assemble candidate datasets, launch controlled retraining jobs, and validate performance lift before promoting to production safely.'
  },
  {
    phase: 'Phase 04',
    title: 'Operationalize Governance',
    copy: 'Codify policies, connect to risk systems, and automate evidence workflows so your AI governance posture stays continuously audit-ready.'
  }
];

const stats = [
  { value: '50+', label: 'Model families stabilized in the past quarter' },
  { value: '12 min', label: 'Median time from drift alert to resolution' },
  { value: '94%', label: 'Reduction in manual evidence prep effort' },
  { value: '4 continents', label: 'Enterprise teams we actively partner with' }
];

const team = [
  {
    name: 'Aadith V A',
    role: 'Co-founder & CEO',
    bio: 'Focused on translating regulated enterprise needs into a calming AI operations experience for product and risk teams alike.'
  },
  {
    name: 'Adi Narayan',
    role: 'Co-founder & CTO',
    bio: 'Architects the telemetry and automation stack that lets mission-critical models stay performant, observant, and compliant.'
  },
  {
    name: 'Hari K',
    role: 'Co-founder & COO',
    bio: 'Brings ops rigor to every deployment, blending program management with hands-on insight work to keep teams moving.'
  }
];

const snapshot = [
  {
    category: 'Origins',
    title: 'Built from a middle-school math team',
    copy: 'We met on a seventh-grade math team, broke off from a stalled project to build Charma and Therapose, and have shipped apps, research, and prototypes together for five years.'
  },
  {
    category: 'Product Craft',
    title: 'Code stays with the founders',
    copy: 'Twisha leads the FastAPI services, PostgreSQL schema, and drift pipeline. Gauri owns the React experience, backend integrations, and dashboards. Every line is founder-built.'
  },
  {
    category: 'Trajectory',
    title: 'Philadelphia & Princeton → San Francisco',
    copy: 'We currently study in Philadelphia and Princeton. For YC, we’ll base in San Francisco to stay close to biotech customers, advisors, and talent.'
  },
  {
    category: 'Progress',
    title: '25 interviews and an integrated MVP',
    copy: 'We interviewed teams at Genentech, Penn Medicine, and Princeton, built Benchling + MOE integrations, and already flag drift on simulated assay data with KS tests.'
  },
  {
    category: 'Time In',
    title: 'Four months building, full-time next month',
    copy: 'We pivoted from Donezo to Recalibra two weeks ago, after four months of paired research and validation. We go full-time in December during winter break.'
  },
  {
    category: 'Stack',
    title: 'FastAPI · PostgreSQL · React · PyTorch',
    copy: 'Our pipeline spans Airflow schedules, Pandas normalization, MLflow versioning, scikit-learn/statistical drift tests, PyTorch retraining, and Plotly-infused dashboards.'
  }
];

const marketHighlights = [
  {
    tag: 'What we build',
    title: 'Software that keeps computational biology models accurate as lab conditions shift',
    copy: 'Recalibra links predictions from MOE or internal pipelines with experimental outcomes from Benchling or LIMS, aligns by molecule and assay metadata, and continuously scores reality versus expectation.'
  },
  {
    tag: 'Why we win',
    title: 'Only platform stitching wet-lab metadata into model drift detection and correction',
    copy: 'Benchling stores results. Weights & Biases and Domino watch metrics. Recalibra does both, tying reagent lots, instrument calibrations, and operator context to fix the exact source of error.'
  },
  {
    tag: 'Commercial model',
    title: 'SaaS priced per monitored model family',
    copy: 'Academic and startup labs pay $400–$800/month; enterprise teams land at $25K–$100K/year. Capturing ~800 of 8,000+ labs puts us on a $40M ARR path, expanding via usage-based retraining and SDK licensing.'
  },
  {
    tag: 'Allies',
    title: 'Backed by Penn VIP and Princeton e-lab communities',
    copy: 'We work with startup coaches, legal and finance mentors, and grant support through Penn VIP, Princeton e-lab, Telora, and YC alumni who continue to guide our milestones.'
  }
];

const roadmapPlan = [
  {
    phase: 'Month 1',
    title: 'Production integrations',
    copy: 'Finish Benchling, MOE, and LIMS connectors, harden the backend for larger datasets, expand drift detection to live inputs, and finalize the real-time dashboard experience.',
    spend: '$3,000'
  },
  {
    phase: 'Months 2-3',
    title: 'Pilot validation',
    copy: 'Run pilots with research labs, capture feedback, document drift detections, quantify time saved, and polish workflows for usability and compliance readiness.',
    spend: '$5,000'
  },
  {
    phase: 'Month 4',
    title: 'Compliance & scale',
    copy: 'Ship audit logging, MLflow-led versioning, automated retraining in the cloud, and partner APIs so Recalibra is pilot-ready for mid-sized biotech teams.',
    spend: '$10,000'
  }
];

const sciencePoints = [
  'Recalibra continuously compares model predictions—docking scores, sequence-activity values, simulation outputs—against experimental outcomes, calculating RMSE, MAE, and R² to quantify degradation.',
  'Kolmogorov-Smirnov, Population Stability Index, and KL divergence tests monitor distribution drift while metadata on assays, reagents, instruments, and operators spot the root cause of instability.',
  'Open models retrain automatically with PyTorch or XGBoost on the latest data; closed systems receive a regression-based correction layer that keeps predictions aligned with new lab conditions.'
];

const faqs = [
  {
    q: 'How quickly can Recalibra plug into our workflow?',
    a: 'Most teams see first telemetry flowing inside a week. We provide turnkey connectors for Snowflake, Databricks, SageMaker, Vertex, and custom APIs.'
  },
  {
    q: 'Do you support regulated industries?',
    a: 'Yes. We work with life sciences, finance, and energy teams. Templates encode FDA, EMA, and OCC expectations so evidence lands exactly where auditors look.'
  },
  {
    q: 'Can we bring our own monitoring stack?',
    a: 'Absolutely. Recalibra complements your existing observability tooling and becomes the orchestration layer for drift management and governance.'
  },
  {
    q: 'What pricing model do you offer?',
    a: 'We partner with a subscription that scales by the number of critical model families, plus white-glove onboarding. Let’s design the right program together.'
  },
  {
    q: 'How is Recalibra different from MLOps dashboards?',
    a: 'Dashboards inform, Recalibra resolves. We close the loop between detection, diagnosis, recalibration, and documented governance in one command center.'
  },
  {
    q: 'Do you work with frontier model teams?',
    a: 'Yes. We help teams calibrate both in-house and third-party foundation models, including tracking prompt drift and alignment regressions.'
  }
];

const Landing: React.FC = () => {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="brand">
          <span className="brand-dot" />
          Recalibra
        </div>
        <div className="landing-nav-links">
          <a className="landing-nav-link" href="#insights">
            Company
          </a>
          <a className="landing-nav-link" href="#platform">
            Platform
          </a>
          <a className="landing-nav-link" href="#process">
            Process
          </a>
          <a className="landing-nav-link" href="#roadmap">
            Plans
          </a>
          <a className="landing-nav-link" href="#team">
            Team
          </a>
          <a className="landing-nav-link" href="#science">
            Science
          </a>
          <a className="landing-nav-link" href="#faq">
            FAQ
          </a>
        </div>
        <a className="landing-nav-cta" href="#contact">
          Book A Session
        </a>
      </nav>

      <main className="landing-content">
        <section className="hero" id="top">
          <div className="hero-copy">
            <span className="hero-eyebrow">Purpose-built for regulated AI teams</span>
            <h1 className="hero-title">
              Keep every model in
              <br />
              <span>calibrated equilibrium.</span>
            </h1>
            <p className="hero-subtitle">
              Recalibra is the command center for high-stakes AI operations. Detect drift early, guide the right fix,
              and ship auditor-ready evidence in hours—not weeks.
            </p>
            <div className="hero-actions">
              <a className="hero-primary" href="#contact">
                Start A Drift Readiness Review →
              </a>
              <a className="hero-secondary" href="#platform">
                Explore the Platform
              </a>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-visual-grid" />
            <div className="hero-visual-content">
              <div className="highlight-card">
                <h4>Recalibration Pulse</h4>
                <p>Next best action queued for 3 model families undergoing regulatory review.</p>
              </div>
              <div className="metric-strip">
                <div className="metric-chip">
                  <span className="metric-value">▲ 32%</span>
                  <span className="metric-label">Stability Gain Post-Retrain</span>
                </div>
                <div className="metric-chip">
                  <span className="metric-value">11k</span>
                  <span className="metric-label">Signals Monitored</span>
                </div>
                <div className="metric-chip">
                  <span className="metric-value">0</span>
                  <span className="metric-label">Open Critical Alerts</span>
                </div>
              </div>
              <div className="highlight-card">
                <h4>Audit Trail</h4>
                <p>Evidence pack automatically generated for Q4 compliance window.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="platform">
          <div className="section-heading">
            <span className="section-eyebrow">THE PLATFORM</span>
            <h2 className="section-title">Built to orchestrate model health end-to-end</h2>
            <p className="section-subtitle">
              Recalibra combines telemetry, explainability, experimentation, and governance so your teams fix what
              matters—and prove it—to every stakeholder.
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature) => (
              <div className="feature-card" key={feature.title}>
                <div className="feature-icon" aria-hidden="true">
                  {feature.icon}
                </div>
                <h4>{feature.title}</h4>
                <p>{feature.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section dark">
          <div className="section-heading">
            <span className="section-eyebrow">IMPACT</span>
            <h2 className="section-title">Operations teams measure Recalibra in outcomes</h2>
          </div>
          <div className="stats-grid">
            {stats.map((stat) => (
              <div className="stat-card" key={stat.label}>
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="process">
          <div className="section-heading">
            <span className="section-eyebrow">HOW WE CALIBRATE</span>
            <h2 className="section-title">A playbook honed with regulated enterprises</h2>
            <p className="section-subtitle">
              We embed alongside your teams, from discovery to deployment. Each phase of the journey is codified so
              institutional knowledge stays intact long after go-live.
            </p>
          </div>
          <div className="process-grid">
            {process.map((step) => (
              <div className="process-card" key={step.phase}>
                <span className="process-number">{step.phase}</span>
                <h4>{step.title}</h4>
                <p>{step.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="insights">
          <div className="section-heading">
            <span className="section-eyebrow">THE FOUNDERS</span>
            <h2 className="section-title">We’ve grown up building together</h2>
            <p className="section-subtitle">
              From seventh-grade math team to YC-ready biotech infrastructure, our rhythm is rapid user discovery,
              proof-driven engineering, and shipping what removes the most friction.
            </p>
          </div>
          <div className="insight-grid">
            {snapshot.map((item) => (
              <div className="insight-card" key={item.title}>
                <span className="insight-category">{item.category}</span>
                <h4>{item.title}</h4>
                <p>{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section dark" id="team">
          <div className="section-heading">
            <span className="section-eyebrow">STEADY HANDS</span>
            <h2 className="section-title">The team guiding AI into reliable production</h2>
          </div>
          <div className="team-grid">
            {team.map((member) => (
              <div className="team-card" key={member.name}>
                <div className="team-avatar" aria-hidden="true" />
                <span className="team-role">{member.role}</span>
                <span className="team-name">{member.name}</span>
                <p className="team-bio">{member.bio}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="market">
          <div className="section-heading">
            <span className="section-eyebrow">WHY NOW</span>
            <h2 className="section-title">Biology teams need drift remediation, not just dashboards</h2>
          </div>
          <div className="market-grid">
            {marketHighlights.map((item) => (
              <div className="market-card" key={item.title}>
                <span className="market-tag">{item.tag}</span>
                <h4>{item.title}</h4>
                <p>{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section dark" id="roadmap">
          <div className="section-heading">
            <span className="section-eyebrow">THE NEXT 4 MONTHS</span>
            <h2 className="section-title">A clear path from MVP to production pilots</h2>
            <p className="section-subtitle">
              We’ve scoped milestones, resourcing, and validation criteria so Recalibra is enterprise-ready by Demo Day.
            </p>
          </div>
          <div className="roadmap-grid">
            {roadmapPlan.map((stage) => (
              <div className="roadmap-card" key={stage.phase}>
                <span className="roadmap-phase">{stage.phase}</span>
                <h4>{stage.title}</h4>
                <p>{stage.copy}</p>
                <span className="roadmap-spend">Estimated spend · {stage.spend}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="science">
          <div className="section-heading">
            <span className="section-eyebrow">SCIENTIFIC BASIS</span>
            <h2 className="section-title">Statistical drift detection with adaptive correction</h2>
            <p className="section-subtitle">
              Recalibra is built for scientists. The platform speaks the language of assays, reagents, and compliance
              audits while preserving mathematical integrity end to end.
            </p>
          </div>
          <ul className="science-list">
            {sciencePoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        <section className="section" id="faq">
          <div className="section-heading">
            <span className="section-eyebrow">FAQ</span>
            <h2 className="section-title">Answers before we dive deeper together</h2>
          </div>
          <div className="faq-grid">
            {faqs.map((item) => (
              <div className="faq-card" key={item.q}>
                <h4 className="faq-question">{item.q}</h4>
                <p className="faq-answer">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="cta-panel">
          <div>
            <strong>Let’s recalibrate your production AI in 30 days.</strong>
            <p>
              We co-pilot with your engineers, data scientists, and risk leads to harden the entire lifecycle. From
              ingest to audit, your models stay trustworthy.
            </p>
            <div className="cta-actions">
              <a className="hero-primary" href="#contact">
                Schedule Alignment Call →
              </a>
              <a className="hero-secondary" href="#platform">
                View Success Stories
              </a>
            </div>
          </div>
        </section>

        <section className="section contact-card" id="contact">
          <div className="section-heading">
            <span className="section-eyebrow">CONNECT</span>
            <h2 className="section-title">Bring Recalibra to your model teams</h2>
            <p className="section-subtitle">
              Share a few details and we’ll align on a roadmap tailored to the risk posture, speed, and sensitivity your
              AI programs demand.
            </p>
          </div>
          <form>
            <div>
              <label htmlFor="name">Your name</label>
              <input id="name" name="name" placeholder="Jordan Winters" />
            </div>
            <div>
              <label htmlFor="email">Work email</label>
              <input id="email" name="email" placeholder="jordan@company.com" />
            </div>
            <div>
              <label htmlFor="message">Where do you need Recalibra most?</label>
              <textarea
                id="message"
                name="message"
                placeholder="Share a bit about the models, risks, or workflows you need to stabilize."
              />
            </div>
            <button type="button">Send Message</button>
          </form>
        </section>
      </main>

      <footer className="footer">
        <div className="brand">
          <strong>RECALIBRA</strong>
          <p>
            A precision control layer for regulated AI. We help your model teams design, deploy, and defend AI that
            stays calibrated to reality.
          </p>
        </div>
        <div className="footer-links">
          <span>Navigation</span>
          <a href="#insights">Company</a>
          <a href="#platform">Platform</a>
          <a href="#process">Process</a>
          <a href="#team">Team</a>
          <a href="#roadmap">Roadmap</a>
          <a href="#science">Science</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="footer-links">
          <span>Get in touch</span>
          <a href="mailto:hello@recalibra.ai">hello@recalibra.ai</a>
          <a href="tel:+19175551234">+1 (917) 555-1234</a>
          <a href="#contact">Book a Session</a>
        </div>
        <div className="footer-meta">
          <span>© {new Date().getFullYear()} Recalibra. All rights reserved.</span>
          <div>
            <a className="landing-nav-link" href="#privacy">
              Privacy
            </a>{' '}
            ·{' '}
            <a className="landing-nav-link" href="#terms">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

