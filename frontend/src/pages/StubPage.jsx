import './pages.css';

/**
 * Placeholder for the eight nav destinations the Figma does not design.
 * Deliberately plain — inventing a look for an undesigned screen would be
 * guessing at the designer's intent.
 */
export default function StubPage({ title, blurb }) {
  return (
    <section className="stub" aria-labelledby="stub-title">
      <h1 className="stub__title" id="stub-title">{title}</h1>
      <p className="stub__blurb">{blurb ?? 'This screen has not been designed yet.'}</p>
    </section>
  );
}
