'use client';
import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { COMPLIANCE_DISCLOSURES } from '@navrix/config';
import { Button, StatusBadge } from '@navrix/ui';
import { apiRequest } from '../../../lib/api';
import styles from './profile.module.css';
export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: me } = useQuery({
    queryKey: ['users-me'],
    queryFn: () => apiRequest('/users/me'),
  });
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [country, setCountry] = React.useState('');
  const [taxResidency, setTaxResidency] = React.useState('');
  const [taxIdNumber, setTaxIdNumber] = React.useState('');
  const [acceptAgreement, setAcceptAgreement] = React.useState(true);
  const [savedNotice, setSavedNotice] = React.useState(null);
  React.useEffect(() => {
    if (me) {
      setName(me.name);
      setPhone(me.phone || '');
      setCountry(me.compliance?.country || '');
      setTaxResidency(me.compliance?.taxResidency || '');
    }
  }, [me]);
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await apiRequest('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ name, phone }),
    });
    await queryClient.invalidateQueries({ queryKey: ['users-me'] });
    setSavedNotice('Account profile updated.');
  };
  const handleSaveCompliance = async (e) => {
    e.preventDefault();
    await apiRequest('/users/me/compliance', {
      method: 'PUT',
      body: JSON.stringify({
        country,
        taxResidency,
        taxIdNumber: taxIdNumber || undefined,
        acceptTerms: true,
        acceptPrivacyPolicy: true,
        acceptRiskDisclosure: true,
        acceptInvestmentAgreement: acceptAgreement,
      }),
    });
    setTaxIdNumber('');
    await queryClient.invalidateQueries({ queryKey: ['users-me'] });
    setSavedNotice('Compliance & jurisdiction disclosures updated.');
  };
  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold">Profile & Compliance</h1>
        <p className="mt-0.5 text-xs sm:text-sm opacity-70">
          Manage your public account UID, contact preferences, and configurable compliance
          placeholders.
        </p>
      </div>

      {savedNotice ? (
        <div className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          {savedNotice}
        </div>
      ) : null}

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs opacity-65">Public Investor UID</div>
              <div className="font-mono text-base sm:text-lg font-extrabold text-amber-400">
                {me?.uid || '—'}
              </div>
            </div>
            <StatusBadge status={me?.status || 'ACTIVE'} />
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Email Address</label>
              <input type="email" value={me?.email || ''} disabled className={styles.input} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={styles.input}
              />
            </div>
            <Button type="submit" variant="gold" className="w-full sm:w-auto">
              Save Profile
            </Button>
          </form>
        </section>

        <section className={styles.card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">KYC, Tax & Legal Disclosures</h2>
            <StatusBadge status={me?.compliance?.kycStatus || 'NOT_SUBMITTED'} />
          </div>

          <form onSubmit={handleSaveCompliance} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold">Country of Residence</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United States, India, Singapore"
                className={styles.input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Tax Residency Jurisdiction</label>
              <input
                type="text"
                value={taxResidency}
                onChange={(e) => setTaxResidency(e.target.value)}
                placeholder="Tax residency country"
                className={styles.input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">
                Tax Identification (Stored Masked: {me?.compliance?.taxIdMasked || 'None'})
              </label>
              <input
                type="text"
                value={taxIdNumber}
                onChange={(e) => setTaxIdNumber(e.target.value)}
                placeholder="Optional Tax ID (stored masked)"
                className={styles.input}
              />
            </div>

            <label className="flex items-start gap-2 text-xs opacity-85">
              <input
                type="checkbox"
                checked={acceptAgreement}
                onChange={(e) => setAcceptAgreement(e.target.checked)}
                className="mt-0.5 accent-amber-500"
              />
              <span>
                Acknowledge Terms, Privacy Policy, Risk Disclosure, and Investment Allocation
                Agreement (subject to jurisdictional legal/compliance review).
              </span>
            </label>

            <Button type="submit" variant="secondary" className="w-full sm:w-auto">
              Update Compliance Declarations
            </Button>
          </form>

          <p className="mt-4 text-[11px] leading-relaxed opacity-60">
            {COMPLIANCE_DISCLOSURES.regulatoryDisclaimer}
          </p>
        </section>
      </div>
    </div>
  );
}
