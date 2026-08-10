export default function About() {
  return (
    <div className="page">
      <div className="container about-page">
        <h1>About</h1>
        <p className="subtitle">A laid-back typing playground with live WPM, accuracy, and multiplayer races.</p>

        <div className="glass-card about-card">
          <section className="about-section">
            <h2>Intro</h2>
            <p>
              This is a typing speed test that tracks your WPM and accuracy in real time, plus
              gives you live multiplayer race action when you want to turn warmups into a proper
              challenge.
            </p>
          </section>

          <section className="about-section">
            <h2>How it works</h2>
            <div className="about-note">
              <p>
                <span className="about-term">WPM</span> follows the classic typing rule: every 5 characters
                count as one word. That means punctuation and spaces get folded into the same scoring math
                the pros use.
              </p>
              <p>
                <span className="about-term">Accuracy</span> is just the ratio of correct characters to total
                typed characters. If you mistype a letter, the score knows it — and if you fix it, it still
                remembers how clean the run was.
              </p>
              <p>
                <span className="about-term">Raw WPM</span> is your straight-up typing pace before mistakes are
                fixed. <span className="about-term">Corrected / net WPM</span> is the version that reflects the
                real speed after errors get accounted for.
              </p>
              <p>
                <span className="about-term">Consistency</span> is how steady your fingers stay. If your speed is a
                smooth cruise, it stays high. If you keep bouncing between hot streaks and slowdowns, it drops.
              </p>
            </div>
          </section>

          <section className="about-section">
            <h2>Features</h2>
            <ul className="about-features">
              <li>Multiple test durations: 15s, 30s, 60s, and 120s.</li>
              <li>Live multiplayer race mode to face off with friends or strangers.</li>
              <li>Global leaderboard for showing off your best runs.</li>
              <li>Profile and session history so you can track progress over time.</li>
              <li>Real-time results graph that paints your performance while you type.</li>
            </ul>
          </section>

          <section className="about-section">
            <h2>Built with</h2>
            <div className="tech-badges">
              <span>React</span>
              <span>Node.js / Express</span>
              <span>Socket.io</span>
              <span>Firebase</span>
            </div>
          </section>

          <section className="about-section credits">
            <p>
              Built by <a href="#" target="_blank" rel="noreferrer">[your name]</a>, with a little bit of speed
              and a lot of keyboard love.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
