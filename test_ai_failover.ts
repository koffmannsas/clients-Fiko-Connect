import { initializeApp, getApps } from 'firebase-admin/app';
import { AIOrchestrator } from "./src/ai/orchestrator/ai-orchestrator";

// Mock Firebase initialization for test
if (!getApps().length) {
    initializeApp({ projectId: "test-project" });
}

async function testAIFailover() {
    console.log("🚀 Starting AI Orchestrator Failover Certification...");

    const orchestrator = new AIOrchestrator();

    console.log("\n--- TEST 1: FAILOVER CHAIN VALIDATION ---");
    try {
        const response = await orchestrator.generateResponse("test_company", "test_lead", "hi", "Context");
        console.log("✅ Final Chain Response:", response);
    } catch (e: any) {
        console.error("❌ Test 1 Failed:", e.message);
    }

    console.log("\n--- TEST 2: PRIORITY LIST VERIFICATION ---");
    const priority = orchestrator.getRegistry().getPriorityList();
    console.log("✅ Priority List:", priority.map(p => p.providerName).join(" -> "));

    const expected = ["deepseek", "gemini", "openai", "fallback"];
    const actual = priority.map(p => p.providerName);

    const match = expected.every((v, i) => v === actual[i]);

    if (match) {
        console.log("✅ Industrial Priority Match: DeepSeek is Priority #1");
    } else {
        console.error("❌ Priority Mismatch detected!");
    }
}

testAIFailover();
