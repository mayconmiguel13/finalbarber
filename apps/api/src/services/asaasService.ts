import QRCode from 'qrcode';
import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../db.js';
import { calculateSplit } from './splitCalculator.js';
import { makePix } from './aiAgent.js';

export interface AsaasConfig {
  apiUrl: string;
  apiKey: string;
}

export interface CreatePixParams {
  appointmentId: string;
  clientName: string;
  clientPhone: string;
  servicePrice: number;
  barberName: string;
  barberCommissionRate?: number;
  salonWalletId?: string;
  barberWalletId?: string;
  autoSplitEnabled?: boolean;
  apiKey?: string;
  environment?: 'SANDBOX' | 'PRODUCTION';
}

export interface PixPaymentResult {
  paymentId: string;
  externalId: string;
  pixCopiaCola: string;
  pixQrCodeUrl?: string;
  finalPrice: number;
  discountAmount: number;
  salonShare: number;
  barberShare: number;
  platformFee: number;
  gatewayFee: number;
  isMock: boolean;
}

class AsaasService {
  private defaultApiUrl: string;
  private defaultApiKey: string;

  constructor() {
    this.defaultApiUrl = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
    this.defaultApiKey = process.env.ASAAS_API_KEY || '';
  }

  public isConfigured(apiKey?: string): boolean {
    const key = apiKey || this.defaultApiKey;
    return Boolean(key && key.trim() !== '' && key !== 'your-asaas-api-key');
  }

  /**
   * Tests connection with Asaas API
   */
  public async testConnection(apiKey: string, environment: 'SANDBOX' | 'PRODUCTION' = 'SANDBOX'): Promise<{ success: boolean; balance?: number; error?: string }> {
    const cleanKey = apiKey?.trim();
    if (!cleanKey) {
      return { success: false, error: 'Chave de API não informada.' };
    }

    const baseUrl = environment === 'PRODUCTION' ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3';

    try {
      const res = await fetch(`${baseUrl}/finance/balance`, {
        method: 'GET',
        headers: {
          'access_token': cleanKey,
        },
      });

      if (res.ok) {
        const data: any = await res.json();
        return {
          success: true,
          balance: Number(data.totalBalance ?? data.balance ?? 0),
        };
      } else {
        const errData: any = await res.json().catch(() => ({}));
        const msg = errData?.errors?.[0]?.description || `Erro HTTP ${res.status}: ${res.statusText}`;
        return {
          success: false,
          error: res.status === 401
            ? `Chave de API inválida ou sem permissão no ambiente ${environment === 'PRODUCTION' ? 'Produção' : 'Sandbox'}.`
            : msg,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: `Não foi possível conectar com o servidor do Asaas: ${err.message}`,
      };
    }
  }

  /**
   * Creates or resolves customer in Asaas
   */
  public async getOrCreateAsaasCustomer(
    name: string,
    phone: string,
    apiKey?: string,
    environment?: 'SANDBOX' | 'PRODUCTION'
  ): Promise<string | null> {
    const activeKey = apiKey || this.defaultApiKey;
    if (!this.isConfigured(activeKey)) return null;

    const baseUrl = environment === 'PRODUCTION'
      ? 'https://api.asaas.com/v3'
      : (apiKey ? 'https://sandbox.asaas.com/api/v3' : this.defaultApiUrl);

    const cleanPhone = phone.replace(/\D/g, '');
    try {
      // 1. Search existing customer by phone
      const searchRes = await fetch(`${baseUrl}/customers?mobilePhone=${cleanPhone}`, {
        headers: { 'access_token': activeKey },
      });

      if (searchRes.ok) {
        const data: any = await searchRes.json();
        if (data?.data && data.data.length > 0) {
          return data.data[0].id;
        }
      }

      // 2. Create customer if not found
      const createRes = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': activeKey,
        },
        body: JSON.stringify({
          name: name || `Cliente ${cleanPhone.slice(-4)}`,
          mobilePhone: cleanPhone,
        }),
      });

