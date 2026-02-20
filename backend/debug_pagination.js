const axios = require('axios');

async function check() {
    try {
        const p1 = await axios.get('http://localhost:3001/api/videos?page=1&limit=5');
        const p2 = await axios.get('http://localhost:3001/api/videos?page=2&limit=5');

        console.log('Page 1 first video:', p1.data.videos[0].title);
        console.log('Page 2 first video:', p2.data.videos[0].title);

        if (p1.data.videos[0].videoId === p2.data.videos[0].videoId) {
            console.log('FAIL: Videos are identical');
        } else {
            console.log('PASS: Videos are different');
        }
    } catch (e) {
        console.error(e);
    }
}
check();
