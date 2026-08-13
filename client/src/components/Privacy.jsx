import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="page">
      <div className="container about-page">
        <header className="about-header">
          <h1>Privacy</h1>
          <p className="about-intro">
            We value your privacy. We don't sell your data or share it with advertisers — full stop.

Here's what we do store: your typing test results, WPM/accuracy history, and basic profile info, so you can track your progress and show up on the leaderboard. If you use the AI passage or summary features, some of your typing performance data (like which characters you tend to mistype) gets sent to Google's Gemini API to generate personalized content — that's the only third party involved, and it's solely to power that feature.

No tracking, no ad networks, no selling your info. If you have questions about your data, feel free to reach out.{" "}
            <Link to="/about">reach out on the About page</Link>.
          </p>
        </header>
      </div>
    </div>
  );
}
