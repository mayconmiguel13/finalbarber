<script setup lang="ts">
import { Check, AlertCircle, Info, X } from 'lucide-vue-next';
import { useToastStore } from '../stores/toast';

const toastStore = useToastStore();
</script>

<template>
  <div class="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
    <TransitionGroup
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-[-16px] opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="translate-x-8 opacity-0 scale-95"
    >
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="pointer-events-auto bg-white/95 dark:bg-[#131722]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 soft-card-shadow shadow-xl flex items-start gap-3.5 relative overflow-hidden group"
      >
        <!-- Icon Badge with glowing ring -->
        <div class="shrink-0 mt-0.5">
          <!-- Success Icon -->
          <div
            v-if="toast.type === 'success'"
            class="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-4 ring-emerald-50 dark:ring-emerald-950/40"
          >
            <Check class="w-4 h-4 stroke-[2.5]" />
          </div>

          <!-- Error Icon -->
          <div
            v-else-if="toast.type === 'error'"
            class="w-9 h-9 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center ring-4 ring-rose-50 dark:ring-rose-950/40"
          >
            <AlertCircle class="w-4 h-4 stroke-[2.5]" />
          </div>

          <!-- Info Icon -->
          <div
            v-else
            class="w-9 h-9 rounded-full bg-brand-light text-brand flex items-center justify-center ring-4 ring-brand-light/40"
          >
            <Info class="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0 pr-2">
          <h4
            v-if="toast.title"
            class="text-xs font-bold text-slate-900 dark:text-white tracking-tight"
          >
            {{ toast.title }}
          </h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed break-words">
            {{ toast.message }}
          </p>
        </div>

        <!-- Close Button -->
        <button
          @click="toastStore.remove(toast.id)"
          class="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition"
        >
          <X class="w-3.5 h-3.5" />
        </button>

        <!-- Dynamic progress line (disappears when duration completes) -->
        <div
          v-if="(toast.duration || 0) > 0"
          class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-slate-100 dark:bg-slate-800"
        >
          <div
            class="h-full transition-all duration-linear"
            :class="toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-rose-500' : 'bg-brand'"
            :style="{
              animation: `shrinkWidth ${toast.duration}ms linear forwards`,
            }"
          ></div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
@keyframes shrinkWidth {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
</style>
