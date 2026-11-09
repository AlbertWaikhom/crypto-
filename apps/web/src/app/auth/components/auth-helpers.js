import { isAdminRole, isMasterAdminRole } from '@navrix/types';
import { useUiStore } from '../../../store/ui-store';
import { useAdminStore } from '../../../admin/store/admin-store';

export function completeAuthSession({
  accessToken,
  user,
  router,
  toast,
  welcomeTitle = 'Signed in successfully',
  welcomeMessage = null,
}) {
  useUiStore.getState().setSession(accessToken, user);

  if (isAdminRole(user.role)) {
    useAdminStore.getState().setAdminSession(accessToken, user);
    const target = isMasterAdminRole(user.role) ? '/admin/master' : '/admin/dashboard';
    if (toast) {
      toast.success(
        welcomeTitle,
        welcomeMessage || `Welcome back, ${user.name}. Opening ${user.role} console.`,
      );
    }
    router.replace(target);
    return;
  }

  if (toast) {
    toast.success(
      welcomeTitle,
      welcomeMessage || `Welcome, ${user.name} (${user.uid}). Vault session active.`,
    );
  }
  router.replace('/dashboard');
}

export function evaluatePasswordStrength(password = '') {
  const rules = [
    { id: 'length', label: '8 characters or more', met: password.length >= 8 },
    {
      id: 'case',
      label: 'Upper and lower case',
      met: /[A-Z]/.test(password) && /[a-z]/.test(password),
    },
    { id: 'number', label: 'A number', met: /[0-9]/.test(password) },
    { id: 'symbol', label: 'A symbol', met: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = rules.filter((r) => r.met).length;
  const color =
    score <= 1 ? '#f43f5e' : score === 2 ? '#f59e0b' : score === 3 ? '#38bdf8' : '#10b981';

  return { rules, score, color };
}
