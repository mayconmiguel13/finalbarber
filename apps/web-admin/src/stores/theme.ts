import { defineStore } from 'pinia';
import { ref } from 'vue';

export type AccentColor = 'gold' | 'blue' | 'emerald' | 'copper';

export interface ColorPreset {
  name: string;
  primary: string;
  hover: string;
  light: string;
  border: string;
  glow: string;
  from: string;
  to: string;
}

export const colorPresets: Record<AccentColor, ColorPreset> = {
  gold: {
    name: 'Dourado Imperial',
    primary: '#D97706',
    hover: '#B45309',
    light: 'rgba(217, 119, 6, 0.12)',
    border: 'rgba(217, 119, 6, 0.3)',
    glow: 'rgba(217, 119, 6, 0.25)',
    from: '#D97706',
    to: '#92400E',
  },
  blue: {
    name: 'Azul Cobalto',
    primary: '#2563EB',
    hover: '#1D4ED8',
    light: 'rgba(37, 99, 235, 0.12)',
    border: 'rgba(37, 99, 235, 0.3)',
    glow: 'rgba(37, 99, 235, 0.25)',
    from: '#2563EB',
    to: '#1E40AF',
  },
  emerald: {
    name: 'Esmeralda Nobre',
    primary: '#059669',
    hover: '#047857',
    light: 'rgba(5, 150, 105, 0.12)',
    border: 'rgba(5, 150, 105, 0.3)',
    glow: 'rgba(5, 150, 105, 0.25)',
    from: '#059669',
    to: '#065F46',
  },
  copper: {
    name: 'Bronze & Cobre',
    primary: '#EA580C',
    hover: '#C2410C',
    light: 'rgba(234, 88, 12, 0.12)',
    border: 'rgba(234, 88, 12, 0.3)',
    glow: 'rgba(234, 88, 12, 0.25)',
    from: '#F97316',
    to: '#C2410C',
  },
};

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref<boolean>(localStorage.getItem('barber_theme_mode') !== 'light');
  const currentAccent = ref<AccentColor>((localStorage.getItem('barber_accent_color') as AccentColor) || 'gold');

  function applyTheme() {
    const root = document.documentElement;
    if (isDark.value) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    root.setAttribute('data-accent', currentAccent.value);

    const preset = colorPresets[currentAccent.value];
    if (preset) {
      root.style.setProperty('--primary', preset.primary);
      root.style.setProperty('--primary-hover', preset.hover);
      root.style.setProperty('--primary-light', preset.light);
      root.style.setProperty('--primary-border', preset.border);
      root.style.setProperty('--primary-glow', preset.glow);
      root.style.setProperty('--gradient-from', preset.from);
      root.style.setProperty('--gradient-to', preset.to);
    }
  }

  function toggleTheme() {
    isDark.value = !isDark.value;
    localStorage.setItem('barber_theme_mode', isDark.value ? 'dark' : 'light');
    applyTheme();
  }

  function setAccentColor(color: AccentColor) {
    currentAccent.value = color;
    localStorage.setItem('barber_accent_color', color);
    applyTheme();
  }

  return {
    isDark,
    currentAccent,
    colorPresets,
    applyTheme,
    toggleTheme,
    setAccentColor,
  };
});
