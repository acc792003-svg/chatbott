async function validateToken(token) {
    try {
        const url = `https://graph.facebook.com/v12.0/me?access_token=${token}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log('Token debug info:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error validating token:', e);
    }
}

const token = "EAATWWnKqNwoBREUHekfe2GlcO5imblowgxZBdwprxqNPQK7hTiODMCokRrVjSRSZAYWK9qJB1JJZC3FeZAvM5dQZAEgUn8yn2ZB5EDBmuLHTxSGwL37FJ7Fc3T1W1oorZBbryyEejebZBZBmNVMQJpyLPM2FDczwtVVRx0cPiacY4tOqFCRcvpe46Q4cbqBWIZAKYzWa6xJ1KDKHZBDCZBFNsm5gdja5qZBNRX05vr5a1BJCtjgYUjXUZD";

validateToken(token);
