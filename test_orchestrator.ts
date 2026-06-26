import "./src/env-init";
import { orchestrator } from "./src/ai/orchestrator/ai-orchestrator";

async function run() {
    console.log("--- AI ORCHESTRATOR CERTIFICATION ---");
    const providers = orchestrator.getRegistry().getPriorityList();
    console.log("Priority List:");
    providers.forEach((p, i) => console.log(`${i+1}. ${p.providerName}`));
}
run();
