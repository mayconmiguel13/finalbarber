<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Sidebar from './components/Sidebar.vue';
import Header from './components/Header.vue';
import AppointmentModal from './components/AppointmentModal.vue';
import ToastContainer from './components/ToastContainer.vue';
import { useThemeStore } from './stores/theme';

const themeStore = useThemeStore();
const isModalOpen = ref(false);

onMounted(() => {
  themeStore.applyTheme();
});
</script>

<template>
  <div class="min-h-screen flex p-3 sm:p-5 relative">
    <!-- Floating Toast Notifications (Top-Right) -->
    <ToastContainer />

    <!-- Main Rounded Canvas Card matching Reference Design -->
    <div class="w-full bg-[#FAFAFC] dark:bg-[#11141E] border border-slate-200/80 dark:border-slate-800/80 rounded-[28px] shadow-sm flex overflow-hidden min-h-[92vh]">
      
      <!-- Left Sidebar -->
      <Sidebar />

      <!-- Right Main Content -->
      <main class="flex-1 flex flex-col overflow-y-auto">
        <!-- Top Header -->
        <Header @open-appointment-modal="isModalOpen = true" />

        <!-- Routed Views (Dashboard / Settings) -->
        <router-view @open-modal="isModalOpen = true" />
      </main>

    </div>

    <!-- Appointment Confirmed Modal -->
    <AppointmentModal 
      :is-open="isModalOpen" 
      @close="isModalOpen = false" 
    />
  </div>
</template>
