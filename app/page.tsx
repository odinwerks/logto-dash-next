import { getLogtoContext } from '@logto/next/server-actions';
import { logtoConfig } from './logto';
import UserProfileData from './components/UserProfileData';
import { 
  signOutUser,
  updateUserBasicInfo,
  updateUserProfile,
  updateUserCustomData,
  updateAvatarUrl,
  verifyPasswordForIdentity,
  sendEmailVerificationCode,
  sendPhoneVerificationCode,
  verifyVerificationCode,
  updateEmailWithVerification,
  updatePhoneWithVerification,
  removeUserEmail,
  // MFA Actions with fixed signatures
  getMfaVerifications,
  generateTotpSecret,
  addMfaVerification,
  deleteMfaVerification,
  generateBackupCodes,
  getBackupCodes
} from './utils/logto-actions';

async function handleSignIn() {
  'use server';
  const { signIn } = await import('@logto/next/server-actions');
  await signIn(logtoConfig);
}

async function refreshUserData() {
  'use server';
  return { success: true, redirect: '/' };
}

export default async function StatsPage() {
  const { isAuthenticated } = await getLogtoContext(logtoConfig);
  
  if (!isAuthenticated) {
    return (
      <form action={handleSignIn} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ background: '#0a0a0a', border: '1px solid #374151', padding: '40px', borderRadius: '8px', textAlign: 'center' }}>
          <h1 style={{ color: '#e5e7eb', marginBottom: '20px' }}>🔐 Logto Debug Dashboard</h1>
          <p style={{ color: '#9ca3af', marginBottom: '30px' }}>Sign in to view and edit your profile data</p>
          <button type="submit" style={{ padding: '12px 24px', background: '#4b5563', color: '#fff', border: '1px solid #6b7280', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}>
            Sign In
          </button>
        </div>
      </form>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#050505' }}>
      <UserProfileData 
        onUpdateBasicInfo={updateUserBasicInfo}
        onUpdateProfile={updateUserProfile}
        onUpdateCustomData={updateUserCustomData}
        onUpdateAvatarUrl={updateAvatarUrl}
        onVerifyPassword={verifyPasswordForIdentity}
        onSendEmailVerification={sendEmailVerificationCode}
        onSendPhoneVerification={sendPhoneVerificationCode}
        onVerifyCode={verifyVerificationCode}
        onUpdateEmail={updateEmailWithVerification}
        onUpdatePhone={updatePhoneWithVerification}
        onRemoveEmail={removeUserEmail}
        onSignOut={signOutUser}
        onRefresh={refreshUserData}
        // MFA Actions - Fixed signatures with identity verification
        onGetMfaVerifications={getMfaVerifications}
        onGenerateTotpSecret={generateTotpSecret}
        onAddMfaVerification={addMfaVerification}
        onDeleteMfaVerification={deleteMfaVerification}
        onGenerateBackupCodes={generateBackupCodes}
        onGetBackupCodes={getBackupCodes}
      />
    </main>
  );
}