      if (createRes.ok) {
        const newCust: any = await createRes.json();
        return newCust.id;
      }
    } catch (err) {
      console.warn('[Asaas] Falha ao consultar/criar cliente:', err);
    }

    return null;
  }

  /**
   * Generates a Real Pix with Split da Lei do Salão-Parceiro in Asaas
   */
  public async createPixWithSplit(params: CreatePixParams): Promise<PixPaymentResult> {
    const split = calculateSplit({
      servicePrice: params.servicePrice,
      onlineDiscountActive: true,
      onlineDiscountType: 'PERCENTAGE',
      onlineDiscountValue: 10,
      barberCommissionRate: params.barberCommissionRate ?? 50,
      platformFee: 1.49,
      gatewayCost: 0.99,
    });

    const activeKey = params.apiKey || this.defaultApiKey;
    const baseUrl = params.environment === 'PRODUCTION'
      ? 'https://api.asaas.com/v3'
      : (params.apiKey ? 'https://sandbox.asaas.com/api/v3' : this.defaultApiUrl);

    const cleanPhone = params.clientPhone.replace(/\D/g, '');
    const fallbackPixCode = makePix(split.finalPrice);

    // If Asaas is configured, call official API
    if (this.isConfigured(activeKey)) {
      try {
        const customerId = await this.getOrCreateAsaasCustomer(
          params.clientName,
          cleanPhone,
          activeKey,
          params.environment
        );

        // Due date tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dueDate = tomorrow.toISOString().split('T')[0];

        // Prepare split definitions if autoSplitEnabled is true (or undefined/default)
        const splitRules: any[] = [];
        if (params.autoSplitEnabled !== false && params.barberWalletId) {
          splitRules.push({
            walletId: params.barberWalletId,
            fixedValue: split.barberShare,
            description: `Cota-parte do Barbeiro Parceiro (${params.barberName})`,
          });
        }

        const payload: any = {
          customer: customerId,
          billingType: 'PIX',
          value: split.finalPrice,
          dueDate,
          description: `Atelier 88 • Corte & Barba com ${params.barberName} (#${params.appointmentId})`,
          postalService: false,
        };

        if (splitRules.length > 0) {
          payload.split = splitRules;
        }

        const paymentRes = await fetch(`${baseUrl}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': activeKey,
          },
          body: JSON.stringify(payload),
        });

        if (paymentRes.ok) {
          const paymentData: any = await paymentRes.json();
          const paymentId = paymentData.id;

          // Fetch QR Code and Copia e Cola
          const qrRes = await fetch(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
            headers: { 'access_token': activeKey },
          });

          if (qrRes.ok) {
            const qrData: any = await qrRes.json();
            return {
              paymentId,
              externalId: paymentId,
              pixCopiaCola: qrData.payload || fallbackPixCode,
              pixQrCodeUrl: qrData.encodedImage ? `data:image/png;base64,${qrData.encodedImage}` : undefined,
              finalPrice: split.finalPrice,
              discountAmount: split.discountAmount,
              salonShare: split.salonShare,
              barberShare: split.barberShare,
              platformFee: split.platformFee,
              gatewayFee: split.gatewayFee,
              isMock: false,
            };
          }
        }
      } catch (err) {
        console.warn('[Asaas] Falha ao criar cobrança Pix na API Asaas:', err);
      }
    }

    // High-fidelity fallback with EMV QR Code & Instant simulation ID
    const mockId = `pay_asaas_${Date.now()}`;
    let qrDataUrl: string | undefined = undefined;
    try {
      qrDataUrl = await QRCode.toDataURL(fallbackPixCode, { width: 280, margin: 2 });
    } catch (e) {
      console.warn('[QRCode] Erro ao gerar imagem base64:', e);
    }

    return {
      paymentId: mockId,
      externalId: mockId,
      pixCopiaCola: fallbackPixCode,
      pixQrCodeUrl: qrDataUrl,
      finalPrice: split.finalPrice,
      discountAmount: split.discountAmount,
      salonShare: split.salonShare,
      barberShare: split.barberShare,
      platformFee: split.platformFee,
      gatewayFee: split.gatewayFee,
      isMock: true,
    };
  }
}

export const asaasService = new AsaasService();
