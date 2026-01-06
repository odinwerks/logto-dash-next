// components/UserProfileData.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { fetchDashboardData } from '../utils/logto-actions';
import { IBM_Plex_Mono } from 'next/font/google';

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
});

// Simple Copy Icon SVG
const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const CodeBox = ({ 
  title, 
  data, 
  copyKey, 
  onCopy, 
  themeStyles 
}: { 
  title: string; 
  data: any; 
  copyKey: string;
  onCopy: (text: string, key: string) => void;
  themeStyles: any;
}) => (
  <div style={{ marginBottom: '12px' }}>
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '6px',
      fontFamily: 'var(--font-ibm-plex-mono)'
    }}>
      <span style={{ color: themeStyles.textTertiary, fontSize: '11px' }}>
        {title}
      </span>
      <button
        onClick={() => onCopy(typeof data === 'string' ? data : JSON.stringify(data, null, 2), copyKey)}
        style={{
          padding: '3px 8px',
          background: themeStyles.bgTertiary,
          color: themeStyles.textPrimary,
          border: `1px solid ${themeStyles.borderColor}`,
          borderRadius: '3px',
          cursor: 'pointer',
          fontSize: '10px',
          fontFamily: 'var(--font-ibm-plex-mono)'
        }}
      >
        COPY
      </button>
    </div>
    <pre style={{
      background: themeStyles.bgPrimary,
      border: `1px solid ${themeStyles.borderColor}`,
      borderRadius: '5px',
      padding: '10px',
      margin: 0,
      overflow: 'auto',
      fontSize: '11px',
      lineHeight: '1.4',
      maxHeight: '400px',
      color: themeStyles.textPrimary,
      fontFamily: 'var(--font-ibm-plex-mono)'
    }}>
      {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
    </pre>
  </div>
);

const TruncatedToken = ({ token, themeStyles }: { token: string, themeStyles: any }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div style={{ 
      padding: '10px 14px', 
      background: themeStyles.bgPrimary,
      border: `1px solid ${themeStyles.borderColor}`,
      borderRadius: '5px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <pre style={{
        margin: 0,
        color: themeStyles.textPrimary,
        fontSize: '11px',
        fontFamily: 'var(--font-ibm-plex-mono)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        paddingRight: '30px',
        lineHeight: '1.2'
      }}>
        {token}
      </pre>
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute',
          right: '6px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          color: copied ? themeStyles.accentGreen : themeStyles.textSecondary,
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.2s'
        }}
        title="Copy token"
      >
        <CopyIcon />
      </button>
    </div>
  );
};

interface UserProfileDataProps {
  onUpdateBasicInfo: (data: { name?: string; username?: string; primaryEmail?: string; primaryPhone?: string; avatar?: string }) => Promise<void>;
  onUpdateProfile: (profile: { givenName?: string; familyName?: string }) => Promise<void>;
  onUpdateCustomData: (data: Record<string, any>) => Promise<void>;
  onUpdateAvatarUrl: (url: string) => Promise<void>;
  onVerifyPassword: (password: string) => Promise<{ verificationRecordId: string }>;
  onSendEmailVerification: (email: string) => Promise<{ verificationId: string }>;
  onSendPhoneVerification: (phone: string) => Promise<{ verificationId: string }>;
  onVerifyCode: (type: 'email' | 'phone', value: string, verificationId: string, code: string) => Promise<{ verificationRecordId: string }>;
  onUpdateEmail: (email: string | null, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string) => Promise<void>;
  onUpdatePhone: (phone: string, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string) => Promise<void>;
  onRemoveEmail: (identityVerificationRecordId: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onRefresh: () => Promise<{ success: boolean; redirect?: string }>;
  onGetMfaVerifications: () => Promise<Array<{ id: string; type: string; name?: string; agent?: string; createdAt: string; lastUsedAt?: string; remainCodes?: number }>>;
  onGenerateTotpSecret: () => Promise<{ secret: string; secretQrCode: string }>;
  onAddMfaVerification: (type: string, payload: any, identityVerificationRecordId: string) => Promise<void>;
  onDeleteMfaVerification: (verificationId: string, identityVerificationRecordId: string) => Promise<void>;
  onGenerateBackupCodes: (identityVerificationRecordId: string) => Promise<{ codes: string[] }>;
  onGetBackupCodes: (identityVerificationRecordId: string) => Promise<{ codes: Array<{ code: string; usedAt: string | null }> }>;
}

interface DashboardData {
  userData: any;
  accessToken: string;
}

// Mobile detection hook (simplified from user's version)
let mobileState = false;
let listeners = new Set<(isMobile: boolean) => void>();
let resizeListenerAttached = false;
let orientationListenerAttached = false;

const detectMobile = (): boolean => {
  const viewportWidth = window.innerWidth || window.screen.width;
  const viewportHeight = window.innerHeight || window.screen.height;
  
  if (viewportHeight === 0) {
    return true;
  }
  
  const aspectRatio = viewportWidth / viewportHeight;
  
  if (aspectRatio > 1.35) {
    return false;
  }
  
  return true;
};

const updateMobileState = (): void => {
  const newState = detectMobile();
  if (newState !== mobileState) {
    mobileState = newState;
    listeners.forEach(listener => listener(mobileState));
  }
};

let resizeTimeout: NodeJS.Timeout | null = null;
const handleResize = (): void => {
  if (resizeTimeout) clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    updateMobileState();
  }, 100);
};

let orientationTimeout: NodeJS.Timeout | null = null;
const handleOrientationChange = (): void => {
  if (orientationTimeout) clearTimeout(orientationTimeout);
  orientationTimeout = setTimeout(() => {
    updateMobileState();
  }, 50);
};

if (typeof window !== 'undefined') {
  mobileState = detectMobile();

  if (!resizeListenerAttached) {
    window.addEventListener('resize', handleResize);
    resizeListenerAttached = true;
  }

  if (!orientationListenerAttached) {
    window.addEventListener('orientationchange', handleOrientationChange);
    orientationListenerAttached = true;
  }
}

function useMobileDetection(): boolean {
  const [isMobile, setIsMobile] = useState(mobileState);

  useEffect(() => {
    const listener = (newState: boolean) => setIsMobile(newState);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return isMobile;
}

export default function UserProfileData(props: UserProfileDataProps) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('logto-dashboard-theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const themeStyles = useMemo(() => {
    if (theme === 'dark') {
      return {
        bgPage: '#0a0a0a',
        bgPrimary: '#050505',
        bgSecondary: '#0a0a0a',
        bgTertiary: '#1a1a1a',
        borderColor: '#374151',
        textPrimary: '#d1d5db',
        textSecondary: '#9ca3af',
        textTertiary: '#6b7280',
        accentGreen: '#86efac',
        accentYellow: '#fbbf24',
        accentRed: '#ef4444',
        successBg: '#003300',
        errorBg: '#330000',
        warningBg: '#78350f',
        fontWeight: 'normal'
      };
    }
    return {
      bgPage: '#e8eaed',
      bgPrimary: '#ffffff',
      bgSecondary: '#dadcde',
      bgTertiary: '#c0c2c4',
      borderColor: '#7a7c7e',
      textPrimary: '#050505',
      textSecondary: '#333333',
      textTertiary: '#555555',
      accentGreen: '#059669',
      accentYellow: '#d97706',
      accentRed: '#dc2626',
      successBg: '#ecfdf5',
      errorBg: '#fef2f2',
      warningBg: '#fffbdc',
      fontWeight: '500'
    };
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('logto-dashboard-theme', newTheme);
      return newTheme;
    });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchDashboardData();
      
      if (!result.success) {
        if ('needsAuth' in result) {
          router.push('/');
          return;
        }
        setError(result.error || 'Failed to load data');
        return;
      }
      
      setData({ 
        userData: result.userData, 
        accessToken: result.accessToken 
      });
    } catch (err) {
      console.error('Load data error:', err);
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontFamily: 'var(--font-ibm-plex-mono)',
        backgroundColor: themeStyles.bgPage,
        color: themeStyles.textPrimary
      }}>
        <div style={{ color: themeStyles.textTertiary }}>
          [LOADING USER DATA...]
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        background: themeStyles.bgPrimary, 
        border: `1px solid ${themeStyles.accentRed}`, 
        borderRadius: '6px', 
        margin: '10px',
        fontFamily: 'var(--font-ibm-plex-mono)'
      }}>
        <div style={{ color: themeStyles.accentRed, marginBottom: '15px' }}>
          [ERROR] {error}
        </div>
        <button onClick={loadData} style={{ padding: '8px 16px', background: themeStyles.bgTertiary, color: themeStyles.textPrimary, border: `1px solid ${themeStyles.borderColor}`, borderRadius: '4px', cursor: 'pointer' }}>
          [RETRY]
        </button>
      </div>
    );
  }

  if (!data) {
    return <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      fontFamily: 'var(--font-ibm-plex-mono)'
    }}>
      <div style={{ color: themeStyles.textTertiary }}>[NO DATA]</div>
    </div>;
  }

  return (
    <div className={ibmPlexMono.className} style={{ 
      padding: '12px', 
      maxWidth: '100vw',
      margin: '0',
      backgroundColor: themeStyles.bgPage,
      color: themeStyles.textPrimary,
      minHeight: '100vh',
      boxSizing: 'border-box',
      fontWeight: themeStyles.fontWeight
    }}>
      <UserProfileDataInternal 
        data={data}
        loadData={loadData}
        theme={theme}
        themeStyles={themeStyles}
        toggleTheme={toggleTheme}
        useMobileDetection={useMobileDetection}
        {...props}
      />
    </div>
  );
}

