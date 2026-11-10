'use client';

import * as React from 'react';
import { LogOut, X, Loader2 } from 'lucide-react';
import styles from './SignOutConfirmModal.module.css';

interface SignOutConfirmModalProps {
  isOpen: boolean;
  onExit: () => void;
  onDeny: () => void;
  user?: { name?: string; email?: string; uid?: string; publicUid?: string } | null;
  isExiting?: boolean;
}

export function SignOutConfirmModal({
  isOpen,
  onExit,
  onDeny,
  user = null,
  isExiting = false,
}: SignOutConfirmModalProps) {
  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isExiting) {
        onDeny();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDeny, isExiting]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-signout-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExiting) {
          onDeny();
        }
      }}
    >
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header with Warning Icon & Close Button */}
        <div className={styles.iconHeader}>
          <div className={styles.iconBadge}>
            <LogOut className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onDeny}
            disabled={isExiting}
            className={styles.closeXBtn}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Description */}
        <h2 id="admin-signout-modal-title" className={styles.title}>
          Sign Out Confirmation
        </h2>
        <p className={styles.description}>
          Are you sure you want to sign out? You will need your administrative credentials or MFA to
          sign back in.
        </p>

        {/* User Identity Preview */}
        {user && (
          <div className={styles.userBadgeRow}>
            <div className={styles.userAvatar}>
              {(user.name || user.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className={styles.userText}>
              <div className={styles.userName}>{user.name || 'Admin User'}</div>
              <div className={styles.userEmail}>
                {user.email || ''} {user.uid ? `· ${user.uid}` : ''}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons: Exit & Deny */}
        <div className={styles.actionsRow}>
          <button type="button" onClick={onDeny} disabled={isExiting} className={styles.denyBtn}>
            Deny
          </button>
          <button type="button" onClick={onExit} disabled={isExiting} className={styles.exitBtn}>
            {isExiting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing Out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Exit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignOutConfirmModal;
