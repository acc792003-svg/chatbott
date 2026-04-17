/**
 * 📘 FACEBOOK API HELPERS
 */

export async function sendFacebookMessage(sender_id: string, page_access_token: string, text: string) {
  try {
    const response = await fetch(`https://graph.facebook.com/v12.0/me/messages?access_token=${page_access_token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: sender_id },
        message: { text },
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error('❌ Facebook Send API Error:', data.error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('❌ Network error sending FB message:', e);
    return false;
  }
}
