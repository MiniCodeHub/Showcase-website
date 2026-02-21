const https = require('https');

https.get('https://showcase-website-gilt.vercel.app/', (res) => {
    let html = '';
    res.on('data', chunk => html += chunk);
    res.on('end', () => {
        const match = html.match(/src="(\/static\/js\/main\.[a-z0-9]+\.js)"/);
        if (!match) {
            console.log("NO_MAIN_JS found in HTML.");
            return;
        }

        const jsUrl = 'https://showcase-website-gilt.vercel.app' + match[1];
        console.log("Fetching JS Bundle: " + jsUrl);

        https.get(jsUrl, (jsRes) => {
            let js = '';
            jsRes.on('data', chunk => js += chunk);
            jsRes.on('end', () => {
                const hasRenderUrl = js.includes('showcase-website-opee.onrender.com');
                const hasLocalhostUrl = js.includes('http://localhost:3001');

                console.log({
                    hasRenderUrl,
                    hasLocalhostUrl
                });
            });
        });
    });
});
