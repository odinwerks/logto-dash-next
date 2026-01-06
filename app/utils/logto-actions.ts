'use server';

import { getAccessToken, getLogtoContext } from '@logto/next/server-actions';
import { logtoConfig } from '../logto';
import { cache } from 'react';

type DashboardSuccess = { 
  success: true; 
  userData: any; 
  accessToken: string;
};

type DashboardAuthError = { 
  success: false; 
  needsAuth: true; 
};

type DashboardFetchError = { 
  success: false; 
  error: string; 
};

type DashboardResult = DashboardSuccess | DashboardAuthError | DashboardFetchError;

// Memoized token getter - ensures same token throughout request
const getCachedToken = cache(async () => {
  const token = await getAccessToken(logtoConfig, '');
  if (!token) throw new Error('No access token available for Account API');
  return token;
});

function getCleanEndpoint() {
  const endpoint = process.env.ENDPOINT;
  if (!endpoint) {
    throw new Error(
      'ENDPOINT environment variable is missing! ' +
      'Set it in your .env.local file: ENDPOINT=https://auth.nebakoploba.org '
    );
  }
  return endpoint.replace(/\/$/, '');
}

export async function fetchDashboardData(): Promise<DashboardResult> {
  try {
    const { isAuthenticated } = await getLogtoContext(logtoConfig);
    if (!isAuthenticated) {
      return { success: false, needsAuth: true };
    }
    
    const token = await getCachedToken();
    const userData = await getUserDataFromLogto(token);
    
    return { 
      success: true, 
      userData, 
      accessToken: token 
    };
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

async function getUserDataFromLogto(token: string) {
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/my-account`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Logto API ${res.status}: ${errorText.substring(0, 200)}`);
  }

  return res.json();
}

export async function signOutUser() {
  const { signOut } = await import('@logto/next/server-actions');
  await signOut(logtoConfig);
}

export async function updateUserBasicInfo(updates: { 
  name?: string; 
  username?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  avatar?: string;
}) {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/my-account`;
  
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined && v !== '')
  );
  
  if (Object.keys(cleanUpdates).length === 0) return;
  
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cleanUpdates),
  });

  const responseText = await res.text();
  
  if (!res.ok) {
    throw new Error(`Basic info update failed ${res.status}: ${responseText.substring(0, 200)}`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return { success: true };
  }
}

export async function updateUserProfile(profile: {
  givenName?: string;
  familyName?: string;
}) {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/my-account/profile`;
  
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(profile),
  });

  const responseText = await res.text();
  
  if (!res.ok) {
    throw new Error(`Profile update failed ${res.status}: ${responseText.substring(0, 200)}`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return { success: true };
  }
}

export async function updateUserCustomData(customData: Record<string, any>) {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/my-account`;
  
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ customData }),
  });

  const responseText = await res.text();
  
  if (!res.ok) {
    throw new Error(`Custom data update failed ${res.status}: ${responseText.substring(0, 200)}`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return { success: true };
  }
}

export async function updateAvatarUrl(avatarUrl: string) {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/my-account`;
  
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ avatar: avatarUrl }),
  });

  const responseText = await res.text();
  
  if (!res.ok) {
    throw new Error(`Avatar update failed ${res.status}: ${responseText.substring(0, 200)}`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return { success: true };
  }
}

export async function verifyPasswordForIdentity(password: string) {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/verifications/password`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password }),
  });

  const responseText = await res.text();

  if (!res.ok) {
    throw new Error(`Password verification failed ${res.status}: ${responseText.substring(0, 200)}`);
  }

  const parsed = JSON.parse(responseText);
  if (!parsed.verificationRecordId) {
    throw new Error(`API didn't return verificationRecordId. Got: ${JSON.stringify(parsed)}`);
  }
  
  return { verificationRecordId: parsed.verificationRecordId };
}

export async function sendEmailVerificationCode(email: string) {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/verifications/verification-code`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      identifier: { type: 'email', value: email } 
    }),
  });

  const responseText = await res.text();

  if (!res.ok) {
    throw new Error(`Email verification send failed ${res.status}: ${responseText.substring(0, 200)}`);
  }

  const parsed = JSON.parse(responseText);
  if (!parsed.verificationRecordId) {
    throw new Error(`API didn't return verificationRecordId. Got: ${JSON.stringify(parsed)}`);
  }
  
  return { verificationId: parsed.verificationRecordId };
}

export async function sendPhoneVerificationCode(phone: string) {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/verifications/verification-code`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      identifier: { type: 'phone', value: phone } 
    }),
  });

  const responseText = await res.text();

  if (!res.ok) {
    throw new Error(`Phone verification send failed ${res.status}: ${responseText.substring(0, 200)}`);
  }

  const parsed = JSON.parse(responseText);
  if (!parsed.verificationRecordId) {
    throw new Error(`API didn't return verificationRecordId. Got: ${JSON.stringify(parsed)}`);
  }
  
  return { verificationId: parsed.verificationRecordId };
}