interface UserProfileDataInternalProps extends UserProfileDataProps {
  data: DashboardData;
  loadData: () => Promise<void>;
  theme: 'dark' | 'light';
  themeStyles: any;
  toggleTheme: () => void;
  useMobileDetection: () => boolean;
}

function UserProfileDataInternal(props: UserProfileDataInternalProps) {
  const {
    data,
    loadData,
    theme,
    themeStyles,
    toggleTheme,
    useMobileDetection,
    ...actionProps
  } = props;
  
  const router = useRouter();
  const { userData, accessToken } = data;
  const isMobile = useMobileDetection();
  
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'custom' | 'identities' | 'organizations' | 'raw' | 'mfa'>('basic');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  
  // Email/Phone verification state
  const [verificationState, setVerificationState] = useState<{
    type: 'email' | 'phone' | null;
    operation: 'add' | 'edit' | 'remove' | null;
    step: 'password' | 'code' | null;
    verificationId: string | null;
    newValue: string;
  }>({ 
    type: null, 
    operation: null, 
    step: null, 
    verificationId: null, 
    newValue: '' 
  });
  
  const [verificationCode, setVerificationCode] = useState('');
  const [identityVerificationId, setIdentityVerificationId] = useState<string | null>(null);
  const [passwordForVerification, setPasswordForVerification] = useState('');
  
  // Profile edit state
  const [editGivenName, setEditGivenName] = useState(userData.profile?.givenName || '');
  const [editFamilyName, setEditFamilyName] = useState(userData.profile?.familyName || '');
  const [editUsername, setEditUsername] = useState(userData.username || '');
  const [editCustomData, setEditCustomData] = useState(() => JSON.stringify(userData.customData || {}, null, 2));
  const [editAvatarUrl, setEditAvatarUrl] = useState(userData.avatar || '');
  
  // MFA state
  const [mfaVerifications, setMfaVerifications] = useState<Array<{ 
    id: string; 
    type: string; 
    name?: string; 
    agent?: string; 
    createdAt: string; 
    lastUsedAt?: string; 
    remainCodes?: number 
  }>>([]);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<{ secret: string; secretQrCode: string } | null>(null);
  const [totpVerificationCode, setTotpVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  
  const [mfaVerificationState, setMfaVerificationState] = useState<{
    operation: 'add-totp' | 'delete-mfa' | 'generate-backup' | 'view-backup' | null;
    verificationId: string | null;
    targetMfaId: string | null;
    step: 'password' | 'complete' | null;
  }>({
    operation: null,
    verificationId: null,
    targetMfaId: null,
    step: null
  });
  const [mfaPassword, setMfaPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditingProfile) {
      setEditGivenName(userData.profile?.givenName || '');
      setEditFamilyName(userData.profile?.familyName || '');
      setEditUsername(userData.username || '');
    }
    if (!isEditingCustom) {
      setEditCustomData(JSON.stringify(userData.customData || {}, null, 2));
    }
    if (!isEditingAvatar) {
      setEditAvatarUrl(userData.avatar || '');
    }
    setVerificationState({ type: null, operation: null, step: null, verificationId: null, newValue: '' });
    setVerificationCode('');
    setIdentityVerificationId(null);
    setPasswordForVerification('');
  }, [userData, isEditingProfile, isEditingCustom, isEditingAvatar]);

  const getInitials = useCallback((data: any): string => {
    if (!data) return '?';
    if (data.profile?.givenName && data.profile?.familyName) {
      return `${data.profile.givenName[0]}${data.profile.familyName[0]}`.toUpperCase();
    }
    if (data.name) {
      const parts = data.name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return parts[0][0]?.toUpperCase() || '?';
    }
    if (data.username) {
      return data.username[0]?.toUpperCase() || '?';
    }
    return '?';
  }, []);

  const copyToClipboard = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setCopiedStates(prev => ({ ...prev, [key]: false })), 1200);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const formatDate = useCallback((timestamp?: number | string) => {
    if (!timestamp) return 'N/A';
    try {
      let date: Date;
      if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else {
        if (timestamp < 1e12) {
          date = new Date(timestamp * 1000);
        } else {
          date = new Date(timestamp);
        }
      }
      
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      return date.toLocaleString('en-US', options);
    } catch {
      return 'Invalid Date';
    }
  }, []);

  const validateJson = useCallback((jsonString: string): { valid: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return { valid: false, error: 'Must be a JSON object' };
      }
      return { valid: true };
    } catch (e) {
      return { valid: false, error: e instanceof Error ? e.message : 'Invalid JSON' };
    }
  }, []);

  const showSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  }, []);

  const isJwt = accessToken.split('.').length === 3;
  const tokenPrefix = isJwt ? 'JWT' : 'OPAQUE';

  // Email/Phone verification (unchanged from your working code)
  const startVerification = useCallback((type: 'email' | 'phone', currentValue?: string) => {
    setVerificationState({
      type,
      operation: currentValue ? 'edit' : 'add',
      step: 'password',
      verificationId: null,
      newValue: currentValue || ''
    });
    setPasswordForVerification('');
    setVerificationCode('');
    setIdentityVerificationId(null);
  }, []);

  const handleRemoveEmail = useCallback(async () => {
    if (!userData.primaryEmail) return;
    if (!confirm(`Remove email ${userData.primaryEmail}?`)) return;
    
    setVerificationState({
      type: 'email',
      operation: 'remove',
      step: 'password',
      verificationId: null,
      newValue: ''
    });
    setPasswordForVerification('');
    setVerificationCode('');
    setIdentityVerificationId(null);
  }, [userData.primaryEmail]);

  const handleVerifyPassword = useCallback(async () => {
    if (!passwordForVerification) {
      showError('Password required');
      return;
    }

    setLoading(true);
    try {
      const identityResponse = await actionProps.onVerifyPassword(passwordForVerification);
      const identityId = identityResponse.verificationRecordId;
      setIdentityVerificationId(identityId);
      
      if (verificationState.operation === 'remove') {
        await actionProps.onRemoveEmail(identityId);
        showSuccess('Email removed successfully');
        setIsEditingProfile(false);
        cancelVerification();
        await loadData();
        return;
      }
      
      if (verificationState.type === 'email' && verificationState.newValue) {
        const response = await actionProps.onSendEmailVerification(verificationState.newValue);
        setVerificationState(prev => ({ ...prev, step: 'code', verificationId: response.verificationId }));
        showSuccess(`Code sent to ${verificationState.newValue}`);
      } else if (verificationState.type === 'phone' && verificationState.newValue) {
        const response = await actionProps.onSendPhoneVerification(verificationState.newValue);
        setVerificationState(prev => ({ ...prev, step: 'code', verificationId: response.verificationId }));
        showSuccess(`Code sent to ${verificationState.newValue}`);
      }

    } catch (err) {
      showError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }, [passwordForVerification, verificationState, actionProps, showSuccess, showError, loadData]);

  const handleVerifyCodeAndUpdate = useCallback(async () => {
    if (!verificationCode) {
      showError('Enter verification code');
      return;
    }

    if (!identityVerificationId) {
      showError('Session expired, please verify again');
      cancelVerification();
      return;
    }

    if (!verificationState.verificationId) {
      showError('No verification ID found');
      return;
    }

    setLoading(true);
    try {
      if (verificationState.type === 'email') {
        const { verificationRecordId: newEmailId } = await actionProps.onVerifyCode(
          'email',
          verificationState.newValue,
          verificationState.verificationId,
          verificationCode
        );
        await actionProps.onUpdateEmail(verificationState.newValue, newEmailId, identityVerificationId);
        showSuccess('Email updated successfully');
      } else if (verificationState.type === 'phone') {
        const { verificationRecordId: newPhoneId } = await actionProps.onVerifyCode(
          'phone',
          verificationState.newValue,
          verificationState.verificationId,
          verificationCode
        );
        await actionProps.onUpdatePhone(verificationState.newValue, newPhoneId, identityVerificationId);
        showSuccess('Phone updated successfully');
      }

      cancelVerification();
      setIsEditingProfile(false);
      await loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  }, [verificationCode, identityVerificationId, verificationState, actionProps, showSuccess, showError, loadData]);

  const handleProfileUpdate = useCallback(async () => {
    setLoading(true);
    try {
      const name = `${editGivenName} ${editFamilyName}`.trim();
      const basicInfoUpdates: any = {};
      
      if (editUsername && editUsername !== userData?.username) {
        basicInfoUpdates.username = editUsername;
      }
      
      if (name && name !== userData?.name) {
        basicInfoUpdates.name = name;
      }
      
      if (Object.keys(basicInfoUpdates).length > 0) {
        await actionProps.onUpdateBasicInfo(basicInfoUpdates);
      }
      
      await actionProps.onUpdateProfile({
        givenName: editGivenName,
        familyName: editFamilyName
      });
      
      showSuccess('Profile updated successfully');
      setIsEditingProfile(false);
      await loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  }, [editGivenName, editFamilyName, editUsername, userData, actionProps, showSuccess, showError, loadData]);

  const handleCustomDataUpdate = useCallback(async () => {
    setLoading(true);
    
    try {
      const validation = validateJson(editCustomData);
      if (!validation.valid) {
        showError(`Invalid JSON: ${validation.error}`);
        return;
      }
      
      const parsed = JSON.parse(editCustomData);
      await actionProps.onUpdateCustomData(parsed);
      showSuccess('Custom data updated successfully');
      setIsEditingCustom(false);
      await loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  }, [editCustomData, actionProps, showSuccess, showError, loadData, validateJson]);

  const handleAvatarUrlUpdate = useCallback(async () => {
    setLoading(true);
    try {
      await actionProps.onUpdateAvatarUrl(editAvatarUrl);
      showSuccess('Avatar URL updated successfully');
      setIsEditingAvatar(false);
      await loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Avatar update failed');
    } finally {
      setLoading(false);
    }
  }, [editAvatarUrl, actionProps, showSuccess, showError, loadData]);

  // FIXED: MFA Management Functions with identity verification

  const loadMfaVerifications = useCallback(async () => {
    setMfaLoading(true);
    try {
      const verifications = await actionProps.onGetMfaVerifications();
      setMfaVerifications(verifications);
      setMfaError(null);
    } catch (err) {
      console.error('Load MFA error:', err);
      setMfaError(err instanceof Error ? err.message : 'Failed to load MFA data');
    } finally {
      setMfaLoading(false);
    }
  }, [actionProps]);

  // FIXED: Start TOTP enrollment - set password step
  const handleStartTotpEnrollment = useCallback(() => {
    setMfaVerificationState({
      operation: 'add-totp',
      verificationId: null,
      targetMfaId: null,
      step: 'password'
    });
    setMfaPassword('');
    setTotpSecret(null);
    setTotpVerificationCode('');
  }, []);

  // FIXED: Password verification for MFA operations including view-backup
  const handleVerifyPasswordForMfa = useCallback(async () => {
    if (!mfaPassword) {
      showError('Password required');
      return;
    }

    setMfaLoading(true);
    try {
      const identityResponse = await actionProps.onVerifyPassword(mfaPassword);
      const identityId = identityResponse.verificationRecordId;
      
      if (mfaVerificationState.operation === 'add-totp') {
        // Generate TOTP secret after password verification
        const secret = await actionProps.onGenerateTotpSecret();
        setTotpSecret(secret);
        setMfaVerificationState(prev => ({ 
          ...prev, 
          verificationId: identityId,
          step: 'complete' 
        }));
        setMfaError(null);
      } else if (mfaVerificationState.operation === 'generate-backup') {
        // Generate backup codes after password verification
        const result = await actionProps.onGenerateBackupCodes(identityId);
        setBackupCodes(result.codes);
        setShowBackupCodes(true);
        setMfaVerificationState(prev => ({ 
          ...prev, 
          verificationId: identityId,
          step: 'complete' 
        }));
        showSuccess('Backup codes generated! Save them now - they won\'t be shown again.');
      } else if (mfaVerificationState.operation === 'view-backup') {
        // FIXED: Fetch existing backup codes after password verification
        const result = await actionProps.onGetBackupCodes(identityId);
        setBackupCodes(result.codes.map(c => c.code));
        setShowBackupCodes(true);
        setMfaVerificationState(prev => ({ 
          ...prev, 
          verificationId: identityId,
          step: 'complete' 
        }));
        setMfaError(null);
      } else if (mfaVerificationState.operation === 'delete-mfa' && mfaVerificationState.targetMfaId) {
        // Delete MFA factor after password verification
        await actionProps.onDeleteMfaVerification(
          mfaVerificationState.targetMfaId,
          identityId
        );
        showSuccess('MFA factor removed successfully');
        setMfaVerificationState({ operation: null, verificationId: null, targetMfaId: null, step: null });
        setMfaPassword('');
        await loadMfaVerifications();
      }

    } catch (err) {
      showError(err instanceof Error ? err.message : 'Verification failed');
      setMfaVerificationState({ operation: null, verificationId: null, targetMfaId: null, step: null });
    } finally {
      setMfaLoading(false);
    }
  }, [mfaPassword, mfaVerificationState, actionProps, showSuccess, showError, loadMfaVerifications]);

  // FIXED: Complete TOTP enrollment with identity verification ID
  const handleCompleteTotpEnrollment = useCallback(async () => {
    if (!totpSecret || !totpVerificationCode || !mfaVerificationState.verificationId) {
      showError('Missing verification code or session expired');
      return;
    }

    setMfaLoading(true);
    try {
      // FIXED: Pass identityVerificationRecordId as 3rd parameter
      await actionProps.onAddMfaVerification(
        'Totp', 
        {
          secret: totpSecret.secret,
          code: totpVerificationCode
        },
        mfaVerificationState.verificationId  // CRITICAL: Required for authorization
      );
      
      showSuccess('TOTP enrolled successfully');
      setMfaVerificationState({ operation: null, verificationId: null, targetMfaId: null, step: null });
      setTotpSecret(null);
      setTotpVerificationCode('');
      setMfaPassword('');
      await loadMfaVerifications();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'TOTP verification failed');
    } finally {
      setMfaLoading(false);
    }
  }, [totpSecret, totpVerificationCode, mfaVerificationState.verificationId, actionProps, showSuccess, showError, loadMfaVerifications]);

  // BACKUP CODE DOWNLOAD FUNCTIONS
  const downloadBackupCodesTxt = useCallback(() => {
    if (!backupCodes) return;
    
    const timestamp = new Date().toISOString().split('T')[0];
    const content = `BACKUP CODES - Generated ${timestamp}
Save these codes in a secure location. Each code can only be used once.

${backupCodes.map((code, idx) => `${idx + 1}. ${code}`).join('\n')}

Instructions:
- Each code is single-use
- Store this file securely (password manager, encrypted drive)
- Do not share these codes
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${userData.id.slice(0, 8)}-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('Backup codes downloaded as .txt file');
  }, [backupCodes, userData.id, showSuccess]);

  const downloadBackupCodesHtml = useCallback(() => {
    if (!backupCodes) return;
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    // FIXED: Simplified HTML content without security warnings
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Backup Codes</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: 'Courier New', monospace;
      background: #0a0a0a;
      color: #d1d5db;
      padding: 20px;
      margin: 0;
      min-height: 100vh;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      background: #050505;
      border: 1px solid #374151;
      border-radius: 8px;
    }
    .header h1 {
      color: #86efac;
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .codes-container {
      background: #050505;
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .codes-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    @media (max-width: 768px) {
      .codes-grid {
        grid-template-columns: 1fr;
      }
    }
    .code-item {
      display: flex;
      align-items: center;
      padding: 12px;
      background: #1a1a1a;
      border: 1px solid #374151;
      border-radius: 4px;
      transition: all 0.2s;
    }
    .code-item:hover {
      border-color: #86efac;
      box-shadow: 0 0 8px rgba(134, 239, 172, 0.3);
    }
    .code-number {
      font-weight: bold;
      color: #6b7280;
      width: 40px;
      font-size: 14px;
    }
    .code-value {
      flex: 1;
      font-size: 16px;
      font-weight: bold;
      color: #86efac;
      letter-spacing: 2px;
      font-family: 'Courier New', monospace;
    }
    .copy-btn {
      padding: 6px 12px;
      background: #1a1a1a;
      color: #9ca3af;
      border: 1px solid #374151;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .copy-btn:hover {
      background: #374151;
      color: #d1d5db;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding: 20px;
      background: #050505;
      border: 1px solid #374151;
      border-radius: 8px;
      font-size: 12px;
      color: #6b7280;
    }
    .user-id {
      font-family: monospace;
      color: #9ca3af;
      margin-top: 10px;
    }
    .info {
      color: #9ca3af;
      font-size: 12px;
      margin-bottom: 15px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔐 BACKUP CODES</h1>
    <p>Generated on ${new Date().toLocaleString()}</p>
    <div class="user-id">User ID: ${userData.id}</div>
  </div>
  
  <div class="codes-container">
    <div class="info">Each code can be used only once.</div>
    <div class="codes-grid">
      ${backupCodes.map((code, idx) => `
        <div class="code-item">
          <span class="code-number">${idx + 1}.</span>
          <span class="code-value" id="code-${idx}">${code}</span>
          <button class="copy-btn" onclick="copyCode('code-${idx}', event)">COPY</button>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="footer">
    <p><strong>Logto Debug Dashboard</strong> v3.4</p>
    <p>User: ${userData.primaryEmail || userData.username || userData.id}</p>
  </div>

  <script>
    // Copy function for backup codes
    function copyCode(elementId, event) {
      const codeElement = document.getElementById(elementId);
      const code = codeElement.textContent;
      navigator.clipboard.writeText(code).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = 'COPIED!';
        btn.style.background = '#86efac';
        btn.style.color = '#000';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
          btn.style.color = '';
        }, 1200);
      }).catch(err => {
        alert('Copy failed: ' + err);
      });
    }
  </script>
</body>
</html>
`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${userData.id.slice(0, 8)}-${timestamp}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('Backup codes downloaded as styled .html file');
  }, [backupCodes, userData.id, showSuccess]);

  // FIXED: View backup codes now requires password verification
  const handleViewBackupCodes = useCallback(() => {
    setMfaVerificationState({ 
      operation: 'view-backup', 
      verificationId: null, 
      targetMfaId: null, 
      step: 'password' 
    });
    setMfaPassword('');
  }, []);

  const cancelMfaOperation = useCallback(() => {
    setMfaVerificationState({ operation: null, verificationId: null, targetMfaId: null, step: null });
    setMfaPassword('');
    setTotpSecret(null);
    setTotpVerificationCode('');
    setBackupCodes(null);
    setShowBackupCodes(false);
  }, []);

  const cancelVerification = useCallback(() => {
    setVerificationState({ type: null, operation: null, step: null, verificationId: null, newValue: '' });
    setVerificationCode('');
    setIdentityVerificationId(null);
    setPasswordForVerification('');
  }, []);

  const tabs = [
    { id: 'basic', label: 'USER', icon: '>' },
    { id: 'custom', label: 'CUSTOM', icon: '>' },
    { id: 'identities', label: 'IDENTITIES', icon: '>' },
    { id: 'organizations', label: 'ORGS', icon: '>' },
    { id: 'raw', label: 'RAW', icon: '>' },
    { id: 'mfa', label: 'MFA', icon: '>' }
  ];

  useEffect(() => {
    return () => {
      setMfaVerificationState({ operation: null, verificationId: null, targetMfaId: null, step: null });
      setMfaPassword('');
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'mfa') {
      loadMfaVerifications();
    }
  }, [activeTab]);

  return (
    <div className={ibmPlexMono.className} style={{ 
      padding: '12px', 
      maxWidth: '100vw',
      margin: '0',
      backgroundColor: themeStyles.bgPage,
      color: themeStyles.textPrimary,
      minHeight: '100vh',
      boxSizing: 'border-box',
      fontWeight: themeStyles.fontWeight
    }}>
      
      {/* Header */}
      <div style={{ 
        background: themeStyles.bgSecondary, 
        border: `1px solid ${themeStyles.borderColor}`,
        borderRadius: '6px', 
        marginBottom: '16px',
        overflow: 'hidden'
      }}>
        <div style={{
          background: themeStyles.bgPrimary,
          padding: '10px 16px',
          borderBottom: `1px solid ${themeStyles.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '12px', color: themeStyles.textTertiary }}>
            user@logto-debug:~$ sudo userinfo --verbose --edit
          </span>
        </div>

        <div style={{ padding: '14px', background: themeStyles.bgPrimary }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: themeStyles.textTertiary }}>
              [LOGTO_DEBUG_DASHBOARD v3.4]
            </span>
            <span style={{ fontSize: '11px', color: themeStyles.textTertiary, fontWeight: 'bold' }}>
              SESSION: {userData.id.substring(0, 12)}...
            </span>
            {loading && <span style={{ fontSize: '11px', color: themeStyles.accentYellow }}>[PROCESSING...]</span>}
          </div>

          {error && (
            <div style={{ 
              background: themeStyles.errorBg, 
              border: `1px solid ${themeStyles.accentRed}`, 
              borderRadius: '5px',
              padding: '10px', 
              marginBottom: '10px', 
              color: themeStyles.accentRed,
              fontSize: '12px'
            }}>
              [ERROR] {error}
            </div>
          )}
          {success && (
            <div style={{ 
              background: themeStyles.successBg, 
              border: `1px solid ${themeStyles.accentGreen}`, 
              borderRadius: '5px',
              padding: '10px', 
              marginBottom: '10px', 
              color: themeStyles.accentGreen,
              fontSize: '12px'
            }}>
              [SUCCESS] {success}
            </div>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '320px 1fr', 
        gap: '16px',
        alignItems: 'start',
        maxHeight: 'calc(100vh - 140px)',
        overflow: 'hidden'
      }}>
        
        {/* Left Stack */}
        <div style={{ 
          border: `1px solid ${themeStyles.borderColor}`,
          borderRadius: '6px',
          padding: '14px',
          background: themeStyles.bgSecondary,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: 'calc(100vh - 140px)',
          overflowY: 'auto'
        }}>
          
          {/* Avatar Card */}
          <div style={{ 
            padding: '18px', 
            background: themeStyles.bgPrimary,
            border: `1px solid ${themeStyles.borderColor}`,
            borderRadius: '5px'
          }}>
            <div style={{ color: themeStyles.textTertiary, fontSize: '10px', marginBottom: '12px' }}>PROFILE AVATAR</div>
            
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '14px' }}>
              <div style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '50%',
                border: `2px solid ${themeStyles.borderColor}`,
                background: themeStyles.bgTertiary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                color: themeStyles.textTertiary
              }}>
                {getInitials(userData)}
              </div>

              <div style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '50%',
                border: `2px solid ${themeStyles.borderColor}`,
                background: userData.avatar ? 'transparent' : themeStyles.bgTertiary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {userData.avatar ? (
                  <img 
                    src={userData.avatar} 
                    alt="Avatar" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <div style={{ fontSize: '14px', color: themeStyles.textTertiary, textAlign: 'center' }}>
                    NO<br />AVATAR
                  </div>
                )}
              </div>
            </div>

            {!isEditingAvatar ? (
              <>
                <div style={{ 
                  color: themeStyles.textTertiary, 
                  fontSize: '10px', 
                  wordBreak: 'break-all',
                  marginBottom: '10px',
                  textAlign: 'center'
                }}>
                  {userData.avatar ? userData.avatar.substring(0, 40) + '...' : 'No avatar URL'}
                </div>
                <button
                  onClick={() => setIsEditingAvatar(true)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: themeStyles.bgTertiary,
                    color: themeStyles.textPrimary,
                    border: `1px solid ${themeStyles.borderColor}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  [EDIT AVATAR URL]
                </button>
              </>
            ) : (
              <div>
                <input
                  type="text"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginBottom: '10px',
                    background: themeStyles.bgPrimary,
                    border: `1px solid ${themeStyles.borderColor}`,
                    borderRadius: '4px',
                    color: themeStyles.textPrimary,
                    fontSize: '11px'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleAvatarUrlUpdate}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '7px',
                      background: '#059669',
                      color: '#fff',
                      border: `1px solid #059669`,
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'cursor',
                      fontSize: '11px'
                    }}
                  >
                    {loading ? '[...]' : '[SAVE]'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingAvatar(false);
                      setEditAvatarUrl(userData.avatar || '');
                    }}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '7px',
                      background: themeStyles.bgTertiary,
                      color: themeStyles.textPrimary,
                      border: `1px solid ${themeStyles.borderColor}`,
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'cursor',
                      fontSize: '11px'
                    }}
                  >
                    [CANCEL]
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Token Card */}
          <div>
            <div style={{ color: themeStyles.textTertiary, fontSize: '10px', marginBottom: '6px' }}>{tokenPrefix}_TOKEN</div>
            <TruncatedToken token={accessToken} themeStyles={themeStyles} />
          </div>

          {/* User ID Card */}
          <div style={{ 
            padding: '10px', 
            background: themeStyles.bgPrimary,
            border: `1px solid ${themeStyles.borderColor}`,
            borderRadius: '4px'
          }}>
            <div style={{ color: themeStyles.textTertiary, fontSize: '10px', marginBottom: '6px' }}>USER_ID</div>
            <div style={{ color: themeStyles.textPrimary, fontSize: '12px', wordBreak: 'break-all' }}>
              {userData.id}
            </div>
          </div>

          {/* Last Login Card */}
          <div style={{ 
            padding: '10px', 
            background: themeStyles.bgPrimary,
            border: `1px solid ${themeStyles.borderColor}`,
            borderRadius: '4px'
          }}>
            <div style={{ color: themeStyles.textTertiary, fontSize: '10px', marginBottom: '6px' }}>LAST_LOGIN</div>
            <div style={{ color: themeStyles.textPrimary, fontSize: '12px' }}>
              {formatDate(userData.lastSignInAt)}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ 
            padding: '14px', 
            background: themeStyles.bgPrimary,
            border: `1px solid ${themeStyles.borderColor}`,
            borderRadius: '4px',
            display: 'flex',
            gap: '10px'
          }}>
            <button
              onClick={toggleTheme}
              style={{
                flex: 1,
                padding: '8px',
                background: themeStyles.bgTertiary,
                color: themeStyles.textPrimary,
                border: `1px solid ${themeStyles.borderColor}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              [{theme === 'dark' ? 'LIGHT' : 'DARK'} MODE]
            </button>
            <button
              onClick={async () => {
                await actionProps.onSignOut();
              }}
              style={{
                flex: 1,
                padding: '8px',
                background: themeStyles.accentRed,
                color: '#fee2e2',
                border: `1px solid ${themeStyles.accentRed}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              [SIGN OUT]
            </button>
          </div>
        </div>

        {/* Right Data Panel */}
        <div style={{ 
          border: `1px solid ${themeStyles.borderColor}`,
          borderRadius: '6px',
          overflow: 'hidden',
          background: themeStyles.bgSecondary,
          maxHeight: 'calc(100vh - 140px)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          {/* Tabs */}
          <div style={{ 
            display: 'flex', 
            borderBottom: `1px solid ${themeStyles.borderColor}`,
            background: themeStyles.bgPrimary
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: activeTab === tab.id ? themeStyles.bgSecondary : themeStyles.bgPrimary,
                  color: activeTab === tab.id ? themeStyles.textPrimary : themeStyles.textTertiary,
                  border: 'none',
                  borderRight: `1px solid ${themeStyles.borderColor}`,
                  borderBottom: activeTab === tab.id ? `2px solid ${themeStyles.accentGreen}` : 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  outline: 'none',
                  transition: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ 
            padding: '14px', 
            background: themeStyles.bgPrimary,
            overflowY: 'auto',
            flex: 1
          }}>
            {activeTab === 'basic' && (
              <div>
                {!isEditingProfile ? (
                  <>
                    <CodeBox 
                      title="USER PROFILE" 
                      data={{
                        id: userData.id,
                        username: userData.username,
                        name: userData.name,
                        profile: {
                          givenName: userData.profile?.givenName,
                          familyName: userData.profile?.familyName
                        },
                        primaryEmail: userData.primaryEmail,
                        primaryPhone: userData.primaryPhone,
                        avatar: userData.avatar,
                        lastSignInAt: userData.lastSignInAt,
                        createdAt: userData.createdAt,
                        updatedAt: userData.updatedAt
                      }}
                      copyKey="basic" 
                      onCopy={copyToClipboard}
                      themeStyles={themeStyles}
                    />
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      style={{
                        marginTop: '12px',
                        padding: '8px 16px',
                        background: themeStyles.bgTertiary,
                        color: themeStyles.textPrimary,
                        border: `1px solid ${themeStyles.borderColor}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      [EDIT PROFILE]
                    </button>
                  </>
                ) : (
                  <div style={{ 
                    border: `1px solid ${themeStyles.borderColor}`,
                    borderRadius: '5px',
                    padding: '16px',
                    background: themeStyles.bgSecondary
                  }}>
                    <div style={{ color: themeStyles.textTertiary, fontSize: '12px', marginBottom: '16px' }}>
                      EDITING PROFILE
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', color: themeStyles.textSecondary, fontSize: '11px', marginBottom: '6px' }}>
                          GIVEN NAME
                        </label>
                        <input
                          type="text"
                          value={editGivenName}
                          onChange={(e) => setEditGivenName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            background: themeStyles.bgPrimary,
                            border: `1px solid ${themeStyles.borderColor}`,
                            borderRadius: '4px',
                            color: themeStyles.textPrimary,
                            fontSize: '12px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', color: themeStyles.textSecondary, fontSize: '11px', marginBottom: '6px' }}>
                          FAMILY NAME
                        </label>
                        <input
                          type="text"
                          value={editFamilyName}
                          onChange={(e) => setEditFamilyName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            background: themeStyles.bgPrimary,
                            border: `1px solid ${themeStyles.borderColor}`,
                            borderRadius: '4px',
                            color: themeStyles.textPrimary,
                            fontSize: '12px'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', color: themeStyles.textSecondary, fontSize: '11px', marginBottom: '6px' }}>
                        USERNAME
                      </label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        placeholder="Enter username (optional)"
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: themeStyles.bgPrimary,
                          border: `1px solid ${themeStyles.borderColor}`,
                          borderRadius: '4px',
                          color: themeStyles.textPrimary,
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    {/* EMAIL FIELD */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', color: themeStyles.textSecondary, fontSize: '11px', marginBottom: '6px' }}>
                        EMAIL
                      </label>
                      
                      {verificationState.type === 'email' ? (
                        <div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                            <input
                              type="email"
                              value={verificationState.newValue}
                              onChange={(e) => setVerificationState(prev => ({ ...prev, newValue: e.target.value }))}
                              placeholder={
                                verificationState.operation === 'remove' 
                                  ? userData.primaryEmail || 'null' 
                                  : userData.primaryEmail ? "Enter new email" : "Enter email"
                              }
                              disabled={true}
                              style={{
                                flex: '2',
                                padding: '8px',
                                background: themeStyles.bgTertiary,
                                border: `1px solid ${themeStyles.borderColor}`,
                                borderRadius: '4px',
                                color: themeStyles.textTertiary,
                                fontSize: '12px'
                              }}
                            />
                            
                            {verificationState.step === 'password' ? (
                              <input
                                type="password"
                                value={passwordForVerification}
                                onChange={(e) => setPasswordForVerification(e.target.value)}
                                placeholder="Password"
                                style={{
                                  flex: '1',
                                  padding: '8px',
                                  background: themeStyles.bgPrimary,
                                  border: `1px solid ${themeStyles.borderColor}`,
                                  borderRadius: '4px',
                                  color: themeStyles.textPrimary,
                                  fontSize: '12px'
                                }}
                              />
                            ) : (
                              <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                placeholder="Code"
                                style={{
                                  flex: '1',
                                  padding: '8px',
                                  background: themeStyles.bgPrimary,
                                  border: `1px solid ${themeStyles.borderColor}`,
                                  borderRadius: '4px',
                                  color: themeStyles.textPrimary,
                                  fontSize: '12px'
                                }}
                              />
                            )}
                            
                            <button
                              onClick={verificationState.step === 'code' ? handleVerifyCodeAndUpdate : handleVerifyPassword}
                              disabled={loading}
                              style={{
                                padding: '8px 12px',
                                background: themeStyles.accentYellow,
                                color: '#000',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px'
                              }}
                            >
                              {loading ? '[...]' : verificationState.step === 'code' ? '[VERIFY CODE]' : '[VERIFY PASS]'}
                            </button>
                            
                            <button
                              onClick={cancelVerification}
                              disabled={loading}
                              style={{
                                padding: '8px 12px',
                                background: themeStyles.bgTertiary,
                                color: themeStyles.textPrimary,
                                border: `1px solid ${themeStyles.borderColor}`,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px'
                              }}
                            >
                              [CANCEL]
                            </button>
                          </div>
                          {verificationState.operation === 'remove' && (
                            <div style={{ color: themeStyles.textTertiary, fontSize: '10px', marginTop: '4px' }}>
                              Removing: {userData.primaryEmail || 'null'}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ 
                            flex: 1, 
                            padding: '8px', 
                            background: themeStyles.bgPrimary,
                            border: `1px solid ${themeStyles.borderColor}`,
                            borderRadius: '4px',
                            color: userData.primaryEmail ? themeStyles.textPrimary : themeStyles.textTertiary,
                            fontSize: '12px'
                          }}>
                            {userData.primaryEmail || 'null'}
                          </div>
                          
                          {userData.primaryEmail ? (
                            <>
                              <button
                                onClick={() => startVerification('email', userData.primaryEmail)}
                                style={{
                                  padding: '8px 12px',
                                  background: themeStyles.bgTertiary,
                                  color: themeStyles.textPrimary,
                                  border: `1px solid ${themeStyles.borderColor}`,
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                              >
                                [EDIT]
                              </button>
                              <button
                                onClick={handleRemoveEmail}
                                style={{
                                  padding: '8px 12px',
                                  background: themeStyles.accentRed,
                                  color: '#fee2e2',
                                  border: `1px solid ${themeStyles.accentRed}`,
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '11px'
                                }}
                              >
                                [REMOVE]
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startVerification('email')}
                              style={{
                                padding: '8px 12px',
                                background: themeStyles.bgTertiary,
                                color: themeStyles.textPrimary,
                                border: `1px solid ${themeStyles.borderColor}`,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px'
                              }}
                            >
                              [ADD]
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* PHONE FIELD */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', color: themeStyles.textSecondary, fontSize: '11px', marginBottom: '6px' }}>
                        PHONE
                      </label>
                      
                      {verificationState.type === 'phone' ? (
                        <div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                            <input
                              type="tel"
                              value={verificationState.newValue}
                              onChange={(e) => setVerificationState(prev => ({ ...prev, newValue: e.target.value }))}
                              placeholder={userData.primaryPhone ? "Enter new phone" : "Enter phone"}
                              disabled={verificationState.step === 'code'}
                              style={{
                                flex: '2',
                                padding: '8px',
                                background: verificationState.step === 'code' ? themeStyles.bgTertiary : themeStyles.bgPrimary,
                                border: `1px solid ${themeStyles.borderColor}`,
                                borderRadius: '4px',
                                color: verificationState.step === 'code' ? themeStyles.textTertiary : themeStyles.textPrimary,
                                fontSize: '12px'
                              }}
                            />
                            
                            {verificationState.step === 'password' ? (
                              <input
                                type="password"
                                value={passwordForVerification}
                                onChange={(e) => setPasswordForVerification(e.target.value)}
                                placeholder="Password"
                                style={{
                                  flex: '1',
                                  padding: '8px',
                                  background: themeStyles.bgPrimary,
                                  border: `1px solid ${themeStyles.borderColor}`,
                                  borderRadius: '4px',
                                  color: themeStyles.textPrimary,
                                  fontSize: '12px'
                                }}
                              />
                            ) : (
                              <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                placeholder="Code"
                                style={{
                                  flex: '1',
                                  padding: '8px',
                                  background: themeStyles.bgPrimary,
                                  border: `1px solid ${themeStyles.borderColor}`,
                                  borderRadius: '4px',
                                  color: themeStyles.textPrimary,
                                  fontSize: '12px'
                                }}
                              />
                            )}
                            
                            <button
                              onClick={verificationState.step === 'code' ? handleVerifyCodeAndUpdate : handleVerifyPassword}
                              disabled={loading}
                              style={{
                                padding: '8px 12px',
                                background: themeStyles.accentYellow,
                                color: '#000',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px'
                              }}
                            >
                              {loading ? '[...]' : verificationState.step === 'code' ? '[VERIFY CODE]' : '[VERIFY PASS]'}
                            </button>
                            
                            <button
                              onClick={cancelVerification}
                              disabled={loading}
                              style={{
                                padding: '8px 12px',
                                background: themeStyles.bgTertiary,
                                color: themeStyles.textPrimary,
                                border: `1px solid ${themeStyles.borderColor}`,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px'
                              }}
                            >
                              [CANCEL]
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ 
                            flex: 1, 
                            padding: '8px', 
                            background: themeStyles.bgPrimary,
                            border: `1px solid ${themeStyles.borderColor}`,
                            borderRadius: '4px',
                            color: userData.primaryPhone ? themeStyles.textPrimary : themeStyles.textTertiary,
                            fontSize: '12px'
                          }}>
                            {userData.primaryPhone || 'null'}
                          </div>
                          
                          <button
                            onClick={() => startVerification('phone', userData.primaryPhone || '')}
                            style={{
                              padding: '8px 12px',
                              background: themeStyles.bgTertiary,
                              color: themeStyles.textPrimary,
                              border: `1px solid ${themeStyles.borderColor}`,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            {userData.primaryPhone ? '[EDIT]' : '[ADD]'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={handleProfileUpdate}
                        disabled={loading}
                        style={{
                          padding: '10px 16px',
                          background: '#059669',
                          color: '#fff',
                          border: `1px solid #059669`,
                          borderRadius: '4px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        {loading ? '[SAVING...]' : '[SAVE PROFILE]'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingProfile(false);
                          cancelVerification();
                        }}
                        disabled={loading}
                        style={{
                          padding: '10px 16px',
                          background: themeStyles.bgTertiary,
                          color: themeStyles.textPrimary,
                          border: `1px solid ${themeStyles.borderColor}`,
                          borderRadius: '4px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        [CANCEL]
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'custom' && (
              <div>
                {!isEditingCustom ? (
                  <>
                    {userData.customData && Object.keys(userData.customData).length > 0 ? (
                      <CodeBox 
                        title="CUSTOM DATA" 
                        data={userData.customData} 
                        copyKey="custom" 
                        onCopy={copyToClipboard}
                        themeStyles={themeStyles}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px', color: themeStyles.textTertiary }}>
                        <div style={{ fontSize: '14px', marginBottom: '8px' }}>[EMPTY]</div>
                        <div style={{ fontSize: '12px' }}>No custom data fields found</div>
                      </div>
                    )}
                    <button
                      onClick={() => setIsEditingCustom(true)}
                      style={{
                        marginTop: '12px',
                        padding: '8px 16px',
                        background: themeStyles.bgTertiary,
                        color: themeStyles.textPrimary,
                        border: `1px solid ${themeStyles.borderColor}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      [EDIT CUSTOM DATA]
                    </button>
                  </>
                ) : (
                  <div style={{ 
                    border: `1px solid ${themeStyles.borderColor}`,
                    borderRadius: '5px',
                    padding: '16px',
                    background: themeStyles.bgSecondary
                  }}>
                    <div style={{ color: themeStyles.textTertiary, fontSize: '12px', marginBottom: '16px' }}>
                      EDITING CUSTOM DATA
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', color: themeStyles.textSecondary, fontSize: '11px', marginBottom: '6px' }}>
                        JSON DATA
                      </label>
                      <textarea
                        value={editCustomData}
                        onChange={(e) => setEditCustomData(e.target.value)}
                        rows={12}
                        style={{
                          width: '100%',
                          padding: '10px',
                          background: themeStyles.bgPrimary,
                          border: `1px solid ${validateJson(editCustomData).valid ? themeStyles.borderColor : themeStyles.accentRed}`,
                          borderRadius: '4px',
                          color: themeStyles.textPrimary,
                          fontSize: '12px',
                          resize: 'vertical'
                        }}
                      />
                      {!validateJson(editCustomData).valid && (
                        <div style={{ 
                          color: themeStyles.accentRed, 
                          fontSize: '11px', 
                          marginTop: '6px'
                        }}>
                          [ERROR] {validateJson(editCustomData).error}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={handleCustomDataUpdate}
                        disabled={loading}
                        style={{
                          padding: '10px 16px',
                          background: '#059669',
                          color: '#fff',
                          border: `1px solid #059669`,
                          borderRadius: '4px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        {loading ? '[SAVING...]' : '[SAVE]'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingCustom(false);
                          setEditCustomData(JSON.stringify(userData.customData || {}, null, 2));
                        }}
                        disabled={loading}
                        style={{
                          padding: '10px 16px',
                          background: themeStyles.bgTertiary,
                          color: themeStyles.textPrimary,
                          border: `1px solid ${themeStyles.borderColor}`,
                          borderRadius: '4px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        [CANCEL]
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'identities' && (
              <div>
                {userData.identities && Object.keys(userData.identities).length > 0 ? (
                  <CodeBox 
                    title="IDENTITIES" 
                    data={userData.identities} 
                    copyKey="identities" 
                    onCopy={copyToClipboard}
                    themeStyles={themeStyles}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: themeStyles.textTertiary }}>
                    <div style={{ fontSize: '14px', marginBottom: '8px' }}>[EMPTY]</div>
                    <div style={{ fontSize: '12px' }}>No external identities linked</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'organizations' && (
              <div>
                {(userData.organizationRoles || []).length > 0 || (userData.organizations || []).length > 0 ? (
                  <>
                    <CodeBox 
                      title="ORGANIZATIONS" 
                      data={userData.organizations || []} 
                      copyKey="organizations" 
                      onCopy={copyToClipboard}
                      themeStyles={themeStyles}
                    />
                    {userData.organizationRoles && (
                      <CodeBox 
                        title="ORGANIZATION ROLES" 
                        data={userData.organizationRoles} 
                        copyKey="orgRoles" 
                        onCopy={copyToClipboard}
                        themeStyles={themeStyles}
                      />
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: themeStyles.textTertiary }}>
                    <div style={{ fontSize: '14px', marginBottom: '8px' }}>[EMPTY]</div>
                    <div style={{ fontSize: '12px' }}>No organization memberships</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'raw' && (
              <div>
                <CodeBox title="RAW USER DATA" data={userData} copyKey="raw" onCopy={copyToClipboard} themeStyles={themeStyles} />
              </div>
            )}

            {activeTab === 'mfa' && (
              <div>
                <div style={{ color: themeStyles.textTertiary, fontSize: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>MULTI-FACTOR AUTHENTICATION</span>
                  <button
                    onClick={loadMfaVerifications}
                    disabled={mfaLoading}
                    style={{
                      padding: '6px 12px',
                      background: themeStyles.bgTertiary,
                      color: themeStyles.textPrimary,
                      border: `1px solid ${themeStyles.borderColor}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    [REFRESH]
                  </button>
                </div>

                {mfaLoading && (
                  <div style={{ color: themeStyles.textTertiary, fontSize: '11px', marginBottom: '12px' }}>
                    [LOADING MFA DATA...]
                  </div>
                )}

                {mfaError && (
                  <div style={{ 
                    background: themeStyles.errorBg, 
                    border: `1px solid ${themeStyles.accentRed}`, 
                    borderRadius: '5px',
                    padding: '10px', 
                    marginBottom: '12px', 
                    color: themeStyles.accentRed,
                    fontSize: '12px'
                  }}>
                    [ERROR] {mfaError}
                  </div>
                )}

                {/* Current MFA Factors */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ color: themeStyles.textSecondary, fontSize: '11px', marginBottom: '10px' }}>ENROLLED FACTORS</div>
                  {mfaVerifications.length === 0 ? (
                    <div style={{ 
                      padding: '20px', 
                      textAlign: 'center', 
                      color: themeStyles.textTertiary,
                      background: themeStyles.bgSecondary,
                      border: `1px dashed ${themeStyles.borderColor}`,
                      borderRadius: '4px'
                    }}>
                        [NO MFA FACTORS ENROLLED]
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {mfaVerifications.map(v => (
                        <div key={v.id} style={{
                          padding: '12px',
                          background: themeStyles.bgSecondary,
                          border: `1px solid ${themeStyles.borderColor}`,
                          borderRadius: '4px'
                        }}>
                          {mfaVerificationState.targetMfaId === v.id && mfaVerificationState.step === 'password' ? (
                            <div style={{ 
                              padding: '10px',
                              background: themeStyles.bgPrimary,
                              border: `1px solid ${themeStyles.borderColor}`,
                              borderRadius: '3px'
                            }}>
                              <div style={{ color: themeStyles.textPrimary, fontSize: '11px', marginBottom: '8px', fontWeight: 'bold' }}>
                                VERIFY IDENTITY TO REMOVE {v.type}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                  type="password"
                                  value={mfaPassword}
                                  onChange={(e) => setMfaPassword(e.target.value)}
                                  placeholder="Enter password"
                                  style={{
                                    flex: 1,
                                    padding: '8px',
                                    background: themeStyles.bgPrimary,
                                    border: `1px solid ${themeStyles.borderColor}`,
                                    borderRadius: '4px',
                                    color: themeStyles.textPrimary,
                                    fontSize: '12px'
                                  }}
                                />
                                <button
                                  onClick={handleVerifyPasswordForMfa}
                                  disabled={mfaLoading}
                                  style={{
                                    padding: '8px 16px',
                                    background: themeStyles.accentYellow,
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px'
                                  }}
                                >
                                  {mfaLoading ? '[...]' : '[VERIFY]'}
                                </button>
                                <button
                                  onClick={cancelMfaOperation}
                                  style={{
                                    padding: '8px 16px',
                                    background: themeStyles.bgTertiary,
                                    color: themeStyles.textPrimary,
                                    border: `1px solid ${themeStyles.borderColor}`,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px'
                                  }}
                                >
                                  [CANCEL]
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ color: themeStyles.textPrimary, fontSize: '12px', fontWeight: 'bold' }}>
                                    {v.type}
                                    {v.name && <span style={{ color: themeStyles.textSecondary, marginLeft: '8px' }}>({v.name})</span>}
                                  </div>
                                  <div style={{ color: themeStyles.textTertiary, fontSize: '10px' }}>
                                    Created: {formatDate(v.createdAt)}
                                    {v.lastUsedAt && <span> | Last used: {formatDate(v.lastUsedAt)}</span>}
                                    {v.remainCodes !== undefined && <span> | Codes left: {v.remainCodes}</span>}
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove ${v.type} MFA factor?`)) {
                                      setMfaVerificationState({ 
                                        operation: 'delete-mfa', 
                                        verificationId: null, 
                                        targetMfaId: v.id, 
                                        step: 'password' 
                                      });
                                      setMfaPassword('');
                                    }
                                  }}
                                  style={{
                                    padding: '6px 10px',
                                    background: themeStyles.accentRed,
                                    color: '#fee2e2',
                                    border: `1px solid ${themeStyles.accentRed}`,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '10px'
                                  }}
                                >
                                  [REMOVE]
                                </button>
                              </div>
                              {v.agent && (
                                <div style={{ color: themeStyles.textTertiary, fontSize: '10px', marginTop: '4px' }}>
                                  Agent: {v.agent}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Enroll New Factors */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ color: themeStyles.textSecondary, fontSize: '11px', marginBottom: '10px' }}>ENROLL NEW FACTOR</div>
                  
                  {/* TOTP Enrollment */}
                  <div style={{
                    padding: '16px',
                    background: themeStyles.bgSecondary,
                    border: `1px solid ${themeStyles.borderColor}`,
                    borderRadius: '4px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ color: themeStyles.textPrimary, fontSize: '12px', marginBottom: '10px', fontWeight: 'bold' }}>
                      TOTP (Authenticator App)
                    </div>
                    
                    {mfaVerificationState.operation === 'add-totp' && mfaVerificationState.step === 'password' && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="password"
                            value={mfaPassword}
                            onChange={(e) => setMfaPassword(e.target.value)}
                            placeholder="Enter password to generate secret"
                            style={{
                              flex: 1,
                              padding: '8px',
                              background: themeStyles.bgPrimary,
                              border: `1px solid ${themeStyles.borderColor}`,
                              borderRadius: '4px',
                              color: themeStyles.textPrimary,
                              fontSize: '12px'
                            }}
                          />
                          <button
                            onClick={handleVerifyPasswordForMfa}
                            disabled={mfaLoading}
                            style={{
                              padding: '8px 16px',
                              background: themeStyles.accentYellow,
                              color: '#000',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            {mfaLoading ? '[...]' : '[VERIFY PASSWORD]'}
                          </button>
                          <button
                            onClick={cancelMfaOperation}
                            style={{
                              padding: '8px 16px',
                              background: themeStyles.bgTertiary,
                              color: themeStyles.textPrimary,
                              border: `1px solid ${themeStyles.borderColor}`,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            [CANCEL]
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {!totpSecret && !(mfaVerificationState.operation === 'add-totp' && mfaVerificationState.step === 'password') && (
                      <button
                        onClick={handleStartTotpEnrollment}
                        disabled={mfaLoading}
                        style={{
                          padding: '8px 16px',
                          background: themeStyles.bgTertiary,
                          color: themeStyles.textPrimary,
                          border: `1px solid ${themeStyles.borderColor}`,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        [GENERATE TOTP SECRET]
                      </button>
                    )}
                    
                    {totpSecret && mfaVerificationState.step === 'complete' && (
                      <div>
                        <div style={{ 
                          display: 'flex', 
                          gap: '16px', 
                          marginBottom: '12px',
                          alignItems: 'flex-start'
                        }}>
                          <div style={{ flexShrink: 0 }}>
                            {totpSecret.secretQrCode && totpSecret.secretQrCode.startsWith('data:image') ? (
                              <img 
                                src={totpSecret.secretQrCode} 
                                alt="TOTP QR Code"
                                style={{ 
                                  width: '200px',
                                  height: '200px',
                                  border: `1px solid ${themeStyles.borderColor}`,
                                  borderRadius: '4px',
                                  display: 'block'
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  setTotpSecret(prev => prev ? {...prev, secretQrCode: ''} : null);
                                }}
                              />
                            ) : (
                              <QRCodeSVG 
                                value={`otpauth://totp/Logto:${userData.primaryEmail || userData.id}?secret=${totpSecret.secret}&issuer=Logto`}
                                size={200}
                                style={{ 
                                  width: '200px',
                                  height: '200px',
                                  border: `1px solid ${themeStyles.borderColor}`,
                                  borderRadius: '4px',
                                  display: 'block'
                                }}
                              />
                            )}
                          </div>
                          
                          <div style={{ 
                            flex: 1, 
                            display: 'flex', 
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            height: '200px'
                          }}>
                            <div>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                marginBottom: '8px'
                              }}>
                                <div style={{ 
                                  color: themeStyles.textPrimary, 
                                  fontSize: '18px', 
                                  fontFamily: 'var(--font-ibm-plex-mono)',
                                  wordBreak: 'break-all',
                                  lineHeight: '1.4',
                                  flex: 1
                                }}>
                                  {totpSecret.secret}
                                </div>
                                <button
                                  onClick={() => copyToClipboard(totpSecret.secret, 'totp-secret')}
                                  style={{
                                    padding: '6px 12px',
                                    background: themeStyles.bgTertiary,
                                    color: themeStyles.textPrimary,
                                    border: `1px solid ${themeStyles.borderColor}`,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontFamily: 'var(--font-ibm-plex-mono)',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {copiedStates['totp-secret'] ? '[COPIED]' : '[COPY]'}
                                </button>
                              </div>
                              <div style={{ color: themeStyles.textTertiary, fontSize: '10px' }}>
                                Can't scan? Enter this secret manually in your authenticator app.
                              </div>
                            </div>
                            
                            <div>
                              <div style={{ 
                                display: 'flex', 
                                gap: '8px', 
                                alignItems: 'center',
                                marginBottom: '8px'
                              }}>
                                <input
                                  type="text"
                                  value={totpVerificationCode}
                                  onChange={(e) => setTotpVerificationCode(e.target.value)}
                                  placeholder="Enter 6-digit code from app"
                                  style={{
                                    flex: 1,
                                    padding: '8px',
                                    background: themeStyles.bgPrimary,
                                    border: `1px solid ${themeStyles.borderColor}`,
                                    borderRadius: '4px',
                                    color: themeStyles.textPrimary,
                                    fontSize: '12px'
                                  }}
                                />
                                <button
                                  onClick={handleCompleteTotpEnrollment}
                                  disabled={mfaLoading}
                                  style={{
                                    padding: '8px 16px',
                                    background: '#059669',
                                    color: '#fff',
                                    border: `1px solid #059669`,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {mfaLoading ? '[...]' : '[VERIFY & ENROLL]'}
                                </button>
                                <button
                                  onClick={() => {
                                    setTotpSecret(null);
                                    setTotpVerificationCode('');
                                    setMfaVerificationState({ operation: null, verificationId: null, targetMfaId: null, step: null });
                                  }}
                                  style={{
                                    padding: '8px 16px',
                                    background: themeStyles.bgTertiary,
                                    color: themeStyles.textPrimary,
                                    border: `1px solid ${themeStyles.borderColor}`,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  [CANCEL]
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Backup Codes */}
                  <div style={{
                    padding: '16px',
                    background: themeStyles.bgSecondary,
                    border: `1px solid ${themeStyles.borderColor}`,
                    borderRadius: '4px'
                  }}>
                    <div style={{ color: themeStyles.textPrimary, fontSize: '12px', marginBottom: '10px', fontWeight: 'bold' }}>
                      BACKUP CODES
                    </div>
                    
                    {mfaVerificationState.step === 'password' && (mfaVerificationState.operation === 'generate-backup' || mfaVerificationState.operation === 'view-backup') && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="password"
                            value={mfaPassword}
                            onChange={(e) => setMfaPassword(e.target.value)}
                            placeholder={`Enter password to ${mfaVerificationState.operation === 'generate-backup' ? 'generate' : 'view'} backup codes`}
                            style={{
                              flex: 1,
                              padding: '8px',
                              background: themeStyles.bgPrimary,
                              border: `1px solid ${themeStyles.borderColor}`,
                              borderRadius: '4px',
                              color: themeStyles.textPrimary,
                              fontSize: '12px'
                            }}
                          />
                          <button
                            onClick={handleVerifyPasswordForMfa}
                            disabled={mfaLoading}
                            style={{
                              padding: '8px 16px',
                              background: themeStyles.accentYellow,
                              color: '#000',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            {mfaLoading ? '[...]' : '[VERIFY PASSWORD]'}
                          </button>
                          <button
                            onClick={cancelMfaOperation}
                            style={{
                              padding: '8px 16px',
                              background: themeStyles.bgTertiary,
                              color: themeStyles.textPrimary,
                              border: `1px solid ${themeStyles.borderColor}`,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            [CANCEL]
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {!showBackupCodes && !(mfaVerificationState.step === 'password' && (mfaVerificationState.operation === 'generate-backup' || mfaVerificationState.operation === 'view-backup')) && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setMfaVerificationState({ 
                              operation: 'generate-backup', 
                              verificationId: null, 
                              targetMfaId: null, 
                              step: 'password' 
                            });
                            setMfaPassword('');
                            setBackupCodes(null);
                          }}
                          disabled={mfaLoading}
                          style={{
                            padding: '8px 16px',
                            background: themeStyles.bgTertiary,
                            color: themeStyles.textPrimary,
                            border: `1px solid ${themeStyles.borderColor}`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          [GENERATE NEW CODES]
                        </button>
                        {mfaVerifications.some(v => v.type === 'BackupCode') && (
                          <button
                            onClick={handleViewBackupCodes}
                            style={{
                              padding: '8px 16px',
                              background: themeStyles.bgSecondary,
                              color: themeStyles.textPrimary,
                              border: `1px solid ${themeStyles.borderColor}`,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            [VIEW EXISTING]
                          </button>
                        )}
                      </div>
                    )}
                    
                    {showBackupCodes && (
                      <div>
                        <div style={{
                          background: themeStyles.bgPrimary,
                          border: `1px solid ${themeStyles.borderColor}`,
                          borderRadius: '4px',
                          padding: '12px',
                          marginBottom: '10px'
                        }}>
                          <div style={{ color: themeStyles.textTertiary, fontSize: '10px', marginBottom: '8px' }}>
                            {mfaVerificationState.operation === 'generate-backup' 
                              ? 'SAVE THESE CODES - Each can be used only once:' 
                              : 'EXISTING BACKUP CODES:'
                            }
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {backupCodes?.map((code, idx) => (
                              <div key={idx} style={{
                                fontFamily: 'var(--font-ibm-plex-mono)',
                                fontSize: '11px',
                                color: themeStyles.textPrimary,
                                padding: '4px 6px',
                                background: themeStyles.bgSecondary,
                                borderRadius: '3px'
                              }}>
                                {code}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            onClick={downloadBackupCodesTxt}
                            style={{
                              padding: '8px 16px',
                              background: themeStyles.bgTertiary,
                              color: themeStyles.textPrimary,
                              border: `1px solid ${themeStyles.borderColor}`,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            [DOWNLOAD .TXT]
                          </button>
                          <button
                            onClick={downloadBackupCodesHtml}
                            style={{
                              padding: '8px 16px',
                              background: themeStyles.bgTertiary,
                              color: themeStyles.textPrimary,
                              border: `1px solid ${themeStyles.borderColor}`,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            [DOWNLOAD .HTML]
                          </button>
                          
                          {mfaVerificationState.operation === 'generate-backup' && (
                            <button
                              onClick={() => {
                                setShowBackupCodes(false);
                                setBackupCodes(null);
                                setMfaVerificationState({ operation: null, verificationId: null, targetMfaId: null, step: null });
                                showSuccess('Backup codes enrolled successfully');
                              }}
                              disabled={mfaLoading}
                              style={{
                                padding: '8px 16px',
                                background: '#059669',
                                color: '#fff',
                                border: `1px solid #059669`,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px'
                              }}
                            >
                              [FINISH & SAVE]
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setShowBackupCodes(false);
                              setBackupCodes(null);
                              setMfaVerificationState({ operation: null, verificationId: null, targetMfaId: null, step: null });
                            }}
                            style={{
                              padding: '8px 16px',
                              background: themeStyles.bgTertiary,
                              color: themeStyles.textPrimary,
                              border: `1px solid ${themeStyles.borderColor}`,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            [HIDE]
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* WebAuthn UI (placeholder) */}
                  <div style={{
                    padding: '16px',
                    background: themeStyles.bgSecondary,
                    border: `1px solid ${themeStyles.borderColor}`,
                    borderRadius: '4px'
                  }}>
                    <div style={{ color: themeStyles.textPrimary, fontSize: '12px', marginBottom: '10px', fontWeight: 'bold' }}>
                      WEBAUTHN (Passkey)
                    </div>
                    <div style={{ color: themeStyles.textTertiary, fontSize: '10px', marginBottom: '10px' }}>
                      WebAuthn enrollment requires browser API integration. Use device biometrics or security keys.
                    </div>
                    <button
                      onClick={() => alert('WebAuthn enrollment requires browser WebAuthn API integration. This is a debug UI - full implementation needs browser API handling.')}
                      disabled={mfaLoading}
                      style={{
                        padding: '8px 16px',
                        background: themeStyles.bgTertiary,
                        color: themeStyles.textPrimary,
                        border: `1px solid ${themeStyles.borderColor}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      [ENROLL WEBAUTHN]
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '12px', 
        padding: '8px', 
        color: themeStyles.textTertiary, 
        fontSize: '10px',
        background: themeStyles.bgSecondary,
        borderRadius: '4px',
        border: `1px solid ${themeStyles.borderColor}`
      }}>
        <div>
          [SYSTEM] This debug tool is barely an ALPHA. It itself may be a bug. Haaaave fuun.
        </div>
      </div>
    </div>
  );
}