import axios from 'axios';

async function waitForServer() {
  const url = 'http://localhost:4000/health';
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    try {
      const res = await axios.get(url);
      if (res.status === 200) {
        console.log('✅ Server is UP');
        return;
      }
    } catch (e) {
      console.log(`Waiting for server... attempt ${attempts + 1}`);
      await new Promise(r => setTimeout(r, 2000));
      attempts++;
    }
  }
  throw new Error('Server failed to start');
}

waitForServer();
