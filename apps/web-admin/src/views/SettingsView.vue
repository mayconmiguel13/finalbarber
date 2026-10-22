<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Palette, Percent, Split, Check, Sparkles, Loader2 } from 'lucide-vue-next';
import { useThemeStore, colorPresets, type AccentColor } from '../stores/theme';
import { useToastStore } from '../stores/toast';
import { api } from '../services/api';

const themeStore = useThemeStore();
const toast = useToastStore();

const loading = ref(true);
const saving = ref(false);
const onlineDiscountActive = ref(true);
const discountType = ref<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
const discountValue = ref(10);

async function loadSettings() {
  loading.value = true;
  try {
    const data = await api.getSettings();
    onlineDiscountActive.value = data.onlineDiscountActive;
    discountType.value = data.onlineDiscountType;
    discountValue.value = data.onlineDiscountValue;
    if (data.themeColor) {
      themeStore.setAccentColor(data.themeColor);
    }
  } catch (err: any) {
    console.warn('Usando valores locais de configuração:', err);
  } finally {
    loading.value = false;
  }
}

function selectColor(key: AccentColor) {
  themeStore.setAccentColor(key);
  toast.info(`Tema atualizado para ${colorPresets[key].name}.`, 'Identidade Visual');
}

async function saveSettings() {
  saving.value = true;

  try {
    await api.updateSettings({
      themeColor: themeStore.currentAccent,
      themeMode: themeStore.isDark ? 'dark' : 'light',
      onlineDiscountActive: onlineDiscountActive.value,
      onlineDiscountType: discountType.value,
      onlineDiscountValue: Number(discountValue.value),
    });

    toast.success(
      `As preferências e o desconto de ${discountValue.value}${discountType.value === 'PERCENTAGE' ? '%' : ' R$'} foram sincronizados.`,
      'Configurações Salvas!'
    );
  } catch (err: any) {
    toast.error(err.message || 'Não foi possível salvar as configurações no servidor.', 'Falha na Operação');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="p-8 max-w-5xl space-y-8">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Configurações do Estabelecimento</h1>
      <p class="text-xs text-slate-400 mt-1">Personalize a identidade visual, as cores da sua marca e as regras de pagamento online salvas na API.</p>
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-xs text-slate-400 py-8">
      <Loader2 class="w-4 h-4 animate-spin text-brand" />
      <span>Carregando configurações...</span>
    </div>

    <template v-else>
      <!-- 1. IDENTIDADE VISUAL & CORES DA MARCA -->
      <div class="bg-white dark:bg-[#131722] border border-slate-200/80 dark:border-slate-800 rounded-[24px] p-6 soft-card-shadow space-y-6">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div class="w-10 h-10 rounded-xl bg-brand-light text-brand flex items-center justify-center">
            <Palette class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-slate-900 dark:text-white">Cor de Destaque da Marca (White-Label)</h2>
            <p class="text-xs text-slate-400">Escolha a cor principal que representa a sua barbearia no painel e no app do cliente.</p>
          </div>
        </div>

        <!-- Color Pickers Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <!-- Gold / Dourado -->
          <div 
            @click="selectColor('gold')"
            class="p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between"
            :class="themeStore.currentAccent === 'gold' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'"
          >
            <div class="flex items-center justify-between">
              <span class="w-7 h-7 rounded-full bg-amber-500 shadow-md"></span>
              <Check v-if="themeStore.currentAccent === 'gold'" class="w-4 h-4 text-amber-500" />
            </div>
            <div class="mt-4">
              <div class="text-xs font-bold text-slate-900 dark:text-white">Dourado Imperial</div>
              <div class="text-[11px] text-slate-400">Elegante & Luxuoso no Dark</div>
            </div>
          </div>

          <!-- Cobalt Blue -->
          <div 
            @click="selectColor('blue')"
            class="p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between"
            :class="themeStore.currentAccent === 'blue' ? 'border-blue-600 bg-blue-600/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'"
          >
            <div class="flex items-center justify-between">
              <span class="w-7 h-7 rounded-full bg-blue-600 shadow-md"></span>
              <Check v-if="themeStore.currentAccent === 'blue'" class="w-4 h-4 text-blue-600" />
            </div>
            <div class="mt-4">
              <div class="text-xs font-bold text-slate-900 dark:text-white">Azul Cobalto</div>
              <div class="text-[11px] text-slate-400">Clean SaaS Moderno</div>
            </div>
          </div>

          <!-- Emerald Green -->
          <div 
            @click="selectColor('emerald')"
            class="p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between"
            :class="themeStore.currentAccent === 'emerald' ? 'border-emerald-600 bg-emerald-600/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'"
          >
            <div class="flex items-center justify-between">
              <span class="w-7 h-7 rounded-full bg-emerald-600 shadow-md"></span>
              <Check v-if="themeStore.currentAccent === 'emerald'" class="w-4 h-4 text-emerald-600" />
            </div>
            <div class="mt-4">
              <div class="text-xs font-bold text-slate-900 dark:text-white">Esmeralda Nobre</div>
              <div class="text-[11px] text-slate-400">Bio, Orgânico & Grooming</div>
            </div>
          </div>

          <!-- Copper / Bronze -->
          <div 
            @click="selectColor('copper')"
            class="p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between"
            :class="themeStore.currentAccent === 'copper' ? 'border-rose-600 bg-rose-600/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'"
          >
            <div class="flex items-center justify-between">
              <span class="w-7 h-7 rounded-full bg-rose-600 shadow-md"></span>
              <Check v-if="themeStore.currentAccent === 'copper'" class="w-4 h-4 text-rose-600" />
            </div>
            <div class="mt-4">
              <div class="text-xs font-bold text-slate-900 dark:text-white">Bronze & Cobre</div>
              <div class="text-[11px] text-slate-400">Vintage & Industrial</div>
            </div>
          </div>

        </div>

        <!-- Live Component Preview -->
        <div class="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <Sparkles class="w-5 h-5 text-brand" />
            <div>
              <div class="text-xs font-bold text-slate-900 dark:text-white">Prévia em Tempo Real</div>
              <div class="text-[11px] text-slate-400">Veja como os botões e destaques se comportam com a cor selecionada.</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-brand text-white shadow-brand">Botão Principal</span>
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-brand-light text-brand">Tag de Destaque</span>
          </div>
        </div>
      </div>

      <!-- 2. REGRAS DE DESCONTO ONLINE (ANTI NO-SHOW) -->
      <div class="bg-white dark:bg-[#131722] border border-slate-200/80 dark:border-slate-800 rounded-[24px] p-6 soft-card-shadow space-y-6">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Percent class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-slate-900 dark:text-white">Incentivo de Pagamento Antecipado (Anti No-Show)</h2>
            <p class="text-xs text-slate-400">Ofereça um pequeno desconto para clientes que pagam via Pix no agendamento, garantindo presença.</p>
          </div>
        </div>

        <div class="space-y-4">
          <!-- Switch Active -->
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-bold text-slate-900 dark:text-white">Ativar desconto para pagamento no Pix/App</div>
              <div class="text-[11px] text-slate-400">Reduz as faltas para praticamente zero e antecipa o caixa.</div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="onlineDiscountActive" class="sr-only peer">
              <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
            </label>
          </div>

          <!-- Discount settings if active -->
          <div v-if="onlineDiscountActive" class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Tipo de Desconto</label>
              <select v-model="discountType" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-subtle">
                <option value="PERCENTAGE">Porcentagem (%)</option>
                <option value="FIXED">Valor Fixo em Reais (R$)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Valor do Desconto ({{ discountType === 'PERCENTAGE' ? '%' : 'R$' }})
              </label>
              <input 
                type="number" 
                v-model="discountValue" 
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-subtle"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 3. SPLIT DE PAGAMENTOS (LEI DO SALÃO-PARCEIRO) -->
      <div class="bg-white dark:bg-[#131722] border border-slate-200/80 dark:border-slate-800 rounded-[24px] p-6 soft-card-shadow space-y-4">
        <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div class="w-10 h-10 rounded-xl bg-brand-light text-brand flex items-center justify-center">
            <Split class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-slate-900 dark:text-white">Split Financeiro & Lei 13.352/2016</h2>
            <p class="text-xs text-slate-400">Conformidade fiscal automática para separar cota da barbearia e cota do profissional MEI.</p>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          ✓ Subconta Asaas homologada com sucesso. Cada pagamento recebido via Pix é fracionado na hora, blindando sua empresa contra bitributação do Simples Nacional.
        </div>
      </div>

      <!-- Action Button -->
      <div class="flex items-center justify-end pt-4">
        <button 
          @click="saveSettings" 
          :disabled="saving"
          class="px-6 py-3 rounded-full bg-brand hover:opacity-95 text-white font-bold text-xs transition shadow-brand flex items-center gap-2 disabled:opacity-50"
        >
          <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
          <span>{{ saving ? 'Salvando...' : 'Salvar Configurações' }}</span>
        </button>
      </div>
    </template>

  </div>
</template>
