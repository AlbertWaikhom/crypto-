import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Admin Shell
import { AdminShell } from './components/AdminShell';

// Auth Pages
import AdminLoginPage from './app/login/adminlogin';
import AdminSsoPage from './app/sso/adminsso';

// Console Pages
import MasterAdminDashboardPage from './app/(console)/master/masteradmindashboard';
import AdminDashboardPage from './app/(console)/dashboard/admindashboard';
import AdminDepositsPage from './app/(console)/deposits/admindeposits';
import AdminDepositReviewPage from './app/(console)/deposits/[id]/admindepositreview';
import AdminWithdrawalsPage from './app/(console)/withdrawals/adminwithdrawals';
import AdminUsersPage from './app/(console)/users/adminuserslist';
import AdminInvestmentsPage from './app/(console)/investments/admininvestments';
import AdminLedgerPage from './app/(console)/ledger/adminledger';
import AdminUsersManagementPage from './app/(console)/admin-users/adminusers';
import AuditLogsPage from './app/(console)/audit-logs/auditlogs';
import BlockchainTransactionsPage from './app/(console)/blockchain-transactions/blockchaintransactions';
import AdminSettingsPage from './app/(console)/settings/adminsettings';
import AdminInterestPage from './app/(console)/interest/admininterest';
import AdminWalletsPage from './app/(console)/wallets/adminwallets';

function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}

export default function App() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/master" replace />} />

      {/* Auth */}
      <Route path="/login" element={<AdminLoginPage />} />
      <Route path="/sso" element={<AdminSsoPage />} />

      {/* Console Routes */}
      <Route
        path="/master"
        element={
          <ConsoleLayout>
            <MasterAdminDashboardPage />
          </ConsoleLayout>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ConsoleLayout>
            <AdminDashboardPage />
          </ConsoleLayout>
        }
      />
      <Route
        path="/deposits"
        element={
          <ConsoleLayout>
            <AdminDepositsPage />
          </ConsoleLayout>
        }
      />
      <Route
        path="/deposits/:id"
        element={
          <ConsoleLayout>
            <AdminDepositReviewPage />
          </ConsoleLayout>
        }
      />
      <Route
        path="/withdrawals"
        element={
          <ConsoleLayout>
            <AdminWithdrawalsPage />
          </ConsoleLayout>
        }
      />
      <Route
        path="/users"
        element={
          <ConsoleLayout>
            <AdminUsersPage />
          </ConsoleLayout>
        }
      />
      <Route
        path="/investments"
        element={
          <ConsoleLayout>
            <AdminInvestmentsPage />
          </ConsoleLayout>
        }
      />
      <Route
        path="/ledger"
        element={
          <ConsoleLayout>
            <AdminLedgerPage />
          </ConsoleLayout>
        }
      />
      <Route
        path="/admin-users"
        element={
          <ConsoleLayout>
            <AdminUsersManagementPage />
          </ConsoleLayout>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ConsoleLayout>
            <AuditLogsPage />
          </ConsoleLayout>
        }
      />
      <Route
        path="/blockchain-transactions"
        element={
          <ConsoleLayout>
            <BlockchainTransactionsPage />
          </ConsoleLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <ConsoleLayout>
            <AdminSettingsPage />
          </ConsoleLayout>
        }
      />
      <Route
        path="/wallets"
        element={
          <ConsoleLayout>
            <AdminWalletsPage />
          </ConsoleLayout>
        }
      />
      <Route
        path="/interest"
        element={
          <ConsoleLayout>
            <AdminInterestPage />
          </ConsoleLayout>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/master" replace />} />
    </Routes>
  );
}
