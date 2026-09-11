import { Link } from 'react-router-dom';

/**
 * `tag` sits inside the heading ("Trending · Today"), so a screen reader
 * hears the time window as part of the title rather than as stray text.
 */
export default function SectionHeader({ title, id, showAllTo, tag }) {
  return (
    <header className="section__head">
      <h2 className="section__title" id={id}>
        {title}
        {tag && <span className="section__tag">{tag}</span>}
      </h2>
      {showAllTo && (
        <Link className="section__link" to={showAllTo}>Show All</Link>
      )}
    </header>
  );
}
