// Government API client
export class GovClient {
  private baseUrl: string;
  private apiKey: string;
  
  constructor() {
    this.baseUrl = process.env.GOV_API_URL || 'http://localhost:3000/api/mock-gov';
    this.apiKey = process.env.GOV_API_KEY || '';
  }
  
  // Submit invoice to government API
  async submitInvoice(invoiceId: string, invoiceData: any): Promise<{ status: number; data?: any; error?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${this.baseUrl}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Idempotency-Key': invoiceId, // Same key on every retry for idempotency
        },
        body: JSON.stringify(invoiceData),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      const data = await response.json().catch(() => ({}));
      
      return {
        status: response.status,
        data,
      };
    } catch (error: any) {
      clearTimeout(timeout);
      
      if (error.name === 'AbortError') {
        return { status: 0, error: 'Timeout' };
      }
      
      return { status: 0, error: error.message || 'Network error' };
    }
  }
}

export const govClient = new GovClient();
