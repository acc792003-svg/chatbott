import { processChat } from './src/lib/chatbot-engine';

async function test() {
  console.log("Starting test...");
  try {
    const res = await processChat({
      shopId: 'c120a1eb-2aeb-485d-8d48-6a3c9b7ff9c2', // assuming this is a string
      message: 'Hello, giá bao nhiêu?',
      externalUserId: 'test-user-123',
      platform: 'widget',
      history: []
    });
    console.log("Response:", res);
  } catch (e) {
    console.error("Test failed:", e);
  }
}

test();
