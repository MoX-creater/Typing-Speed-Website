export default function About() {
  return (
    <div className="page">
      <div className="container about-page">
        <header className="about-header">
          <h1>About</h1>
          <p className="subtitle">A laid-back typing playground with live WPM, accuracy, and multiplayer races.</p>
          <p className="about-intro">
            This is a typing speed test that tracks your WPM and accuracy in real time, plus
            gives you live multiplayer race action when you want to turn warmups into a proper
            challenge.
          </p>
        </header>

        <section className="about-section">
          <h2>How it works</h2>
          <ul className="about-terms-list">
            <li>
              <span className="about-terms-list-body">
                <span className="about-term">WPM</span>{" "}
                follows the classic typing rule: every 5 characters
                count as one word. That means punctuation and spaces get folded into the same scoring math
                the pros use.
              </span>
            </li>
            <li>
              <span className="about-terms-list-body">
                <span className="about-term">Accuracy</span>{" "}
                is just the ratio of correct characters to total
                typed characters. If you mistype a letter, the score knows it — and if you fix it, it still
                remembers how clean the run was.
              </span>
            </li>
            <li>
              <span className="about-terms-list-body">
                <span className="about-term">Raw WPM</span>{" "}
                is your straight-up typing pace before mistakes are
                fixed.
              </span>
            </li>
            <li>
              <span className="about-terms-list-body">
                <span className="about-term">Corrected / net WPM</span>{" "}
                is the version that reflects the
                real speed after errors get accounted for.
              </span>
            </li>
            <li>
              <span className="about-terms-list-body">
                <span className="about-term">Consistency</span>{" "}
                is how steady your fingers stay. If your speed is a
                smooth cruise, it stays high. If you keep bouncing between hot streaks and slowdowns, it drops.
              </span>
            </li>
          </ul>
        </section>

        <section className="about-section">
          <h2>Features</h2>
          <ul className="about-features-grid">
            <li>Multiple test durations: 15s, 30s, 60s, and 120s.</li>
            <li>Live multiplayer race mode to face off with friends or strangers.</li>
            <li>Global leaderboard for showing off your best runs.</li>
            <li>Profile and session history so you can track progress over time.</li>
            <li>Real-time results graph that paints your performance while you type.</li>
          </ul>
        </section>

        <section className="about-section">
          <h2>Built with</h2>
          <p className="about-stack">
            <span className="about-term">React</span>
            <span className="about-stack-sep" aria-hidden="true"> · </span>
            <span className="about-term">Node.js / Express</span>
            <span className="about-stack-sep" aria-hidden="true"> · </span>
            <span className="about-term">Socket.io</span>
            <span className="about-stack-sep" aria-hidden="true"> · </span>
            <span className="about-term">Firebase</span>
          </p>
        </section>

        <section className="about-section credits">
        <p>
            Built by <a href="https://github.com/MoX-creater" target="_blank" rel="noreferrer">Mox-creater</a>, with a little bit of speed
              and a lot of keyboard love.
        </p>
        </section>
      </div>
    </div>
  );
}
