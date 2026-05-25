const axios = require('axios');

async function runTests() {
    console.log('🚀 Starting Python Runner API Verification...');

    // Test 1: Successful default Python execution
    try {
        console.log('\n--- Test 1: Running default Python code ---');
        const res = await axios.post('http://localhost:3002/api/run', {
            code: 'print("Hello from default Python!")',
            language: 'python',
            version: 'default'
        });
        console.log('Output received:');
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Test 1 failed:', e.message);
    }

    // Test 2: Successful execution with a specific version (3.12 - which is installed)
    try {
        console.log('\n--- Test 2: Running with Python 3.12 (installed) ---');
        const res = await axios.post('http://localhost:3002/api/run', {
            code: 'import sys; print(f"Python Version: {sys.version}")',
            language: 'python',
            version: '3.12'
        });
        console.log('Output received:');
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Test 2 failed:', e.message);
    }

    // Test 3: Fallback execution with an uninstalled version (3.11 - not installed)
    try {
        console.log('\n--- Test 3: Running with Python 3.11 (uninstalled - fallback path) ---');
        const res = await axios.post('http://localhost:3002/api/run', {
            code: 'print("Fallback works!")',
            language: 'python',
            version: '3.11'
        });
        console.log('Output received:');
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Test 3 failed:', e.message);
    }
}

// Small delay to ensure server has booted
setTimeout(runTests, 1500);
