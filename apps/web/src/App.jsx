import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';

// Public Pages
import HomePage from './app/landingpage/landingpage';
import AboutPage from './app/about/about';
import EcosystemPage from './app/ecosystem/ecosystem';
import ContactPage from './app/contact/contact';
import TermsConditionsPage from './app/terms-conditions/terms-conditions';
import RiskDisclosurePage from './app/risk-disclosure/risk-disclosure';

// Auth Pages
import LoginPage from './app/auth/login/login';
import RegisterPage from './app/auth/register/register';
import ForgotPasswordPage from './app/auth/forgot-password/forgot-password';
import AuthCallbackPage from './app/auth/callback/callback';
import GoogleSelectAccountPage from './app/auth/google/select-account/select-account';

// Customer Portal Shell & Pages
import { PortalShell } from './components/PortalShell';
import DashboardPage from './app/(portal)/dashboard/dashboard';
import DepositPage from './app/(portal)/deposit/deposit';
import DepositDetailPage from './app/(portal)/deposit/[id]/deposit-detail';
import WithdrawPage from './app/(portal)/withdraw/withdraw';
import InvestmentsPage from './app/(portal)/investments/investments';
import InvestmentDetailPage from './app/(portal)/investments/[id]/investment-detail';
import InterestHistoryPage from './app/(portal)/interest-history/interest-history';
import TransactionsPage from './app/(portal)/transactions/transactions';
import NotificationsPage from './app/(portal)/notifications/notifications';
import ProfilePage from './app/(portal)/profile/profile';
import SecurityPage from './app/(portal)/security/security';
import ReferralsPage from './app/(portal)/referrals/referrals';

// Unified Admin & Master Command Console (Merged onto Port 3000)
import { AdminShell } from './admin/components/AdminShell';
import MasterAdminDashboardPage from './admin/app/(console)/master/masteradmindashboard';
import AdminDashboardPage from './admin/app/(console)/dashboard/admindashboard';
import AdminDepositsPage from './admin/app/(console)/deposits/admindeposits';
import AdminDepositReviewPage from './admin/app/(console)/deposits/[id]/admindepositreview';
import AdminWithdrawalsPage from './admin/app/(console)/withdrawals/adminwithdrawals';
import AdminUsersPage from './admin/app/(console)/users/adminuserslist';
import AdminReferralsPage from './admin/app/(console)/referrals/adminreferrals';
import AdminInvestmentsPage from './admin/app/(console)/investments/admininvestments';
import AdminLedgerPage from './admin/app/(console)/ledger/adminledger';
import AdminUsersManagementPage from './admin/app/(console)/admin-users/adminusers';
import AuditLogsPage from './admin/app/(console)/audit-logs/auditlogs';
import BlockchainTransactionsPage from './admin/app/(console)/blockchain-transactions/blockchaintransactions';
import AdminSettingsPage from './admin/app/(console)/settings/adminsettings';
import AdminInterestPage from './admin/app/(console)/interest/admininterest';
import AdminWalletsPage from './admin/app/(console)/wallets/adminwallets';

function PortalLayout({ children }) {
  return <PortalShell>{children}</PortalShell>;
}

function AdminConsoleLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}

