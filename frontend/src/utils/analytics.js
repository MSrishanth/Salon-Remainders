import { API_URL } from '../config';

const EVENT_QUEUE = [];
const BATCH_INTERVAL_MS = 5000;
let batchTimer = null;
let websiteId = 'default_website_id'; // To be configured per client
let clientId = 'default_client_id';

export const configureAnalytics = (config) => {
  if (config.websiteId) websiteId = config.websiteId;
  if (config.clientId) clientId = config.clientId;
};

const sendBatch = async () => {
  if (EVENT_QUEUE.length === 0) return;

  const eventsToSend = [...EVENT_QUEUE];
  EVENT_QUEUE.length = 0; // Clear the queue

  try {
    await fetch(`${API_URL}/api/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        websiteId,
        clientId,
        events: eventsToSend
      })
    });
  } catch (error) {
    console.error('Failed to send analytics batch:', error);
    // Optionally push back to queue if it fails, but keeping it simple for now
  }
};

export const trackEvent = (eventType, metadata = {}) => {
  EVENT_QUEUE.push({
    eventType,
    metadata,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    referrer: document.referrer
  });

  if (!batchTimer) {
    batchTimer = setInterval(sendBatch, BATCH_INTERVAL_MS);
  }
};

// Send remaining events when the page unloads
window.addEventListener('beforeunload', () => {
  if (EVENT_QUEUE.length > 0) {
    // navigator.sendBeacon is preferred for page unload, but fetch keepalive works too
    fetch(`${API_URL}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ websiteId, clientId, events: EVENT_QUEUE }),
      keepalive: true
    }).catch(() => {});
  }
});
