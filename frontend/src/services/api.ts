export interface ApiOptions {
  token?: string;
}

const baseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : 'https://talkwetalk.azurewebsites.net');

const request = async (path: string, options: RequestInit = {}, token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || response.statusText);
  }
  return response.json();
};

export const loginUser = async (username: string, password: string) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
export const registerUser = async (payload: { username: string; password: string; email: string; displayName: string; role: string }) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
export const fetchMedia = async (token: string, query?: string) =>
  request(query ? `/search?q=${encodeURIComponent(query)}` : '/media', { method: 'GET' }, token);
export const fetchMediaById = async (token: string, id: string) => request(`/media/${id}`, { method: 'GET' }, token);
export const createUploadUrl = async (token: string, payload: { filename: string; contentType: string }) =>
  request('/media/upload-url', { method: 'POST', body: JSON.stringify(payload) }, token);
export const createMedia = async (token: string, payload: any) =>
  request('/media', { method: 'POST', body: JSON.stringify(payload) }, token);
export const postComment = async (token: string, mediaId: string, text: string) =>
  request(`/media/${mediaId}/comment`, { method: 'POST', body: JSON.stringify({ text }) }, token);
export const postRating = async (token: string, mediaId: string, score: number) =>
  request(`/media/${mediaId}/rate`, { method: 'POST', body: JSON.stringify({ score }) }, token);
export const updateMedia = async (token: string, mediaId: string, updates: { title?: string; caption?: string }) =>
  request(`/media/${mediaId}`, { method: 'PUT', body: JSON.stringify(updates) }, token);
export const deleteMedia = async (token: string, mediaId: string) =>
  request(`/media/${mediaId}`, { method: 'DELETE' }, token);
export const requestCreatorStatus = async (token: string) =>
  request('/auth/request-creator', { method: 'POST', body: JSON.stringify({}) }, token);
export const cancelCreatorRequest = async (token: string) =>
  request('/auth/cancel-creator-request', { method: 'POST', body: JSON.stringify({}) }, token);
export const getCreatorRequestStatus = async (token: string) =>
  request('/auth/request-status', { method: 'GET' }, token);
export const getCreatorRequests = async (token: string) =>
  request('/auth/creator-requests', { method: 'GET' }, token);
export const approveCreatorRequest = async (token: string, userId: string, action: 'approve' | 'reject') =>
  request(`/auth/approve-creator/${userId}`, { method: 'POST', body: JSON.stringify({ action }) }, token);
