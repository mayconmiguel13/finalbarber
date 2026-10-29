import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import SettingsView from '../views/SettingsView.vue';
import WhatsAppSimView from '../views/WhatsAppSimView.vue';
import LandingView from '../views/LandingView.vue';
import LoginView from '../views/LoginView.vue';
import OnboardingView from '../views/OnboardingView.vue';
import { useAuthStore } from '../stores/auth';
import { pinia } from '../pinia';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/tv/:slug?',
      name: 'tv-player',
      component: () => import('../views/TvPlayerView.vue'),
      meta: { public: true },
    },
    {
      path: '/landing',
      name: 'landing',
      component: LandingView,
      meta: { public: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true },
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: OnboardingView,
      meta: { requiresAuth: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/whatsapp',
      name: 'whatsapp-ia',
      component: WhatsAppSimView,
      meta: { requiresAuth: true },
    },
    {
      path: '/appointments',
      name: 'appointments',
      component: () => import('../views/AppointmentsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/calendar',
      redirect: '/appointments',
    },
    {
      path: '/barbers',
      name: 'barbers',
      component: () => import('../views/BarbersView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/clients',
      name: 'clients',
      component: () => import('../views/ClientsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/services',
      name: 'services',
      component: () => import('../views/ServicesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/products',
      name: 'products',
      component: () => import('../views/ProductsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/inventory',
      redirect: '/products',
    },
    {
      path: '/financial',
      name: 'financial',
      component: () => import('../views/FinancialView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/commissions',
      name: 'commissions',
      component: () => import('../views/CommissionsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/splits',
      redirect: '/commissions',
    },
    {
      path: '/tv-media',
      name: 'tv-media',
      component: () => import('../views/TvMediaView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore(pinia);

  // If going to landing or login while authenticated, send to dashboard
  if (to.meta.public && authStore.isAuthenticated && (to.path === '/login' || to.path === '/landing')) {
    if (authStore.needsOnboarding) {
      return next('/onboarding');
    }
    return next('/');
  }

  // If route requires auth and user is not authenticated, send to landing
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next('/landing');
  }

  // If user is authenticated but hasn't completed onboarding
  if (authStore.isAuthenticated && authStore.needsOnboarding && to.path !== '/onboarding') {
    return next('/onboarding');
  }

  next();
});
