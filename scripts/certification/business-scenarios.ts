import { AIService } from "../src/server/services/ai.service";
import { FirestoreRepo } from "../src/server/repositories/firestore.repo";

async function runBusinessScenarios() {
    console.log("💼 Executing Business Scenarios...");
    const companyId = "test_scenario_biz";
    const leadId = "lead_prospect_001";

    const scenarios = [
        { name: "Qualification", msg: "Bonjour, je suis intéressé par vos services." },
        { name: "Objection", msg: "C'est un peu cher par rapport à la concurrence." },
        { name: "Quote Request", msg: "Pouvez-vous m'envoyer un devis ?" },
        { name: "Conversion", msg: "C'est parfait, je veux commencer." }
    ];

    for (const scene of scenarios) {
        console.log(`\n--- Scenario: ${scene.name} ---`);
        console.log(`User: ${scene.msg}`);
        const response = await AIService.generateResponse(companyId, leadId, scene.msg);
        console.log(`AI: ${response}`);
        await FirestoreRepo.syncLead(companyId, leadId, scene.msg);
    }

    console.log("\n✅ ALL SCENARIOS COMPLETED");
}

runBusinessScenarios().catch(console.error);
