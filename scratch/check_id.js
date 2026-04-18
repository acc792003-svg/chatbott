async function checkPage(id, token) {
    try {
        const url = `https://graph.facebook.com/v12.0/${id}?access_token=${token}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log('ID info:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error checking ID:', e);
    }
}

const token = "EAATWWnKqNwoBREUHekfe2GlcO5imblowgxZBdwprxqNPQK7hTiODMCokRrVjSRSZAYWK9qJB1JJZC3FeZAvM5dQZAEgUn8yn2ZB5EDBmuLHTxSGwL37FJ7Fc3T1W1oorZBbryyEejebZBZBmNVMQJpyLVM2FDczwtVVRx0cPiacY4tOqFCRcvpe46Q4cbqBWIZAKYzWa6xJ1KDKHZBDCZBFNsm5gdja5qZBNRX05vr5a1BJCtjgYUjXUZD";
const id = "100063486101664";

checkPage(id, token);
