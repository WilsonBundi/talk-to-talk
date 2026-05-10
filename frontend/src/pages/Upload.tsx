import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createUploadUrl, createMedia } from '../services/api';

const compressImage = async (file: File) => {
  if (!file.type.startsWith('image/')) return file;
  const imageBitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const maxWidth = 1200;
  const scale = Math.min(1, maxWidth / imageBitmap.width);
  canvas.width = imageBitmap.width * scale;
  canvas.height = imageBitmap.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.75));
  return blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file;
};

function Upload({ auth }: { auth: { user: any; token: string; role: string } }) {
  const [metadata, setMetadata] = useState({ title: '', caption: '', location: '', tags: '', taggedPeople: '' });
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const statusType = status.includes('failed') ? 'error' : status.includes('successfully') ? 'success' : 'info';
  const statusIcon = statusType === 'success' ? '✓' : statusType === 'error' ? '⚠' : 'ℹ';

  const previewUrl = useMemo(() => {
    return file ? URL.createObjectURL(file) : null;
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const togglePreviewPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  if (!auth.user) {
    return <div className="page animate-fade-in-up"><h1 className="animate-fade-in-down">Upload</h1><p className="animate-fade-in-up">Please sign in to upload content.</p></div>;
  }

  if (auth.role !== 'creator') {
    return (
      <div className="page upload-page animate-fade-in-up">
        <div className="upload-hero animate-scale-in">
          <div className="hero-content animate-fade-in-left">
            <div className="hero-icon"></div>
            <h1 className="animate-fade-in-up animate-stagger-1">Creator Access Required</h1>
            <p className="animate-fade-in-up animate-stagger-2">Only verified creators can share content on Talk We Talk. Join our community of visual storytellers!</p>
          </div>
        </div>

        <div className="creator-restricted animate-fade-in-up">
          <div className="restricted-content animate-scale-in">
            <div className="restricted-icon"></div>
            <h2 className="animate-fade-in-down">Become a Creator</h2>
            <p className="animate-fade-in-up animate-stagger-1">Ready to share your creative work with the world? Request creator status to unlock the ability to upload and share your photos and videos.</p>

            <div className="benefits-list animate-fade-in-up animate-stagger-2">
              <div className="benefit animate-fade-in-left animate-stagger-1">
                <span className="benefit-icon"></span>
                <span>Upload unlimited photos & videos</span>
              </div>
              <div className="benefit animate-fade-in-left animate-stagger-2">
                <span className="benefit-icon"></span>
                <span>Reach a global creative community</span>
              </div>
              <div className="benefit animate-fade-in-right animate-stagger-3">
                <span className="benefit-icon"></span>
                <span>Connect with fellow artists</span>
              </div>
              <div className="benefit animate-fade-in-right animate-stagger-4">
                <span className="benefit-icon"></span>
                <span>Get feedback and appreciation</span>
              </div>
            </div>

            <a href="/profile" className="creator-button btn-bounce animate-fade-in-up animate-stagger-5">
              Request Creator Status
            </a>

            <p className="hint animate-fade-in-up animate-stagger-6">
              We'll review your request within 24 hours. Make sure your profile showcases your creative work!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('Preparing upload...');

    try {
      // For testing without file, use a mock file
      const testFile = file || new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      setStatus('Requesting upload URL...');
      const { uploadUrl, blobUrl } = await createUploadUrl(auth.token, {
        filename: testFile.name,
        contentType: testFile.type
      });

      setStatus('Uploading file...');
      const formData = new FormData();
      formData.append('file', testFile);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${auth.token}` },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      const mediaUrl = uploadResult.url;

      setStatus('Saving media details...');
      const processedTags = metadata.tags.split(',').map((item) => item.trim()).filter(Boolean);
      const processedTaggedPeople = metadata.taggedPeople.split(',').map((item) => item.trim()).filter(Boolean);

      if (processedTags.length === 0) {
        setStatus('Please provide at least one tag.');
        return;
      }

      if (processedTaggedPeople.length === 0) {
        setStatus('Please provide at least one tagged person.');
        return;
      }

      await createMedia(auth.token, {
        title: metadata.title,
        caption: metadata.caption,
        location: metadata.location,
        tags: processedTags,
        taggedPeople: processedTaggedPeople,
        mediaUrl: mediaUrl,
        mediaType: testFile.type
      });

      setStatus('Upload completed successfully! Your media is now live.');
      setMetadata({ title: '', caption: '', location: '', tags: '', taggedPeople: '' });
      setFile(null);
    } catch (error: any) {
      setStatus('Upload failed: ' + (error.message || 'Please try again'));
    }
  };

  return (
    <div className="page upload-page animate-fade-in-up">
      <div className="upload-hero animate-scale-in">
        <div className="hero-content animate-fade-in-left">
          <h1 className="animate-fade-in-up animate-stagger-1">Upload Media</h1>
          <p className="animate-fade-in-up animate-stagger-2">Share your photos and videos with the community. Add details to help others discover and engage with your content.</p>
        </div>
      </div>

      <div className="upload-container animate-fade-in-up">
        <form onSubmit={handleSubmit} className="upload-form animate-scale-in">
          <div className="form-section animate-fade-in-left">
            <h2 className="animate-fade-in-down">Upload Media</h2>
            <div className="file-upload-area hover-lift">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                id="file-input"
                className="file-input"
              />
              <label htmlFor="file-input" className="file-upload-label animate-fade-in-up">
                <div className="upload-text animate-fade-in-up animate-stagger-1">
                  No file chosen
                </div>
                <div className="upload-hint animate-fade-in-up animate-stagger-2">
                  Choose a photo or video file to upload.
                </div>
              </label>
              {file && (
                <div className="file-preview animate-fade-in-up">
                  <div className="file-preview-header">
                    <div>
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                    </div>
                    <span className="preview-label">Preview</span>
                  </div>

                  {previewUrl && file.type.startsWith('image/') && (
                    <img src={previewUrl} alt="Selected preview" className="preview-media" />
                  )}

                  {previewUrl && file.type.startsWith('video/') && (
                    <video
                      ref={videoRef}
                      src={previewUrl}
                      controls
                      playsInline
                      className="preview-media"
                      onClick={(event) => {
                        event.preventDefault();
                        togglePreviewPlayback();
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="form-section animate-fade-in-right">
            <div className="section-header">
              <h2 className="animate-fade-in-down">Share Content</h2>
              <p className="section-note animate-fade-in-up animate-stagger-1">
                Add a strong title, helpful caption, and clear tags so your upload reaches the right audience.
              </p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="title" className="animate-fade-in-left">Title</label>
                <input
                  id="title"
                  type="text"
                  value={metadata.title}
                  onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                  placeholder="Add a catchy title for your upload"
                  required
                  className="animate-fade-in-up animate-stagger-1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="caption" className="animate-fade-in-left">Caption</label>
                <textarea
                  id="caption"
                  value={metadata.caption}
                  onChange={(e) => setMetadata({ ...metadata, caption: e.target.value })}
                  placeholder="Write a short description or story behind this content"
                  required
                  className="animate-fade-in-up animate-stagger-2"
                />
              </div>

              <div className="form-group">
                <label htmlFor="location" className="animate-fade-in-left">Location</label>
                <input
                  id="location"
                  type="text"
                  value={metadata.location}
                  onChange={(e) => setMetadata({ ...metadata, location: e.target.value })}
                  placeholder="e.g. London, UK"
                  required
                  className="animate-fade-in-up animate-stagger-3"
                />
              </div>

              <div className="form-group">
                <label htmlFor="tags" className="animate-fade-in-left">
                  Tags
                  <span className="field-hint">Add keywords to improve discoverability</span>
                </label>
                <input
                  id="tags"
                  type="text"
                  value={metadata.tags}
                  onChange={(e) => setMetadata({ ...metadata, tags: e.target.value })}
                  placeholder="e.g. travel, lifestyle, tutorial"
                  required
                  className="animate-fade-in-up animate-stagger-4"
                />
              </div>

              <div className="form-group">
                <label htmlFor="taggedPeople" className="animate-fade-in-left">
                  Tagged people
                  <span className="field-hint">Separate names with commas for better attribution</span>
                </label>
                <input
                  id="taggedPeople"
                  type="text"
                  value={metadata.taggedPeople}
                  onChange={(e) => setMetadata({ ...metadata, taggedPeople: e.target.value })}
                  placeholder="e.g. Rana, Alex, Maya"
                  required
                  className="animate-fade-in-up animate-stagger-5"
                />
              </div>
            </div>
          </div>

          <div className="form-actions animate-fade-in-up">
            <button type="submit" className="upload-button btn-bounce" disabled={false}>
              Upload
            </button>
          </div>
        </form>

        {status && (
          <div className={`status-card animate-scale-in ${statusType}`}>
            <div className="status-icon">{statusIcon}</div>
            <div className="status-text animate-fade-in-up">{status}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Upload;
