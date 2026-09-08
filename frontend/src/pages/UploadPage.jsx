import { useState } from 'react';
import { Link } from 'react-router-dom';
import UploadForm from '../components/UploadForm';
import './pages.css';

export default function UploadPage({ isLoggedIn }) {
  const [done, setDone] = useState(0);

  return (
    <section className="page" aria-labelledby="upload-title">
      <h1 className="page__title" id="upload-title">Upload Song</h1>

      {isLoggedIn ? (
        <>
          <UploadForm onUploaded={() => setDone((n) => n + 1)} />
          {done > 0 && (
            <p className="page__note">
              Uploaded. It will appear in Trending Today on the{' '}
              <Link className="linkish" to="/">home page</Link>.
            </p>
          )}
        </>
      ) : (
        <p className="page__note">
          <Link className="linkish" to="/login">Sign in</Link> to upload a song.
        </p>
      )}
    </section>
  );
}
