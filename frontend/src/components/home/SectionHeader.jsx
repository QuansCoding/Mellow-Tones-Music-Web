import { Link } from 'react-router-dom';

export default function SectionHeader({ title, id, showAllTo }) {
  return (
    <header className="section__head">
      <h2 className="section__title" id={id}>{title}</h2>
      {showAllTo && (
        <Link className="section__link" to={showAllTo}>Show All</Link>
      )}
    </header>
  );
}
