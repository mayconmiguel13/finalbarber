<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import Sidebar from './components/Sidebar.vue';
import Header from './components/Header.vue';
import BottomNav from './components/BottomNav.vue';
import PwaInstallBanner from './components/PwaInstallBanner.vue';
import AppointmentModal from './components/AppointmentModal.vue';
import ToastContainer from './components/ToastContainer.vue';
import { useThemeStore } from './stores/theme';
import { useAuthStore } from './stores/auth';

const route = useRoute();
const themeStore = useThemeStore();
const authStore = useAuthStore();
const isModalOpen = ref(false);
const isMobileSidebarOpen = ref(false);

const isStandalonePage = computed(() => {
  return ['landing', 'login', 'onboarding'].includes(route.name as string);
});

onMounted(async () => {
  themeStore.applyTheme();
  if (authStore.token) {
    await authStore.fetchMe();
  }
});
</script>

<template>
  <div>
    <!-- Floating Toast Notifications (Top-Right) -->
    <ToastContainer />

    <!-- If Standalone Page (Landing / Login / Onboarding) -->
    <div v-if="isStandalonePage" class="min-h-screen">
      <router-view />
    </div>

    <!-- Main Admin Dashboard Layout -->
    <div v-else class="min-h-screen flex p-0 lg:p-5 relative">
      <!-- Main Rounded Canvas Card matching Reference Design -->
      <div class="w-full bg-[#FAFAFC] dark:bg-[#11141E] border-0 lg:border border-slate-200/80 dark:border-slate-800/80 rounded-none lg:rounded-[28px] shadow-sm flex overflow-hidden min-h-screen lg:min-h-[92vh]">
        
        <!-- Left Sidebar (Desktop + Mobile Drawer) -->
        <Sidebar 
          :is-mobile-open="isMobileSidebarOpen" 
          @close="isMobileSidebarOpen = false" 
        />

        <!-- Right Main Content -->
        <main class="flex-1 flex flex-col overflow-y-auto pb-20 lg:pb-0">
          <!-- Top Header -->
          <Header 
            @open-appointment-modal="isModalOpen = true" 
            @toggle-sidebar="isMobileSidebarOpen = !isMobileSidebarOpen"
          />

          <!-- Routed Views (Dashboard / WhatsApp / Settings) -->
          <router-view @open-modal="isModalOpen = true" />
        </main>

      </div>

      <!-- Mobile Bottom Navigation Bar (Thumb Friendly) -->
      <BottomNav 
        @open-menu="isMobileSidebarOpen = true" 
        @open-appointment-modal="isModalOpen = true" 
      />

      <!-- PWA 1-Click Install Banner for Mobile & Desktop -->
      <PwaInstallBanner />

      <!-- Appointment Confirmed Modal -->
      <AppointmentModal 
        :is-open="isModalOpen" 
        @close="isModalOpen = false" 
      />
    </div>
  </div>
</template>
