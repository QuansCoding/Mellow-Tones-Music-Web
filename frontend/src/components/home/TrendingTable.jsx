import { useState } from 'react';
import { usePlayer } from '../player/playerContext';
import Artwork from '../common/Artwork';
import { Heart, Play, Pause } from '../icons/Icons';
import { formatTime } from '../../utils/format';

/** Figma placeholder rows, shown when the library is empty or unreachable. */
const PLACEHOLDERS = [
  { id: 'p1', title: 'Title', artist: 'Artist' },
  { id: 'p2', title: 'Title', artist: 'Artist' },
  { id: 'p3', title: 'Title', artist: 'Artist , Artist2' },
  { id: 'p4', title: 'Title', artist: 'Artist' },
  { id: 'p5', title: 'Title', artist: 'Artist, Artist2' },
];

function Row({ song, rank, live, songs }) {
  const { current, isPlaying, playSong, toggle } = usePlayer();
  const [liked, setLiked] = useState(rank === 1 || rank === 3);

  const isCurrent = live && current?.id === song.id;
  const nowPlaying = isCurrent && isPlaying;

  const onActivate = () => {
    if (!live) return;
    if (isCurrent) toggle();
    else playSong(song, songs);
  };

  return (
    <div className={`trow${isCurrent ? ' trow--current' : ''}`} role="row">
      <span className="trow__rank" role="cell">
        <span className="trow__rank-num">{rank}</span>
        {live && (
          <button
            type="button"
            className="trow__play"
            onClick={onActivate}
            aria-label={nowPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
          >
            {nowPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
        )}
      </span>

      <span className="trow__art" role="cell">
        <Artwork alt={`${song.title} cover art`} />
      </span>

      <span className="trow__song" role="cell">
        <span className="trow__title">{song.title}</span>
        <span className="trow__artist">{song.artist}</span>
      </span>

      <span className="trow__album" role="cell">{song.album ?? '—'}</span>

      <span className="trow__plays" role="cell">
        {live ? (song.play_count ?? '—') : 'Total Plays'}
      </span>

      <span className="trow__like" role="cell">
        <button
          type="button"
          className={`trow__heart${liked ? ' trow__heart--on' : ''}`}
          aria-pressed={liked}
          aria-label={liked ? `Unlike ${song.title}` : `Like ${song.title}`}
          onClick={() => setLiked((v) => !v)}
        >
          <Heart filled={liked} />
        </button>
      </span>

      <span className="trow__length" role="cell">
        {live ? formatTime(song.duration_sec) : 'Length'}
      </span>
    </div>
  );
}

export default function TrendingTable({ songs }) {
  const live = songs.length > 0;
  const rows = live ? songs.slice(0, 5) : PLACEHOLDERS;

  return (
    <div className="trending" role="table" aria-label="Trending today">
      <div className="trow trow--head" role="row">
        <span aria-hidden="true" />
        <span className="trow__col trow__col--title" role="columnheader">TITLE</span>
        {/* Header cells reuse the data cells' column classes, so a single
            display:none rule drops a header and its column together. */}
        <span className="trow__col trow__album" role="columnheader">ALBUM</span>
        <span className="trow__col trow__plays" role="columnheader">PLAYS</span>
        <span aria-hidden="true" />
        <span className="trow__col trow__length" role="columnheader">LENGTH</span>
      </div>

      {rows.map((song, i) => (
        <Row key={song.id} song={song} rank={i + 1} live={live} songs={rows} />
      ))}
    </div>
  );
}
