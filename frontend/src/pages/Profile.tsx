import { useState, useEffect } from 'react';
import { requestCreatorStatus, cancelCreatorRequest, getCreatorRequestStatus, getCreatorRequests, approveCreatorRequest } from '../services/api';

function Profile({ auth }: { auth: { user: any; token: string; role: string } }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'creator'>('none');

  useEffect(() => {
    if (auth.role === 'creator' && auth.token) {
      loadRequests();
    }
    if (auth.role === 'consumer' && auth.token) {
      checkPendingRequest();
    }
  }, [auth.role, auth.token]);

  const checkPendingRequest = async () => {
    try {
      const result = await getCreatorRequestStatus(auth.token);
      setRequestStatus(result.status);
      setHasPendingRequest(result.status === 'pending');
      if (result.status === 'pending') {
        setMessage('You have a pending creator request. The creator will review it soon.');
      }
    } catch (error: any) {
      console.error('Failed to check creator request status:', error);
    }
  };

  const loadRequests = async () => {
    setRequestsLoading(true);
    try {
      const result = await getCreatorRequests(auth.token);
      console.log('Creator requests result:', result);
      setRequests(result.requests);
    } catch (error: any) {
      console.error('Failed to load requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleApprove = async (userId: string, action: 'approve' | 'reject') => {
    try {
      await approveCreatorRequest(auth.token, userId, action);
      setRequests(requests.filter(r => r.userId !== userId));
    } catch (error: any) {
      alert('Failed to ' + action + ' request: ' + error.message);
    }
  };

  if (!auth.user) {
    return <div className="page animate-fade-in-up"><h1 className="animate-fade-in-down">Profile</h1><p className="animate-fade-in-up">Please sign in to view your profile.</p></div>;
  }

  const handleRequestCreator = async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await requestCreatorStatus(auth.token);
      if (result.status === 'success') {
        setMessage('Creator request submitted successfully. An admin will review your request within 24 hours.');
        setHasPendingRequest(true);
      } else if (result.status === 'already_requested') {
        setMessage('You already have a pending creator request. We\'ll review it soon.');
        setHasPendingRequest(true);
      } else if (result.status === 'already_creator') {
        setMessage('You are already a creator.');
      } else {
        setMessage('Request submitted successfully.');
      }
    } catch (error: any) {
      setMessage('Request failed: ' + (error.message || 'Please try again later'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await cancelCreatorRequest(auth.token);
      setMessage('Creator request cancelled successfully.');
      setHasPendingRequest(false);
    } catch (error: any) {
      setMessage('Error cancelling request: ' + (error.message || 'Please try again later'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page profile-page animate-fade-in-up">
      <div className="profile-card animate-scale-in">
        <div className="profile-header animate-fade-in-down">
          <h1 className="animate-fade-in-up animate-stagger-1">{auth.user.displayName}</h1>
          <p className="username animate-fade-in-up animate-stagger-2">@{auth.user.username}</p>
        </div>

        <div className="profile-grid">
          <div className="role-section animate-fade-in-left">
            <h2 className="animate-fade-in-down">Your Account Type</h2>
            <div className="role-display animate-scale-in">
              {auth.role === 'creator' ? (
                <div className="role-badge creator animate-fade-in-up">
                  <span className="icon"></span>
                  <div>
                    <p className="role-name animate-fade-in-left">Creator</p>
                    <p className="role-desc animate-fade-in-right">You can upload and share content with the community</p>
                  </div>
                </div>
              ) : (
                <div className="role-badge consumer animate-fade-in-up">
                  <span className="icon"></span>
                  <div>
                    <p className="role-name animate-fade-in-left">Consumer</p>
                    <p className="role-desc animate-fade-in-right">You can view and interact with content shared by creators</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="profile-info animate-fade-in-up">
            <h2 className="animate-fade-in-down">Your Profile</h2>
            <div className="info-group animate-fade-in-left animate-stagger-1">
              <label className="animate-fade-in-down">Email</label>
              <p className="animate-fade-in-up">{auth.user.email}</p>
            </div>
            <div className="info-group animate-fade-in-left animate-stagger-2">
              <label className="animate-fade-in-down">Member Since</label>
              <p className="animate-fade-in-up">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {auth.role === 'consumer' && (
          <div className="consumer-highlights animate-fade-in-up">
            <h2 className="animate-fade-in-down">Consumer Features</h2>
            <div className="highlight-grid">
              <div className="highlight-card animate-fade-in-up animate-stagger-1">
                <strong>Discover Content</strong>
                <p>Browse the latest posts from creators and discover new inspiration.</p>
                <a href="/" className="link-button hover-lift">Browse Content</a>
              </div>
              <div className="highlight-card animate-fade-in-up animate-stagger-2">
                <strong>Interact with Content</strong>
                <p>Like, comment, and share the moments that matter most.</p>
              </div>
              <div className="highlight-card animate-fade-in-up animate-stagger-3">
                <strong>Save Favorites</strong>
                <p>Keep track of the content you love and revisit it anytime.</p>
              </div>
            </div>
          </div>
        )}

        {auth.role === 'creator' && (
          <div className="creator-management animate-fade-in-up">
            <h2 className="animate-fade-in-down">Creator Management</h2>
            <div className="creator-actions animate-fade-in-up animate-stagger-1">
              <a href="/upload" className="link-button hover-lift">Upload Content</a>
              <a href="/" className="link-button hover-lift">View Your Content</a>
            </div>
            <h3 className="animate-fade-in-down">Creator Requests</h3>
            <button onClick={loadRequests} className="btn-bounce refresh-btn animate-fade-in-up">Refresh Requests</button>
            {requestsLoading ? (
              <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
            ) : requests.length === 0 ? (
              <p className="animate-fade-in-up">No pending creator requests.</p>
            ) : (
              <div className="requests-list">
                {requests.map((req: any) => (
                  <div key={req.userId} className="request-card card-hover animate-fade-in-up">
                    <div className="request-info">
                      <h3>{req.username}</h3>
                      <p>Requested on {new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="request-actions">
                      <button onClick={() => handleApprove(req.userId, 'approve')} className="btn-bounce approve-btn">Approve</button>
                      <button onClick={() => handleApprove(req.userId, 'reject')} className="btn-bounce reject-btn">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {auth.role === 'consumer' && (
          <div className="creator-section animate-fade-in-right">
            <h2 className="animate-fade-in-down">Become a Creator</h2>
            <p className="animate-fade-in-up animate-stagger-1">Upgrade your account to upload and share your own content with the community.</p>
            {hasPendingRequest ? (
              <button
                onClick={handleCancelRequest}
                disabled={loading}
                className="creator-button btn-bounce animate-fade-in-up animate-stagger-2 cancel-btn"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner" style={{ width: '16px', height: '16px', display: 'inline-block', marginRight: '8px' }}></div>
                    Cancelling...
                  </>
                ) : 'Cancel Request'}
              </button>
            ) : (
              <button
                onClick={handleRequestCreator}
                disabled={loading || requestStatus === 'pending'}
                className="creator-button btn-bounce animate-fade-in-up animate-stagger-2"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner" style={{ width: '16px', height: '16px', display: 'inline-block', marginRight: '8px' }}></div>
                    Submitting request...
                  </>
                ) : requestStatus === 'pending' ? 'Request Pending' : 'Request Creator Status'}
              </button>
            )}
            {message && (
              <div className={`message animate-scale-in ${message.includes('Error') || message.includes('failed') ? 'error' : 'success'}`}>
                <div className="animate-fade-in-up">{message}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
