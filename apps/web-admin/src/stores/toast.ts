import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastItem[]>([]);

  function show(toast: Omit<ToastItem, 'id'>) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const duration = toast.duration ?? 3500;

    const newToast: ToastItem = { ...toast, id, duration };
    toasts.value.push(newToast);

    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }
  }

  function success(message: string, title = 'Sucesso') {
    show({ title, message, type: 'success' });
  }

  function error(message: string, title = 'Erro') {
    show({ title, message, type: 'error' });
  }

  function info(message: string, title = 'Informação') {
    show({ title, message, type: 'info' });
  }

  function warning(message: string, title = 'Aviso') {
    show({ title, message, type: 'warning' });
  }

  function remove(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return {
    toasts,
    show,
    success,
    error,
    info,
    warning,
    remove,
  };
});
