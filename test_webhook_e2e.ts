import axios from "axios";
import crypto from "crypto";

async function testWebhookE2E() {
    console.log("🚀 Starting WhatsApp E2E Simulation with Signature Verification...");
    const WEBHOOK_URL = "http://localhost:4000/api/webhooks/meta";
    const APP_SECRET = "test_secret"; // Matches .env

    const payload = JSON.stringify({
        object: "whatsapp_business_account",
        entry: [{
            id: "12345",
            changes: [{
                value: {
                    messaging_product: "whatsapp",
                    metadata: { display_phone_number: "123456789", phone_number_id: "98765" },
                    contacts: [{ profile: { name: "Test User" }, wa_id: "22500000000" }],
                    messages: [{
                        from: "22500000000",
                        id: "wamid.test_unique_id_" + Date.now(),
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        text: { body: "Hello Fiko, I need help!" },
                        type: "text"
                    }]
                },
                field: "messages"
            }]
        }]
    });

    const hmac = crypto.createHmac("sha256", APP_SECRET);
    const signature = "sha256=" + hmac.update(payload).digest("hex");

    try {
        const response = await axios.post(WEBHOOK_URL, payload, {
            headers: {
                "X-Hub-Signature-256": signature,
                "Content-Type": "application/json"
            }
        });
        console.log("✅ Webhook Response Status:", response.status);
        console.log("✅ Webhook Response Data:", response.data);
    } catch (error: any) {
        console.error("❌ Webhook Simulation Failed:", error.response?.data || error.message);
    }
}

testWebhookE2E();
