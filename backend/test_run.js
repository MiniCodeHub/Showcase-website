const axios = require('axios');

async function testRun() {
    try {
        console.log('Testing /api/run...');
        const response = await axios.post('http://localhost:3001/api/run', {
            code: '#include <iostream>\nusing namespace std;\nint main() { int x; cin >> x; cout << "Input was: " << x << endl; return 0; }',
            language: 'cpp',
            input: '42'
        });
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
}

testRun();
