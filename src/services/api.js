import Console from '../utils/console';

/**
 * 🌐 API Layer
 * Next.js App Router API Client
 */

// API Endpoints Mapping
const API_ENDPOINTS = {
  'login': '/api/auth/login',
  'saveSale': '/api/sales/add',
  'getSales': '/api/sales/get',
  'getUsers': '/api/users/get',
  'createUser': '/api/users/create',
  'editUser': '/api/users/edit',
  'exportData': '/api/export'
};

export async function callGasApi(action, payload = {}) {
  const endpoint = API_ENDPOINTS[action];

  if (!endpoint) {
    Console.api.error(`Action '${action}' not mapped to any API route`);
    throw new Error(`Unknown API action: ${action}`);
  }

  Console.api.request(endpoint, action);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...payload })
    });

    if (!response.ok) {
      let errorText = response.statusText;
      try {
        const errJson = await response.json();
        errorText = errJson.error || errorText;
      } catch (e) { /* ignore */ }

      Console.api.error('Server Error', errorText);
      throw new Error(errorText || `Server Error: ${response.status}`);
    }

    const json = await response.json();
    Console.api.response(response.status, json);
    return json;

  } catch (err) {
    Console.api.error('Fetch Error', err);
    // Standardize error for UI
    if (err.message === 'Failed to fetch' || err.message.includes('Network')) {
      throw new Error('في مشكلة في النت، اتأكد من الوصلة وحاول تاني');
    }
    throw err;
  }
}