function RefRedirect() {
  const { code } = useParams();
  return <Navigate to={`/register?ref=${code || ''}`} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/ecosystem" element={<EcosystemPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/terms-conditions" element={<TermsConditionsPage />} />
      <Route path="/risk-disclosure" element={<RiskDisclosurePage />} />

      {/* Unified Auth Suite */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/ref/:code" element={<RefRedirect />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/google/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/google/select-account" element={<GoogleSelectAccountPage />} />

      {/* Customer Portal Pages */}
      <Route
        path="/dashboard"
        element={
          <PortalLayout>
            <DashboardPage />
          </PortalLayout>
        }
      />
      <Route
        path="/deposit"
        element={
          <PortalLayout>
            <DepositPage />
          </PortalLayout>
        }
      />
      <Route
        path="/deposit/:id"
        element={
          <PortalLayout>
            <DepositDetailPage />
          </PortalLayout>
        }
      />
      <Route
        path="/withdraw"
        element={
          <PortalLayout>
            <WithdrawPage />
          </PortalLayout>
        }
      />
      <Route
        path="/investments"
        element={
          <PortalLayout>
            <InvestmentsPage />
          </PortalLayout>
        }
      />
      <Route
        path="/investments/:id"
        element={
          <PortalLayout>
            <InvestmentDetailPage />
          </PortalLayout>
        }
      />
      <Route
        path="/interest-history"
        element={
          <PortalLayout>
            <InterestHistoryPage />
          </PortalLayout>
        }
      />
      <Route
        path="/transactions"
        element={
          <PortalLayout>
            <TransactionsPage />
          </PortalLayout>
        }
      />
      <Route
        path="/notifications"
        element={
          <PortalLayout>
            <NotificationsPage />
          </PortalLayout>
        }
      />
      <Route
        path="/profile"
        element={
          <PortalLayout>
            <ProfilePage />
          </PortalLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <PortalLayout>
            <ProfilePage />
          </PortalLayout>
        }
      />
      <Route
        path="/security"
        element={
          <PortalLayout>
            <SecurityPage />
          </PortalLayout>
        }
      />
      <Route
        path="/referrals"
        element={
          <PortalLayout>
            <ReferralsPage />
          </PortalLayout>
        }
      />

      {/* Unified Admin & Master Command Console (/admin/*) */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/login" element={<Navigate to="/login?portal=admin" replace />} />
      <Route
        path="/admin/master"
        element={
          <AdminConsoleLayout>
            <MasterAdminDashboardPage />
          </AdminConsoleLayout>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <AdminConsoleLayout>
            <AdminDashboardPage />
          </AdminConsoleLayout>
        }
      />
      <Route
        path="/admin/deposits"
        element={
          <AdminConsoleLayout>
            <AdminDepositsPage />
          </AdminConsoleLayout>
        }
      />
      <Route
        path="/admin/deposits/:id"
        element={
          <AdminConsoleLayout>
            <AdminDepositReviewPage />
          </AdminConsoleLayout>
        }
      />
      <Route
        path="/admin/withdrawals"
        element={
          <AdminConsoleLayout>
            <AdminWithdrawalsPage />
          </AdminConsoleLayout>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminConsoleLayout>
            <AdminUsersPage />
          </AdminConsoleLayout>
        }
      />
      <Route
        path="/admin/referrals"
        element={
          <AdminConsoleLayout>
            <AdminReferralsPage />
          </AdminConsoleLayout>
        }
      />
      <Route
        path="/admin/investments"
        element={
          <AdminConsoleLayout>
            <AdminInvestmentsPage />
          </AdminConsoleLayout>
        }
      />
      <Route
        path="/admin/interest"
        element={
          <AdminConsoleLayout>
            <AdminInterestPage />
          </AdminConsoleLayout>
        }
      />
      <Route
        path="/admin/ledger"
        element={
          <AdminConsoleLayout>
            <AdminLedgerPage />
          </AdminConsoleLayout>
        }
      />
      <Route
        path="/admin/admin-users"
        element={
          <AdminConsoleLayout>
            <AdminUsersManagementPage />
          </AdminConsoleLayout>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <AdminConsoleLayout>
            <AuditLogsPage />
          </AdminConsoleLayout>
        }
      />
      <Route
        path="/admin/blockchain-transactions"
        element={
          <AdminConsoleLayout>
            <BlockchainTransactionsPage />
          </AdminConsoleLayout>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminConsoleLayout>
            <AdminSettingsPage />
          </AdminConsoleLayout>
        }
      />
      <Route
        path="/admin/wallets"
        element={
          <AdminConsoleLayout>
            <AdminWalletsPage />
          </AdminConsoleLayout>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
