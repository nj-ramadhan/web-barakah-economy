import { safeStorage } from './storageUtils';

export function getOrCreateDeviceId() {
  let deviceId = safeStorage.getItem('bae_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    safeStorage.setItem('bae_device_id', deviceId);
  }
  return deviceId;
}

export function detectDeviceDetails() {
  const ua = navigator.userAgent || '';
  let deviceType = 'desktop';
  let osName = 'Unknown OS';
  let browserName = 'Browser';

  // Device Type & OS Detection
  if (/Android/i.test(ua)) {
    deviceType = /Tablet|Tab/i.test(ua) ? 'tablet' : 'mobile';
    osName = 'Android';
  } else if (/iPhone/i.test(ua)) {
    deviceType = 'mobile';
    osName = 'iPhone (iOS)';
  } else if (/iPad/i.test(ua)) {
    deviceType = 'tablet';
    osName = 'iPad (iPadOS)';
  } else if (/Windows/i.test(ua)) {
    deviceType = 'desktop';
    osName = 'Windows';
  } else if (/Macintosh|Mac OS/i.test(ua)) {
    deviceType = 'desktop';
    osName = 'macOS';
  } else if (/Linux/i.test(ua)) {
    deviceType = 'desktop';
    osName = 'Linux';
  }

  // Browser Detection
  if (/Edg\//i.test(ua)) {
    browserName = 'Microsoft Edge';
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browserName = 'Google Chrome';
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browserName = 'Safari';
  } else if (/Firefox\//i.test(ua)) {
    browserName = 'Mozilla Firefox';
  } else if (/Opera|OPR\//i.test(ua)) {
    browserName = 'Opera';
  }

  const typeLabel = deviceType === 'mobile' ? 'HP' : (deviceType === 'tablet' ? 'Tablet' : 'PC/Laptop');
  const deviceName = `${browserName} (${typeLabel} ${osName})`;

  return {
    deviceId: getOrCreateDeviceId(),
    deviceName,
    deviceType,
    osName,
    browserName,
  };
}
