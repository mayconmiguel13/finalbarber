<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Scissors, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-vue-next';
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
              <a href="#" class="text-[11px] text-brand hover:underline font-semibold">
                Esqueceu a senha?
              </a>
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
            class="w-full py-3 rounded-xl bg-gradient-to-r from-brand via-amber-500 to-brand hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-brand/30 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50"
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
            class="w-full py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-[11px] font-semibold transition flex items-center justify-center gap-1.5"
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
  </div>
</template>
