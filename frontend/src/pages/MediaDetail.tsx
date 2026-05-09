import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { fetchMediaById, postComment, postRating, updateMedia, deleteMedia } from '../services/api';

function MediaDetail({ auth }: { auth: { user: any; token: string; role: string } }) {
  const { id } = useParams();
  const [media, setMedia] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState(5);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');

  const loadMedia = async () => {
    if (!auth.token || !id) return;
    try {
      const response = await fetchMediaById(auth.token, id);
      setMedia(response);
      setEditTitle(response.media.title);
      setEditCaption(response.media.caption);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [auth.token, id]);

  const handleEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth.token || !id) return;
    try {
      await updateMedia(auth.token, id, { title: editTitle, caption: editCaption });
      setIsEditing(false);
      loadMedia();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!auth.token || !id || !confirm('Are you sure you want to delete this media?')) return;
    try {
      await deleteMedia(auth.token, id);
      window.location.href = '/'; // Redirect to home
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!id) return <div className="page animate-fade-in-up"><p className="animate-fade-in-down">Media not found.</p></div>;
  if (!media) return (
    <div className="page animate-fade-in-up">
      <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
      <p className="animate-fade-in-up">Loading...</p>
    </div>
  );

  const handleComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth.token) return;
    try {
      await postComment(auth.token, id, commentText);
      setCommentText('');
      loadMedia();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRate = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth.token) return;
    try {
      await postRating(auth.token, id, rating);
      loadMedia();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="page media-detail animate-fade-in-up">
      <div className="media-preview animate-scale-in">
        {media.media.mediaType.startsWith('video') ? (
          <video controls src={media.media.mediaUrl} className="animate-fade-in-up" />
        ) : (
          <img src={media.media.mediaUrl} alt={media.media.title} className="animate-fade-in-up" />
        )}
      </div>
      <div className="media-meta animate-fade-in-left">
        {isEditing ? (
          <form onSubmit={handleEdit} className="animate-scale-in">
            <label className="animate-fade-in-down">Title</label>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required className="animate-fade-in-up animate-stagger-1" />
            <label className="animate-fade-in-down">Caption</label>
            <textarea value={editCaption} onChange={(e) => setEditCaption(e.target.value)} required className="animate-fade-in-up animate-stagger-2"></textarea>
            <button type="submit" className="btn-bounce animate-fade-in-up animate-stagger-3">Save Changes</button>
            <button type="button" onClick={() => setIsEditing(false)} className="animate-fade-in-up animate-stagger-4">Cancel</button>
          </form>
        ) : (
          <>
            <h1 className="animate-fade-in-down">{media.media.title}</h1>
            <p className="animate-fade-in-up animate-stagger-1">{media.media.caption}</p>
            <p className="animate-fade-in-up animate-stagger-2"><strong>Location:</strong> {media.media.location || 'Not specified'}</p>
            <p className="animate-fade-in-up animate-stagger-3"><strong>Tagged People:</strong> {media.media.taggedPeople.join(', ') || 'None'}</p>
            <p className="animate-fade-in-up animate-stagger-4"><strong>Rating:</strong> {media.averageRating.toFixed(1)} / 5 ({media.ratingCount} ratings)</p>
            <p className="animate-fade-in-up animate-stagger-5">
              <a href="#comments" className="link-button hover-lift">Jump to comments</a>
            </p>
            {auth.role === 'creator' && auth.user && media.media.uploaderId === auth.user._id && (
              <div className="media-actions animate-fade-in-up animate-stagger-6">
                <button onClick={() => setIsEditing(true)} className="btn-bounce">Edit</button>
                <button onClick={handleDelete} className="delete-btn hover-lift">Delete</button>
              </div>
            )}
          </>
        )}
      </div>

      {auth.user && auth.role === 'consumer' ? (
        <div className="interaction-panel animate-fade-in-right">
          <form onSubmit={handleComment} className="animate-scale-in">
            <label className="animate-fade-in-down">Add a comment</label>
            <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} required placeholder="Share your thoughts..." className="animate-fade-in-up animate-stagger-1"></textarea>
            <button type="submit" className="btn-bounce animate-fade-in-up animate-stagger-2">Post Comment</button>
          </form>

          <form onSubmit={handleRate} className="animate-scale-in">
            <label className="animate-fade-in-down">Rate this content
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="animate-fade-in-up animate-stagger-1">
                <option value={1}>1 star</option>
                <option value={2}>2 stars</option>
                <option value={3}>3 stars</option>
                <option value={4}>4 stars</option>
                <option value={5}>5 stars</option>
              </select>
            </label>
            <button type="submit" className="btn-bounce animate-fade-in-up animate-stagger-2">Submit Rating</button>
          </form>
        </div>
      ) : null}

      <section id="comments" className="comments animate-fade-in-up">
        <h2 className="animate-fade-in-down">Comments</h2>
        {media.comments.length ? media.comments.map((comment: any, index: number) => (
          <div key={comment._id} className={`comment-card card-hover animate-fade-in-up animate-stagger-${Math.min(index % 5 + 1, 5)}`}>
            <p>{comment.text}</p>
            <small>Posted {new Date(comment.createdAt).toLocaleDateString()} at {new Date(comment.createdAt).toLocaleTimeString()}</small>
          </div>
        )) : <p className="animate-fade-in-up">No comments yet. Be the first to comment!</p>}
      </section>

      {error && <p className="error animate-fade-in-up">{error}</p>}
    </div>
  );
}

export default MediaDetail;
