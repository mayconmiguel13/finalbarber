<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Lock, Mail, ArrowRight, ShieldCheck, Sparkles, KeyRound, CheckCircle2, X } from 'lucide-vue-next';
import BarblyClubLogo from '../components/BarblyClubLogo.vue';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToastStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');

// Forgot password modal state
const isForgotModalOpen = ref(false);
const forgotStep = ref<1 | 2>(1);
const forgotEmail = ref('');
const forgotCode = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const forgotLoading = ref(false);
const forgotError = ref('');
const previewCode = ref('');

async function handleLogin() {
  errorMessage.value = '';
  if (!email.value || !password.value) {
    errorMessage.value = 'Preencha o e-mail e a senha.';
    return;
  }

  loading.value = true;
  try {
    const data = await authStore.login({
      email: email.value,
      password: password.value,
    });

    toast.show({
      title: 'Login realizado!',
      message: `Bem-vindo de volta, ${data.user.name}.`,
      type: 'success',
    });

    if (authStore.needsOnboarding) {
      router.push('/onboarding');
    } else {
      router.push('/');
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'E-mail ou senha incorretos.';
    toast.show({
      title: 'Erro de Autenticação',
      message: errorMessage.value,
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
}

function fillDemoAdmin() {
  email.value = 'admin@barber.com';
  password.value = 'admin123';
}

function openForgotModal() {
  forgotError.value = '';
  forgotEmail.value = email.value || '';
  forgotCode.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  previewCode.value = '';
  forgotStep.value = 1;
  isForgotModalOpen.value = true;
}

async function handleRequestCode() {
  forgotError.value = '';
  if (!forgotEmail.value || !forgotEmail.value.includes('@')) {
    forgotError.value = 'Informe um e-mail válido cadastrado na barbearia.';
    return;
  }

  forgotLoading.value = true;
  try {
    const data = await authStore.forgotPassword(forgotEmail.value);
    previewCode.value = data.previewCode || '';
    forgotCode.value = data.previewCode || '';
    forgotStep.value = 2;
    toast.show({
      title: 'Código Gerado!',
      message: 'Código de verificação de 6 dígitos gerado com sucesso.',
      type: 'success',
    });
  } catch (err: any) {
    forgotError.value = err.message || 'Erro ao solicitar código de recuperação.';
  } finally {
    forgotLoading.value = false;
  }
}

async function handleResetPassword() {
  forgotError.value = '';
  if (!forgotCode.value || forgotCode.value.length < 4) {
    forgotError.value = 'Informe o código de 6 dígitos recebido.';
    return;
  }
  if (!newPassword.value || newPassword.value.length < 6) {
    forgotError.value = 'A nova senha deve ter no mínimo 6 caracteres.';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    forgotError.value = 'A confirmação de senha não confere.';
    return;
  }

  forgotLoading.value = true;
  try {
    await authStore.resetPassword({
      email: forgotEmail.value,
      code: forgotCode.value,
      newPassword: newPassword.value,
    });

    toast.show({
      title: 'Senha Redefinida!',
      message: 'Sua senha foi alterada com sucesso. Entrando no painel...',
      type: 'success',
    });

    isForgotModalOpen.value = false;
    email.value = forgotEmail.value;
    password.value = newPassword.value;

    // Automatic login with the new credentials
    await handleLogin();
  } catch (err: any) {
    forgotError.value = err.message || 'Erro ao redefinir senha.';
  } finally {
    forgotLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#0a0d14] text-slate-100 flex items-center justify-center p-4 selection:bg-brand selection:text-white font-sans antialiased relative overflow-hidden">
    <!-- Glow Background -->
    <div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-brand/10 blur-[140px] pointer-events-none rounded-full"></div>

    <div class="w-full max-w-md relative z-10">
      <!-- Logo Branding -->
      <div class="text-center mb-8 flex justify-center">
        <router-link to="/landing" class="inline-flex items-center">
          <BarblyClubLogo size="lg" subtitle="Painel de Gestão & Split" />
        </router-link>
      </div>

      <!-- Login Card -->
      <div class="bg-[#131722]/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
        <div>
          <h2 class="text-xl font-bold text-white tracking-tight">
            Acessar sua Barbearia
          </h2>
          <p class="text-xs text-slate-400 mt-1">
            Entre com suas credenciais para gerenciar sua agenda e clientes.
          </p>
        </div>

        <!-- Error Alert -->
        <div v-if="errorMessage" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
          {{ errorMessage }}
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              E-mail
            </label>
            <div class="relative">
              <Mail class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                v-model="email"
                type="email" 
                required
                placeholder="seu.email@barbearia.com"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-brand focus:border-brand transition"
              />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Senha
              </label>
              <button 
                type="button" 
                @click="openForgotModal"
                class="text-[11px] text-brand hover:underline font-semibold cursor-pointer"
              >
                Esqueceu a senha?
              </button>
            </div>
            <div class="relative">
              <Lock class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                v-model="password"
                type="password" 
                required
                placeholder="••••••••"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-brand focus:border-brand transition"
              />
            </div>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit"
            :disabled="loading"
            class="w-full py-3 rounded-xl bg-gradient-to-r from-brand via-amber-500 to-brand hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-brand/30 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span v-if="!loading">Entrar no Sistema</span>
            <span v-else>Autenticando...</span>
            <ArrowRight v-if="!loading" class="w-4 h-4" />
          </button>
        </form>

        <!-- Demo Account Shortcut -->
        <div class="pt-2">
          <button 
            type="button" 
            @click="fillDemoAdmin"
            class="w-full py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles class="w-3.5 h-3.5 text-amber-400" />
            <span>Usar Conta Demo (admin@barber.com)</span>
          </button>
        </div>

        <!-- Footer link -->
        <div class="pt-4 border-t border-slate-800/80 text-center">
          <p class="text-xs text-slate-400">
            Ainda não tem uma conta?
            <router-link to="/landing#cadastro" class="text-brand font-bold hover:underline ml-1">
              Experimente 30 Dias Grátis
            </router-link>
          </p>
        </div>
      </div>
    </div>

    <!-- ================= MODAL: ESQUECEU A SENHA ================= -->
    <div 
      v-if="isForgotModalOpen"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div class="bg-[#121622] border border-slate-800 w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-150">
        <!-- Close Button -->
        <button 
          @click="isForgotModalOpen = false" 
          class="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>

        <!-- Header -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0">
            <KeyRound class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-white">Recuperação de Senha</h3>
            <p class="text-xs text-slate-400">
              {{ forgotStep === 1 ? 'Informe seu e-mail cadastrado' : 'Digite o código e defina sua nova senha' }}
            </p>
          </div>
        </div>

        <!-- Error Alert -->
        <div v-if="forgotError" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
          {{ forgotError }}
        </div>

        <!-- PASSO 1: Solicitar Código -->
        <form v-if="forgotStep === 1" @submit.prevent="handleRequestCode" class="space-y-4">
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Seu E-mail Cadastrado
            </label>
            <div class="relative">
              <Mail class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                v-model="forgotEmail"
                type="email"
                required
                placeholder="seu.email@barbearia.com"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-brand focus:border-brand transition"
              />
            </div>
            <p class="text-[11px] text-slate-400 mt-1.5">
              Um código de segurança de 6 dígitos será gerado para validar a redefinição da sua conta.
            </p>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <button 
              type="button" 
              @click="isForgotModalOpen = false"
              class="w-1/3 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              :disabled="forgotLoading"
              class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand via-amber-500 to-brand text-white text-xs font-bold shadow-lg shadow-brand/20 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span v-if="!forgotLoading">Avançar</span>
              <span v-else>Gerando código...</span>
              <ArrowRight v-if="!forgotLoading" class="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        <!-- PASSO 2: Código e Nova Senha -->
        <form v-else @submit.prevent="handleResetPassword" class="space-y-4">
          <!-- Info Banner with Preview Code -->
          <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
            <div class="font-bold flex items-center gap-1.5">
              <ShieldCheck class="w-4 h-4 text-amber-400 shrink-0" />
              <span>Código enviado para: {{ forgotEmail }}</span>
            </div>
            <p class="text-[11px] text-slate-300">
              Digite o código de 6 dígitos e sua nova senha de acesso.
            </p>
            <div v-if="previewCode" class="pt-1 flex items-center gap-1 text-[11px] text-amber-400 font-mono font-bold">
              <span>Código gerado:</span>
              <span class="bg-amber-400/20 px-2 py-0.5 rounded text-white tracking-widest">{{ previewCode }}</span>
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Código de Verificação (6 dígitos)
            </label>
            <input 
              v-model="forgotCode"
              type="text"
              maxlength="6"
              required
              placeholder="Ex: 123456"
              class="w-full text-center tracking-widest font-mono text-base font-black py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand focus:border-brand transition"
            />
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Nova Senha
            </label>
            <div class="relative">
              <Lock class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                v-model="newPassword"
                type="password"
                required
                minlength="6"
                placeholder="Mínimo 6 caracteres"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-brand focus:border-brand transition"
              />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Confirmar Nova Senha
            </label>
            <div class="relative">
              <Lock class="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                v-model="confirmPassword"
                type="password"
                required
                minlength="6"
                placeholder="Repita a nova senha"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-brand focus:border-brand transition"
              />
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <button 
              type="button" 
              @click="forgotStep = 1"
              class="w-1/3 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Voltar
            </button>
            <button 
              type="submit"
              :disabled="forgotLoading"
              class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 v-if="!forgotLoading" class="w-4 h-4" />
              <span v-if="!forgotLoading">Redefinir e Entrar</span>
              <span v-else>Salvando senha...</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
