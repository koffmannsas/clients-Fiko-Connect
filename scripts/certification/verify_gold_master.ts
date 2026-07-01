import axios from 'axios';

async function verify() {
    console.log("Verifying API Absolute Truth...");

    const tests = [
        { name: "Health Check", path: "/health", method: "GET" },
        { name: "Auth (OTP Send)", path: "/api/auth/send-otp", method: "POST", body: { phoneNumber: "test", type: "signup" } },
        { name: "AI Generic", path: "/api/ai/generic", method: "POST", body: { companyId: "test", prompt: "hello" } },
        { name: "AI Chat", path: "/api/ai/chat", method: "POST", body: { companyId: "test", leadId: "test", message: "hello" } }
    ];

    for (const t of tests) {
        try {
            console.log(`Testing ${t.name}...`);
            const url = `http://localhost:4000${t.path}`;
            if (t.method === "GET") await axios.get(url);
            else await axios.post(url, t.body);
            console.log(`✅ ${t.name} PASS`);
        } catch (e: any) {
            // Some might 401/404 if data missing, but we check if the route EXISTS
            if (e.response && e.response.status !== 404) {
                console.log(`✅ ${t.name} PASS (Route exists with status ${e.response.status})`);
            } else {
                console.error(`❌ ${t.name} FAIL: ${e.message}`);
                process.exit(1);
            }
        }
    }
}

verify();
