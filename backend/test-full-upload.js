const http = require('http');

const login = () => new Promise((resolve, reject) => {
  const loginData = JSON.stringify({ username: 'creator_admin', password: 'creator123' });
  const req = http.request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    },
    (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`login status ${res.statusCode}`));
        resolve(JSON.parse(data).token);
      });
    }
  );
  req.write(loginData);
  req.end();
});

const requestUploadUrl = (token) => new Promise((resolve, reject) => {
  const body = JSON.stringify({ filename: 'test-full.mp4', contentType: 'video/mp4' });
  const req = http.request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/media/upload-url',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Authorization: 'Bearer ' + token
      }
    },
    (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`upload-url status ${res.statusCode}: ${data}`));
        resolve(JSON.parse(data));
      });
    }
  );
  req.write(body);
  req.end();
});

const uploadFile = (uploadUrl) => new Promise((resolve, reject) => {
  const url = new URL(uploadUrl);
  const body = Buffer.from('hello world');
  const req = http.request(
    {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': body.length,
        'x-ms-blob-type': 'BlockBlob'
      }
    },
    (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    }
  );
  req.write(body);
  req.end();
});

const createMedia = (token, blobUrl) => new Promise((resolve, reject) => {
  const payload = JSON.stringify({
    title: 'test upload',
    caption: 'just a test',
    location: 'UK',
    tags: ['test'],
    taggedPeople: ['Rana'],
    mediaUrl: blobUrl,
    mediaType: 'video/mp4'
  });
  const req = http.request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/media',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Authorization: 'Bearer ' + token
      }
    },
    (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    }
  );
  req.write(payload);
  req.end();
});

(async () => {
  try {
    const token = await login();
    console.log('token', token.slice(0, 20));
    const { uploadUrl, blobUrl } = await requestUploadUrl(token);
    console.log('uploadUrl', uploadUrl);
    const uploadResult = await uploadFile(uploadUrl);
    console.log('upload result', uploadResult);
    const createResult = await createMedia(token, blobUrl);
    console.log('create media result', createResult);
  } catch (err) {
    console.error(err);
  }
})();
