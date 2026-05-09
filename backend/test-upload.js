const http = require('http');

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data: data, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  try {
    console.log('1. Testing login...');
    const loginRes = await makeRequest('POST', '/auth/login', {}, {
      username: 'creator_admin',
      password: 'creator123'
    });
    
    if (loginRes.status !== 200) {
      console.error(`Login failed: ${loginRes.status}`);
      console.error(loginRes.data);
      return;
    }
    
    const loginData = JSON.parse(loginRes.data);
    const token = loginData.token;
    console.log(`✓ Login successful, token: ${token.substring(0, 20)}...`);
    
    console.log('\n2. Testing upload-url endpoint...');
    const uploadRes = await makeRequest('POST', '/media/upload-url', 
      { 'Authorization': `Bearer ${token}` },
      { filename: 'test-file.jpg', contentType: 'image/jpeg' }
    );
    
    console.log(`Status: ${uploadRes.status}`);
    console.log('Response:', uploadRes.data);
    
    if (uploadRes.status !== 200) {
      console.error('Upload URL endpoint failed');
    } else {
      console.log('✓ Upload URL endpoint working');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
