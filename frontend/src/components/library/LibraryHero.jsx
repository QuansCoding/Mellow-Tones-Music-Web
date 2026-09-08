/**
 * First-run state, shown only when every section is empty.
 *
 * The Figma's all-empty page is three small tiles adrift in ~1100px of void —
 * technically correct, but it makes a new user's first impression look like a
 * loading failure. Promoting it to one centred block with the two real actions
 * gives the page a subject.
 */
export default function LibraryHero({ onAddSongs, onNewPlaylist }) {
  return (
    <section className="hero" aria-labelledby="library-hero-title">
      <h1 className="hero__title" id="library-hero-title">Your library is empty</h1>
      <p className="hero__blurb">
        Save songs you want to keep, or start a playlist. Anything you like on
        the home page shows up here too.
      </p>
      <div className="hero__actions">
        <button type="button" className="button button-primary" onClick={onAddSongs}>
          Add songs
        </button>
        <button type="button" className="button button-ghost" onClick={onNewPlaylist}>
          New playlist
        </button>
      </div>
    </section>
  );
}