export async function verifyVerificationCode(
  type: 'email' | 'phone',
  value: string,
  verificationId: string,
  code: string
) {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/verifications/verification-code/verify`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      identifier: { type, value },
      verificationId,
      code 
    }),
  });

  const responseText = await res.text();

  if (!res.ok) {
    throw new Error(`Verification failed ${res.status}: ${responseText.substring(0, 200)}`);
  }

  const parsed = JSON.parse(responseText);
  if (!parsed.verificationRecordId) {
    throw new Error(`API didn't return verificationRecordId. Got: ${JSON.stringify(parsed)}`);
  }
  
  return parsed;
}

export async function updateEmailWithVerification(
  email: string | null,
  newIdentifierVerificationRecordId: string,
  identityVerificationRecordId: string
) {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/my-account/primary-email`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'logto-verification-id': identityVerificationRecordId
    },
    body: JSON.stringify({ 
      email,
      newIdentifierVerificationRecordId
    }),
  });

  const responseText = await res.text();

  if (!res.ok) {
    throw new Error(`Email update failed ${res.status}: ${responseText.substring(0, 200)}`);
  }

  return responseText ? JSON.parse(responseText) : { success: true };
}

export async function updatePhoneWithVerification(
  phone: string,
  newIdentifierVerificationRecordId: string,
  identityVerificationRecordId: string
) {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/my-account/primary-phone`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'logto-verification-id': identityVerificationRecordId
    },
    body: JSON.stringify({ 
      phone,
      newIdentifierVerificationRecordId
    }),
  });

  const responseText = await res.text();

  if (!res.ok) {
    throw new Error(`Phone update failed ${res.status}: ${responseText.substring(0, 200)}`);
  }

  return responseText ? JSON.parse(responseText) : { success: true };
}

export async function removeUserEmail(identityVerificationRecordId: string) {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/my-account/primary-email`;
  
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'logto-verification-id': identityVerificationRecordId
    }
  });

  const responseText = await res.text();
  if (!res.ok) {
    throw new Error(`Email removal failed ${res.status}: ${responseText.substring(0, 200)}`);
  }
  return responseText ? JSON.parse(responseText) : { success: true };
}

// MFA MANAGEMENT FUNCTIONS

export async function getMfaVerifications() {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/my-account/mfa-verifications`;
  
  const res = await fetch(url, {
    headers: { 
      Authorization: `Bearer ${token}`
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Get MFA verifications failed ${res.status}: ${errorText.substring(0, 200)}`);
  }

  return res.json();
}

export async function generateTotpSecret() {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/my-account/mfa-verifications/totp-secret/generate`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Generate TOTP secret failed ${res.status}: ${errorText.substring(0, 200)}`);
  }

  return res.json();
}

// FIXED: Added identityVerificationRecordId parameter for authorization header
export async function addMfaVerification(
  type: string, 
  payload: any,
  identityVerificationRecordId: string  // NEW: Required for MFA operations
) {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/my-account/mfa-verifications`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'logto-verification-id': identityVerificationRecordId  // CRITICAL: Required header
    },
    body: JSON.stringify({ type, ...payload }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Add MFA verification failed ${res.status}: ${errorText.substring(0, 200)}`);
  }

  return res.status === 204 ? { success: true } : res.json();
}

// FIXED: Corrected parameter order and added identity verification header
export async function deleteMfaVerification(
  verificationId: string, 
  identityVerificationRecordId: string  // NEW: Required for MFA deletion
) {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/my-account/mfa-verifications/${verificationId}`;
  
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'logto-verification-id': identityVerificationRecordId  // CRITICAL: Required header
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Delete MFA verification failed ${res.status}: ${errorText.substring(0, 200)}`);
  }

  return res.status === 204 ? { success: true } : res.json();
}

export async function generateBackupCodes(identityVerificationRecordId: string) {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/my-account/mfa-verifications/backup-codes/generate`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'logto-verification-id': identityVerificationRecordId
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Generate backup codes failed ${res.status}: ${errorText.substring(0, 200)}`);
  }

  return res.json();
}

// FIXED: Added required identityVerificationRecordId parameter
export async function getBackupCodes(identityVerificationRecordId: string) {
  const token = await getCachedToken();
  const cleanEndpoint = getCleanEndpoint();
  const url = `${cleanEndpoint}/api/my-account/mfa-verifications/backup-codes`;
  
  const res = await fetch(url, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'logto-verification-id': identityVerificationRecordId  // CRITICAL: Required for authorization
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Get backup codes failed ${res.status}: ${errorText.substring(0, 200)}`);
  }

  return res.json();
}