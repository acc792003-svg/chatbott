import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { processChat } from '../src/lib/chatbot-engine';

async function debugProcessChat() {
    console.log("🚀 Testing processChat for 70WPN...");
    try {
        const result = await processChat({
            shopId: 'b6d7c606-ab54-4937-adf3-02d274287dc1', // 70WPN
            message: 'Cách nấu yến như thế nào',
            history: [],
            externalUserId: 'test-user-123',
            platform: 'facebook',
            isPro: true
        });

        console.log("\n✅ RESULT:");
        console.log(result);
    } catch (e) {
        console.error("❌ ERROR:", e);
    }
}

debugProcessChat();
