export class DNAService {
  static async getStats(companyId: string) {
    const res = await fetch(`/api/dna/stats/${companyId}`);
    return await res.json();
  }

  static async getKnowledgeScore(companyId: string) {
    const res = await fetch(`/api/knowledge/score/${companyId}`);
    return await res.json();
  }

  static async getAutopilotStatus(companyId: string) {
    const res = await fetch(`/api/autopilot/status/${companyId}`);
    return await res.json();
  }

  static async trainDNA(companyId: string, message: string) {
    const res = await fetch('/api/dna/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, message })
    });
    return await res.json();
  }
}
