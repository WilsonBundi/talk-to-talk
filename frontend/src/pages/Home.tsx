import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { fetchMedia } from '../services/api';

function Home({ auth }: { auth: { user: any; token: string; role: string } }) {
  const [query, setQuery] = useState('');
  const [media, setMedia] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadMedia = async () => {
    if (!auth.token) return;
    setLoading(true);
    try {
      const response = await fetchMedia(auth.token, query || undefined);
      setMedia(response.data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [auth.token]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    await loadMedia();
  };

  if (!auth.user) {
    return (
      <div className="page animate-fade-in-up">
        <section className="hero animate-scale-in">
          <div className="animate-fade-in-left">
            <p className="eyebrow animate-fade-in-down">Share Your Visual Stories</p>
            <h1 className="animate-fade-in-up animate-stagger-1">Talk We Talk</h1>
            <p className="hero-copy animate-fade-in-up animate-stagger-2">Connect with a community of creators and viewers through shared visual experiences. Upload your photos, discover inspiring content, and engage with others who share your passion for visual storytelling.</p>
            <Link to="/auth" className="primary-button btn-bounce animate-fade-in-up animate-stagger-3">Get Started</Link>
          </div>
          <div className="hero-preview animate-fade-in-right">
            <div className="preview-chip animate-fade-in-up animate-stagger-1">Share Photos</div>
            <div className="preview-chip animate-fade-in-up animate-stagger-2">Connect & Discuss</div>
            <div className="preview-chip animate-fade-in-up animate-stagger-3">Rate & Review</div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page animate-fade-in-up">
      <div className="toolbar animate-fade-in-down">
        <div>
          <p className="eyebrow animate-fade-in-left">Latest Content</p>
          <h1 className="animate-fade-in-right">Browse Media</h1>
        </div>
        <form onSubmit={handleSearch} className="search-form animate-scale-in">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, location, or tags..." className="animate-fade-in-up" />
          <button type="submit" className="btn-bounce animate-fade-in-up animate-stagger-1">Search</button>
        </form>
      </div>

      {loading && <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>}
      {error && <p className="error animate-fade-in-up">{error}</p>}

      <div className="grid">
        {media.map((item, index) => (
          <Link to={`/media/${item._id}`} key={item._id} className={`card card-hover animate-fade-in-up animate-stagger-${Math.min(index % 5 + 1, 5)}`}>
            {item.mediaType.startsWith('video') ? (
              <video src={item.mediaUrl} muted playsInline preload="metadata" />
            ) : (
              <img src={item.mediaUrl} alt={item.title} />
            )}
            <div className="card-body">
              <h2>{item.title}</h2>
              <p>{item.caption}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Home;
