/**
 * Cover art slot.
 *
 * The backend has no artwork field yet, so this renders the Figma's solid
 * placeholder shape. The moment songs carry an image URL, pass `src` and it
 * becomes a real <img> with no other change.
 */
export default function Artwork({ src, alt, className = '' }) {
  if (src) {
    return <img className={`artwork ${className}`} src={src} alt={alt} loading="lazy" />;
  }
  return (
    <span className={`artwork artwork--empty ${className}`} role="img" aria-label={alt} />
  );
}
