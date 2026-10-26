<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  showBadge?: boolean;
  subtitle?: string;
  variant?: 'emblem' | 'full';
}

withDefaults(defineProps<Props>(), {
  size: 'md',
  showWordmark: true,
  showBadge: true,
  subtitle: 'BARBERSHOP INTELLIGENCE',
  variant: 'emblem',
});
</script>

<template>
  <div class="inline-flex items-center gap-3 cursor-pointer group select-none">
    <!-- Emblem: Double-edge razor blade with ribbon loop in Champagne Gold -->
    <div 
      class="relative flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
      :class="{
        'w-8 h-8': size === 'sm',
        'w-11 h-11': size === 'md',
        'w-14 h-14': size === 'lg',
        'w-20 h-20': size === 'xl',
      }"
    >
      <img 
        src="/emblem-barblyclub.png" 
        alt="BarblyClub Emblem" 
        class="w-full h-full object-contain drop-shadow-[0_4px_16px_rgba(245,158,11,0.35)]" 
        onerror="this.src='/logo-barblyclub.svg'"
      />
    </div>

    <!-- Wordmark & Subtitle -->
    <div v-if="showWordmark" class="leading-none">
      <div class="flex items-center gap-1.5">
        <span 
          class="font-black tracking-tight text-white block font-sans"
          :class="{
            'text-base tracking-tight': size === 'sm',
            'text-xl tracking-tight': size === 'md',
            'text-2xl tracking-tight': size === 'lg',
            'text-4xl tracking-tighter': size === 'xl',
          }"
        >
          barbly<span class="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">club</span>
        </span>
        <span 
          v-if="showBadge && (size === 'md' || size === 'lg' || size === 'xl')"
          class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 tracking-wider shadow-sm shadow-amber-500/10"
        >
          VIP 2026
        </span>
      </div>

      <span 
        v-if="subtitle"
        class="text-[8px] sm:text-[9px] tracking-widest uppercase font-bold text-slate-400 block mt-1 flex items-center gap-1.5"
      >
        <span>{{ subtitle }}</span>
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
      </span>
    </div>
  </div>
</template>
