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
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
    this.apiKey = process.env.ASAAS_API_KEY || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim() !== '' && this.apiKey !== 'your-asaas-api-key');
  }

  /**
   * Creates or resolves customer in Asaas
   */
  public async getOrCreateAsaasCustomer(name: string, phone: string): Promise<string | null> {
    if (!this.isConfigured()) return null;

    const cleanPhone = phone.replace(/\D/g, '');
    try {
      // 1. Search existing customer by phone
      const searchRes = await fetch(`${this.apiUrl}/customers?mobilePhone=${cleanPhone}`, {
        headers: { 'access_token': this.apiKey },
      });

      if (searchRes.ok) {
        const data: any = await searchRes.json();
        if (data?.data && data.data.length > 0) {
          return data.data[0].id;
        }
      }

      // 2. Create customer if not found
      const createRes = await fetch(`${this.apiUrl}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': this.apiKey,
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

    const cleanPhone = params.clientPhone.replace(/\D/g, '');
    const fallbackPixCode = makePix(split.finalPrice);

    // If Asaas is configured, call official API
    if (this.isConfigured()) {
      try {
        const customerId = await this.getOrCreateAsaasCustomer(params.clientName, cleanPhone);

        // Due date tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dueDate = tomorrow.toISOString().split('T')[0];

        // Prepare split definitions
        const splitRules: any[] = [];
        if (params.barberWalletId) {
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

        const paymentRes = await fetch(`${this.apiUrl}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': this.apiKey,
          },
          body: JSON.stringify(payload),
        });

        if (paymentRes.ok) {
          const paymentData: any = await paymentRes.json();
          const paymentId = paymentData.id;

          // Fetch QR Code and Copia e Cola
          const qrRes = await fetch(`${this.apiUrl}/payments/${paymentId}/pixQrCode`, {
            headers: { 'access_token': this.apiKey },
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
    return {
      paymentId: mockId,
      externalId: mockId,
      pixCopiaCola: fallbackPixCode,
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
