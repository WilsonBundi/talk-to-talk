const http = require('http');

const loginData = JSON.stringify({ username: 'creator_admin', password: 'creator123' });
const loginReq = http.request(
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
      console.log('login status', res.statusCode);
      console.log('login body', data);
      if (res.statusCode !== 200) return;
      const token = JSON.parse(data).token;
      const body = JSON.stringify({ filename: 'test.mp4', contentType: 'video/mp4' });
      const uploadReq = http.request(
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
        (res2) => {
          let body = '';
          res2.on('data', (chunk) => body += chunk);
          res2.on('end', () => {
            console.log('upload-url status', res2.statusCode);
            console.log('upload-url body', body);
          });
        }
      );
      uploadReq.write(body);
      uploadReq.end();
    });
  }
);
loginReq.write(loginData);
loginReq.end();
