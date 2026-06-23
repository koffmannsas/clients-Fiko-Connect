export class MonitoringService {
  static logAIInteraction(companyId: string, leadId: string, provider: string, tokens: number) {
    console.log(JSON.stringify({
        type: 'AI_TRACE',
        companyId,
        leadId,
        provider,
        tokens,
        timestamp: new Date().toISOString()
    }));
  }

  static logDNAExtraction(companyId: string, category: string) {
    console.log(JSON.stringify({
        type: 'DNA_EXTRACTION',
        companyId,
        category,
        timestamp: new Date().toISOString()
    }));
  }

  static logError(context: string, error: any) {
    console.error(JSON.stringify({
        type: 'ERROR',
        context,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
    }));
  }
}
