
import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { useAuth } from "../lib/auth";

const features = [
  {
    number: "01",
    icon: "⌕",
    title: "Discover resources",
    description:
      "Search notes by subject, semester, course and category. Find relevant material without wasting time.",
    link: "/read",
    action: "Explore library",
  },
  {
    number: "02",
    icon: "↥",
    title: "Contribute knowledge",
    description:
      "Upload your study material and make useful academic resources accessible to other students.",
    link: "/upload",
    action: "Share your notes",
  },
  {
    number: "03",
    icon: "▤",
    title: "Your personal library",
    description:
      "Manage your uploads, update metadata and control how other students access your notes.",
    link: "/my-notes",
    action: "Manage library",
  },
];

const benefits = [
  {
    icon: "◈",
    title: "Organised learning",
    description: "Structured by subjects, courses and semesters.",
  },
  {
    icon: "◎",
    title: "Controlled sharing",
    description: "Choose public, link-only or private visibility.",
  },
  {
    icon: "✧",
    title: "Community driven",
    description: "Learn from resources contributed by fellow students.",
  },
];

export function Home() {
  const { user } = useAuth();

  const firstName = user?.name?.trim()?.split(/\s+/)[0] || "Student";

  return (
    <>
      <Navbar />

      <main className="home-dashboard">
        {/* HERO */}
        <section className="home-hero">
          <div className="hero-background-orb orb-one" />
          <div className="hero-background-orb orb-two" />

          <div className="home-hero-content">
            <div className="home-welcome-label">
              <span className="welcome-dot" />
              YOUR ACADEMIC WORKSPACE
            </div>

            <h1>
              Knowledge grows
              <br />
              when it's <span>shared.</span>
            </h1>

            <p>
              Welcome back, {firstName}. Discover quality study materials,
              organise your resources and share what you know with your
              academic community.
            </p>

            <div className="home-hero-actions">
              <Link to="/read" className="home-main-button">
                Explore notes <span>↗</span>
              </Link>

              <Link to="/upload" className="home-outline-button">
                <span>＋</span> Upload material
              </Link>
            </div>

            <div className="home-hero-footnote">
              <span className="footnote-icon">✦</span>
              A smarter way to learn together.
            </div>
          </div>

          {/* DECORATIVE BOOK ILLUSTRATION */}
          <div className="hero-art" aria-hidden="true">
            <div className="art-glow" />

            <div className="art-orbit orbit-a" />
            <div className="art-orbit orbit-b" />

            <div className="art-document document-back">
              <div className="document-topline" />
              <div className="document-line long" />
              <div className="document-line" />
              <div className="document-line short" />
              <div className="document-block" />
            </div>

            <div className="art-document document-front">
              <div className="document-logo">N.</div>
              <div className="document-caption">YOUR LIBRARY</div>
              <div className="document-heading">Ideas become</div>
              <div className="document-heading">knowledge.</div>
              <div className="document-divider" />
              <div className="document-line long" />
              <div className="document-line" />
              <div className="document-line short" />
              <div className="document-tag">LEARN · SHARE · GROW</div>
            </div>

            <div className="floating-chip chip-top">
              <span>✧</span> Keep learning
            </div>

            <div className="floating-chip chip-bottom">
              <span className="chip-check">✓</span>
              Share your knowledge
            </div>
          </div>
        </section>

        {/* QUICK ACCESS */}
        <section className="home-section">
          <div className="home-section-heading">
            <div>
              <div className="home-kicker">GET STARTED</div>
              <h2>Your workspace, your way.</h2>
              <p>Everything you need, just one step away.</p>
            </div>

            <span className="section-index">01 / WORKSPACE</span>
          </div>

          <div className="home-feature-grid">
            {features.map((feature) => (
              <Link
                to={feature.link}
                className="home-feature-card"
                key={feature.number}
              >
                <div className="feature-card-top">
                  <span className="feature-icon">{feature.icon}</span>
                  <span className="feature-number">{feature.number}</span>
                </div>

                <h3>{feature.title}</h3>

                <p>{feature.description}</p>

                <div className="feature-action">
                  {feature.action}
                  <span>↗</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* PLATFORM VALUE */}
        <section className="home-value-section">
          <div className="value-intro">
            <div className="home-kicker">BUILT FOR STUDENTS</div>

            <h2>
              Less searching.
              <br />
              More <span>learning.</span>
            </h2>

            <p>
              A shared academic space designed to make study materials easier
              to discover, organise and exchange.
            </p>

            <Link to="/read" className="value-text-link">
              Explore the library <span>→</span>
            </Link>
          </div>

          <div className="value-list">
            {benefits.map((benefit, index) => (
              <div className="value-item" key={benefit.title}>
                <div className="value-icon">{benefit.icon}</div>

                <div>
                  <div className="value-item-number">
                    0{index + 1} / BENEFIT
                  </div>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="home-bottom-cta">
          <div>
            <div className="home-kicker">YOUR NEXT STEP</div>
            <h2>Have something worth sharing?</h2>
            <p>
              Your notes might be exactly what another student needs.
            </p>
          </div>

          <Link to="/upload" className="home-cta-button">
            Contribute a resource <span>↗</span>
          </Link>
        </section>

        {/* FOOTER */}
        <footer className="home-footer">
          <Link to="/" className="footer-brand">
            <span className="footer-brand-mark">N</span>
            NoteShare
          </Link>

          <span>Learn together. Grow together.</span>

          <Link to="/profile">Your account ↗</Link>
        </footer>
      </main>

      <style>{`
        .home-dashboard {
          width: min(1240px, 91%);
          margin: 0 auto;
          padding: 36px 0 35px;
        }

        /* HERO */

        .home-hero {
          position: relative;
          overflow: hidden;
          min-height: 445px;
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          align-items: center;
          padding: 55px 62px;

          color: white;
          background:
            linear-gradient(115deg, #1d2046 0%, #302d69 55%, #5147a5 100%);

          border-radius: 26px;
          box-shadow: 0 22px 60px rgba(39, 35, 100, 0.2);
        }

        .home-hero-content {
          position: relative;
          z-index: 3;
        }

        .home-welcome-label {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 8px 12px;
          color: #d9d6ff;
          background: rgba(255,255,255,0.09);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 30px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.13em;
        }

        .welcome-dot {
          width: 7px;
          height: 7px;
          background: #a9f16c;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(169,241,108,0.8);
        }

        .home-hero h1 {
          margin: 26px 0 17px;
          color: white;
          font-family: 'Manrope', sans-serif;
          font-size: clamp(39px, 5vw, 58px);
          line-height: 1.1;
          font-weight: 800;
          letter-spacing: -0.065em;
        }

        .home-hero h1 span {
          color: #b6f78a;
        }

        .home-hero-content > p {
          max-width: 510px;
          color: #cecee9;
          font-size: 13px;
          line-height: 1.9;
        }

        .home-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
        }

        .home-main-button,
        .home-outline-button {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          padding: 13px 18px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 800;
          transition: all 180ms ease;
        }

        .home-main-button {
          color: #25234e;
          background: #b5f386;
          box-shadow: 0 6px 20px rgba(169,241,108,0.13);
        }

        .home-main-button:hover {
          transform: translateY(-3px);
          background: #c8ffa0;
        }

        .home-outline-button {
          color: white;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.23);
        }

        .home-outline-button:hover {
          background: rgba(255,255,255,0.15);
          transform: translateY(-3px);
        }

        .home-hero-footnote {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 35px;
          color: #b9b8dc;
          font-size: 10px;
          font-weight: 600;
        }

        .footnote-icon {
          color: #b5f386;
        }

        /* HERO ART */

        .hero-art {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 340px;
          display: grid;
          place-items: center;
        }

        .art-glow {
          position: absolute;
          width: 280px;
          height: 280px;
          background: rgba(158,147,255,0.2);
          border-radius: 50%;
          filter: blur(55px);
        }

        .art-orbit {
          position: absolute;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 50%;
        }

        .orbit-a {
          width: 290px;
          height: 290px;
        }

        .orbit-b {
          width: 370px;
          height: 370px;
          border-style: dashed;
          opacity: 0.5;
        }

        .art-document {
          position: absolute;
          width: 205px;
          height: 260px;
          padding: 21px;
          border-radius: 12px;
          box-shadow: 0 25px 55px rgba(12,12,40,0.3);
        }

        .document-back {
          background: #c4c2fa;
          transform: translate(48px, 7px) rotate(10deg);
          opacity: 0.85;
        }

        .document-front {
          background: linear-gradient(145deg, #fff, #f2f1ff);
          transform: translate(-14px, 3px) rotate(-5deg);
          color: #292b52;
        }

        .document-logo {
          color: #655bdc;
          font-family: 'Manrope', sans-serif;
          font-size: 23px;
          font-weight: 800;
        }

        .document-caption {
          margin-top: 23px;
          color: #8986b3;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .document-heading {
          font-family: 'Manrope', sans-serif;
          font-size: 16px;
          font-weight: 800;
          line-height: 1.35;
        }

        .document-divider {
          width: 32px;
          height: 3px;
          margin: 14px 0;
          background: #8c83f2;
          border-radius: 4px;
        }

        .document-line {
          width: 75%;
          height: 4px;
          margin: 9px 0;
          background: #deddf0;
          border-radius: 4px;
        }

        .document-line.long {
          width: 100%;
        }

        .document-line.short {
          width: 48%;
        }

        .document-block {
          width: 100%;
          height: 42px;
          margin-top: 17px;
          background: rgba(113,103,224,0.12);
          border-radius: 5px;
        }

        .document-tag {
          margin-top: 17px;
          color: #7772b5;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .floating-chip {
          position: absolute;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 14px;
          color: #35335f;
          background: rgba(255,255,255,0.96);
          border: 1px solid rgba(255,255,255,0.7);
          border-radius: 11px;
          box-shadow: 0 10px 25px rgba(15,15,50,0.16);
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .chip-top {
          top: 24px;
          right: 5px;
        }

        .chip-top span {
          color: #655bdc;
          font-size: 16px;
        }

        .chip-bottom {
          bottom: 28px;
          left: -5px;
        }

        .chip-check {
          display: grid;
          place-items: center;
          width: 19px;
          height: 19px;
          color: white;
          background: #29a878;
          border-radius: 50%;
          font-size: 11px;
        }

        /* SECTIONS */

        .home-section {
          padding-top: 66px;
        }

        .home-section-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 24px;
        }

        .home-kicker {
          color: #7269d9;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .home-section-heading h2 {
          margin: 8px 0 5px;
          font-size: 27px;
        }

        .home-section-heading p {
          margin: 0;
          color: #898da0;
          font-size: 12px;
        }

        .section-index {
          color: #a0a3b2;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          white-space: nowrap;
        }

        /* FEATURE CARDS */

        .home-feature-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 17px;
        }

        .home-feature-card {
          min-height: 240px;
          display: flex;
          flex-direction: column;
          padding: 23px;
          background: white;
          border: 1px solid #e9eaf2;
          border-radius: 17px;
          box-shadow: 0 4px 16px rgba(28,31,67,0.025);
          transition: all 220ms ease;
        }

        .home-feature-card:hover {
          transform: translateY(-6px);
          border-color: #d2ceff;
          box-shadow: 0 16px 35px rgba(50,45,120,0.09);
        }

        .feature-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .feature-icon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          color: #655bdc;
          background: #efeeff;
          border-radius: 13px;
          font-size: 23px;
        }

        .feature-number {
          color: #b0b1c0;
          font-family: 'Manrope', sans-serif;
          font-size: 11px;
          font-weight: 800;
        }

        .home-feature-card h3 {
          margin: 22px 0 8px;
          color: #242640;
          font-family: 'Manrope', sans-serif;
          font-size: 16px;
        }

        .home-feature-card p {
          margin: 0;
          color: #85899c;
          font-size: 11px;
          line-height: 1.8;
        }

        .feature-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 22px;
          color: #655bdc;
          font-size: 11px;
          font-weight: 800;
        }

        .feature-action span {
          font-size: 16px;
          transition: transform 180ms ease;
        }

        .home-feature-card:hover .feature-action span {
          transform: translate(3px,-3px);
        }

        /* VALUE SECTION */

        .home-value-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 75px;
          padding: 76px 25px;
          align-items: center;
        }

        .value-intro h2 {
          margin: 13px 0;
          font-size: 38px;
          line-height: 1.2;
        }

        .value-intro h2 span {
          color: #6b61dc;
        }

        .value-intro > p {
          max-width: 400px;
          color: #85899c;
          font-size: 12px;
          line-height: 1.9;
        }

        .value-text-link {
          display: inline-flex;
          gap: 11px;
          align-items: center;
          margin-top: 17px;
          color: #655bdc;
          font-size: 12px;
          font-weight: 800;
        }

        .value-text-link span {
          font-size: 17px;
          transition: transform 180ms ease;
        }

        .value-text-link:hover span {
          transform: translateX(5px);
        }

        .value-list {
          display: flex;
          flex-direction: column;
          gap: 26px;
        }

        .value-item {
          display: flex;
          align-items: flex-start;
          gap: 17px;
        }

        .value-icon {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          color: #655bdc;
          background: #eeedff;
          border-radius: 13px;
          font-size: 20px;
        }

        .value-item-number {
          color: #a0a3b2;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .value-item h3 {
          margin: 5px 0;
          color: #292b47;
          font-size: 14px;
        }

        .value-item p {
          margin: 0;
          color: #8b8fa1;
          font-size: 11px;
        }

        /* CTA */

        .home-bottom-cta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 25px;
          padding: 31px 36px;
          background: #eeedff;
          border: 1px solid #e0defd;
          border-radius: 19px;
        }

        .home-bottom-cta h2 {
          margin: 8px 0 5px;
          color: #29264f;
          font-size: 21px;
        }

        .home-bottom-cta p {
          margin: 0;
          color: #8581ac;
          font-size: 11px;
        }

        .home-cta-button {
          display: inline-flex;
          align-items: center;
          gap: 15px;
          padding: 13px 17px;
          color: white;
          background: #6259d5;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          transition: all 180ms ease;
        }

        .home-cta-button:hover {
          background: #4f46bd;
          transform: translateY(-2px);
        }

        /* FOOTER */

        .home-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 28px 3px 0;
          margin-top: 30px;
          border-top: 1px solid #e9eaf2;
          color: #999daf;
          font-size: 10px;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #303250;
          font-family: 'Manrope', sans-serif;
          font-size: 13px;
          font-weight: 800;
        }

        .footer-brand-mark {
          width: 25px;
          height: 25px;
          display: grid;
          place-items: center;
          color: white;
          background: #6259d5;
          border-radius: 7px;
        }

        .home-footer > a:last-child {
          color: #655bdc;
          font-weight: 800;
        }

        /* RESPONSIVE */

        @media (max-width: 900px) {
          .home-hero {
            padding: 40px;
            grid-template-columns: 1fr 0.7fr;
          }

          .hero-art {
            transform: scale(0.82);
          }

          .home-value-section {
            gap: 35px;
          }
        }

        @media (max-width: 650px) {
          .home-dashboard {
            width: calc(100% - 30px);
            padding-top: 20px;
          }

          .home-hero {
            display: block;
            min-height: auto;
            padding: 32px 23px 20px;
            border-radius: 20px;
          }

          .home-hero h1 {
            font-size: 39px;
          }

          .home-hero-content > p {
            font-size: 12px;
          }

          .hero-art {
            height: 270px;
            margin-top: 10px;
            transform: scale(0.8);
          }

          .chip-top {
            right: -5px;
          }

          .chip-bottom {
            left: -10px;
          }

          .home-section {
            padding-top: 45px;
          }

          .home-section-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 9px;
          }

          .home-section-heading h2 {
            font-size: 23px;
          }

          .home-feature-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .home-feature-card {
            min-height: 205px;
          }

          .home-value-section {
            grid-template-columns: 1fr;
            gap: 37px;
            padding: 55px 5px;
          }

          .value-intro h2 {
            font-size: 34px;
          }

          .home-bottom-cta {
            align-items: flex-start;
            flex-direction: column;
            padding: 25px 22px;
          }

          .home-bottom-cta h2 {
            font-size: 19px;
          }

          .home-footer {
            flex-wrap: wrap;
            font-size: 9px;
          }
        }

        @media (max-width: 380px) {
          .home-hero h1 {
            font-size: 33px;
          }

          .home-hero-actions {
            flex-direction: column;
          }

          .home-main-button,
          .home-outline-button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
