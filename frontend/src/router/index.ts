import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomePage.vue'),
    },
    {
      path: '/prototypes',
      name: 'prototype-square',
      component: () => import('@/views/PrototypeSquarePage.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginPage.vue'),
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPasswordPage.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterPage.vue'),
    },
    {
      path: '/register/done',
      name: 'register-done',
      component: () => import('@/views/RegisterDonePage.vue'),
    },
    {
      path: '/email-verified-success',
      name: 'email-verified-success',
      component: () => import('@/views/EmailVerifiedSuccessPage.vue'),
    },
    {
      path: '/email-verification-failed',
      name: 'email-verification-failed',
      component: () => import('@/views/EmailVerificationFailedPage.vue'),
    },
    {
      path: '/submit',
      name: 'submit',
      component: () => import('@/views/SubmitWizard.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/app-store',
      name: 'app-store',
      component: () => import('@/views/AppStore.vue'),
    },
    {
      path: '/templates',
      name: 'templates',
      component: () => import('@/views/TemplatesPage.vue'),
    },
    {
      path: '/app/:id/push',
      name: 'app-push',
      component: () => import('@/views/PushToACR.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/CreditDashboard.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/my-apps',
      name: 'my-apps',
      component: () => import('@/views/AppManagement.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/app-tasks',
      name: 'app-tasks',
      component: () => import('@/views/AppTaskManagement.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/pencil',
      name: 'pencil-design',
      component: () => import('@/views/PencilDesignPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/figma',
      name: 'figma-prototype',
      component: () => import('@/views/FigmaPrototypePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminPage.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/requirement/:id',
      name: 'requirement-detail',
      component: () => import('@/views/RequirementDetail.vue'),
    },
    {
      path: '/requirement/:id/prototype',
      name: 'requirement-prototype',
      component: () => import('@/views/PrototypePreviewPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/500',
      name: 'server-error',
      component: () => import('@/views/ServerErrorPage.vue'),
    },
    {
      path: '/maintenance',
      name: 'maintenance',
      component: () => import('@/views/MaintenancePage.vue'),
    },
    {
      path: '/pricing',
      name: 'pricing',
      component: () => import('@/views/PricingPage.vue'),
    },
    {
      path: '/pricing/checkout',
      name: 'pricing-checkout',
      component: () => import('@/views/PricingCheckoutPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/user-agreement',
      name: 'user-agreement',
      component: () => import('@/views/UserAgreementPage.vue'),
    },
    {
      path: '/privacy-policy',
      name: 'privacy-policy',
      component: () => import('@/views/PrivacyPolicyPage.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundPage.vue'),
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } });
  } else if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next('/');
  } else {
    next();
  }
});

export default router;
