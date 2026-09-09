import { Link } from 'react-router-dom';
import '../library/library.css';

/**
 * Shown wherever a library surface needs an account.
 *
 * A library belongs to a person, so there is nothing meaningful to render for
 * a signed-out visitor — and showing an empty one would repeat the original
 * bug in reverse, implying the account has no data.
 */
export default function SignInPrompt({ what = 'your library' }) {
  return (
    <section className="hero" aria-labelledby="signin-title">
      <h1 className="hero__title" id="signin-title">Sign in to see {what}</h1>
      <p className="hero__blurb">
        Liked songs, playlists and favourite artists are saved to your account,
        so they follow you to any device — and stay yours alone.
      </p>
      <div className="hero__actions">
        <Link className="button button-primary" to="/login">Sign in</Link>
      </div>
    </section>
  );
}
