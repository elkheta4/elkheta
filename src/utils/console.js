/**
 * 🎨 Beautiful Console Logger
 * Enhanced console logging with colors, icons, and grouping
 */

// Color palette for different log types
const COLORS = {
  // Modules
  api: '#3B82F6',      // Blue
  store: '#8B5CF6',    // Purple  
  context: '#10B981',  // Green
  auth: '#F59E0B',     // Amber
  component: '#EC4899', // Pink
  
  // Status
  success: '#22C55E',  // Green
  error: '#EF4444',    // Red
  warn: '#F59E0B',     // Amber
  info: '#3B82F6',     // Blue
  debug: '#6B7280',    // Gray
  
  // Cache
  cache: '#06B6D4',    // Cyan
  network: '#F97316',  // Orange
};

// Icons for different log types
const ICONS = {
  api: '🌐',
  store: '💾',
  context: '🔄',
  auth: '🔐',
  component: '🧩',
  success: '✅',
  error: '❌',
  warn: '⚠️',
  info: 'ℹ️',
  debug: '🔍',
  cache: '📦',
  network: '🌍',
  request: '📤',
  response: '📥',
  time: '⏱️',
  user: '👤',
  data: '📊',
};

/**
 * Create styled console log
 */
const createStyled = (label, color, icon = '') => {
  const labelStyle = `
    background: ${color};
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: bold;
    font-size: 11px;
  `;
  
  const textStyle = `
    color: ${color};
    font-weight: 500;
  `;

  return {
    label: `%c${icon} ${label}`,
    labelStyle,
    textStyle
  };
};

/**
 * Format data for pretty printing
 */
const formatData = (data) => {
  if (data === null || data === undefined) return '';
  if (typeof data === 'object') {
    // For responses, show summary
    if (data.success !== undefined) {
      const items = data.sales?.length || data.users?.length || '';
      const cache = data.fromCache ? '(cached)' : '(fresh)';
      return items ? `${items} items ${cache}` : '';
    }
    return data;
  }
  return data;
};

/**
 * Console Logger Object
 */
const Console = {
  /**
   * API Logs
   */
  api: {
    request: (url, action) => {
      const { label, labelStyle } = createStyled('API', COLORS.api, ICONS.request);
      console.log(
        `${label} %c→ ${action}`,
        labelStyle,
        `color: ${COLORS.api}; font-weight: 500;`,
        `\n   📍 ${url}`
      );
    },
    
    response: (status, data) => {
      const isSuccess = status >= 200 && status < 300;
      const color = isSuccess ? COLORS.success : COLORS.error;
      const icon = isSuccess ? ICONS.success : ICONS.error;
      const { label, labelStyle } = createStyled('API', COLORS.api, ICONS.response);
      
      console.log(
        `${label} %c${icon} ${status}`,
        labelStyle,
        `color: ${color}; font-weight: bold;`,
        formatData(data)
      );
    },
    
    error: (message, error) => {
      const { label, labelStyle } = createStyled('API', COLORS.error, ICONS.error);
      console.error(
        `${label} %c${message}`,
        labelStyle,
        `color: ${COLORS.error};`,
        error || ''
      );
    },
    
    warn: (message) => {
      const { label, labelStyle } = createStyled('API', COLORS.warn, ICONS.warn);
      console.warn(
        `${label} %c${message}`,
        labelStyle,
        `color: ${COLORS.warn};`
      );
    }
  },

  /**
   * Store/Cache Logs
   */
  store: {
    cache: (key, mode) => {
      const { label, labelStyle } = createStyled('STORE', COLORS.store, ICONS.cache);
      console.log(
        `${label} %c${ICONS.success} Serving "${key}" from %c${mode.toUpperCase()}%c cache`,
        labelStyle,
        `color: ${COLORS.cache};`,
        `background: ${COLORS.cache}; color: white; padding: 1px 4px; border-radius: 2px; font-size: 10px;`,
        `color: ${COLORS.cache};`
      );
    },
    
    fetch: (key) => {
      const { label, labelStyle } = createStyled('STORE', COLORS.store, ICONS.network);
      console.log(
        `${label} %c${ICONS.network} Fetching "${key}" from API...`,
        labelStyle,
        `color: ${COLORS.network};`
      );
    },
    
    expired: (key, mode, age, ttl) => {
      const { label, labelStyle } = createStyled('STORE', COLORS.warn, ICONS.time);
      console.log(
        `${label} %c${ICONS.warn} Expired "${key}" (${mode}) - ${Math.round(age/1000)}s > ${Math.round(ttl/1000)}s TTL`,
        labelStyle,
        `color: ${COLORS.warn};`
      );
    },
    
    clear: (type) => {
      const { label, labelStyle } = createStyled('STORE', COLORS.store, '🗑️');
      console.log(
        `${label} %c${type} caches cleared`,
        labelStyle,
        `color: ${COLORS.store};`
      );
    }
  },

  /**
   * Context Logs
   */
  context: {
    fetch: (type, agent = null) => {
      const { label, labelStyle } = createStyled('CONTEXT', COLORS.context, ICONS.network);
      const target = agent ? `${type} for ${agent}` : type;
      console.log(
        `${label} %c${ICONS.network} Fetching ${target}...`,
        labelStyle,
        `color: ${COLORS.network};`
      );
    },
    
    cache: (type, agent = null) => {
      const { label, labelStyle } = createStyled('CONTEXT', COLORS.context, ICONS.cache);
      const target = agent ? `${type} for ${agent}` : type;
      console.log(
        `${label} %c${ICONS.success} Using cached ${target}`,
        labelStyle,
        `color: ${COLORS.cache};`
      );
    },
    
    action: (action) => {
      const { label, labelStyle } = createStyled('CONTEXT', COLORS.context, '⚡');
      console.log(
        `${label} %c${action}`,
        labelStyle,
        `color: ${COLORS.context};`
      );
    },
    
    warn: (message, error) => {
      const { label, labelStyle } = createStyled('CONTEXT', COLORS.warn, ICONS.warn);
      console.warn(
        `${label} %c${message}`,
        labelStyle,
        `color: ${COLORS.warn};`,
        error || ''
      );
    }
  },

  /**
   * Auth Logs
   */
  auth: {
    login: (user, role) => {
      const { label, labelStyle } = createStyled('AUTH', COLORS.auth, ICONS.user);
      console.log(
        `${label} %c${ICONS.success} Logged in as %c${user}%c (${role})`,
        labelStyle,
        `color: ${COLORS.success};`,
        `background: ${COLORS.auth}; color: white; padding: 1px 4px; border-radius: 2px;`,
        `color: ${COLORS.auth};`
      );
    },
    
    logout: () => {
      const { label, labelStyle } = createStyled('AUTH', COLORS.auth, '👋');
      console.log(
        `${label} %cSession ended`,
        labelStyle,
        `color: ${COLORS.auth};`
      );
    },
    
    error: (message) => {
      const { label, labelStyle } = createStyled('AUTH', COLORS.error, ICONS.error);
      console.error(
        `${label} %c${message}`,
        labelStyle,
        `color: ${COLORS.error};`
      );
    },
    
    action: (message) => {
      const { label, labelStyle } = createStyled('AUTH', COLORS.auth, '⚡');
      console.log(
        `${label} %c${message}`,
        labelStyle,
        `color: ${COLORS.auth};`
      );
    }
  },

  /**
   * Component Logs
   */
  component: {
    data: (name, count, type = 'items') => {
      const { label, labelStyle } = createStyled(name.toUpperCase(), COLORS.component, ICONS.data);
      console.log(
        `${label} %c${ICONS.success} Loaded %c${count}%c ${type}`,
        labelStyle,
        `color: ${COLORS.success};`,
        `background: ${COLORS.component}; color: white; padding: 1px 4px; border-radius: 2px; font-weight: bold;`,
        `color: ${COLORS.component};`
      );
    },
    
    action: (name, action) => {
      const { label, labelStyle } = createStyled(name.toUpperCase(), COLORS.component, '⚡');
      console.log(
        `${label} %c${action}`,
        labelStyle,
        `color: ${COLORS.component};`
      );
    },
    
    error: (name, message, error) => {
      const { label, labelStyle } = createStyled(name.toUpperCase(), COLORS.error, ICONS.error);
      console.error(
        `${label} %c${message}`,
        labelStyle,
        `color: ${COLORS.error};`,
        error || ''
      );
    }
  },

  /**
   * General Purpose Logs
   */
  success: (message, data) => {
    console.log(
      `%c${ICONS.success} ${message}`,
      `color: ${COLORS.success}; font-weight: bold;`,
      data || ''
    );
  },

  error: (message, error) => {
    console.error(
      `%c${ICONS.error} ${message}`,
      `color: ${COLORS.error}; font-weight: bold;`,
      error || ''
    );
  },

  warn: (message, data) => {
    console.warn(
      `%c${ICONS.warn} ${message}`,
      `color: ${COLORS.warn}; font-weight: bold;`,
      data || ''
    );
  },

  info: (message, data) => {
    console.info(
      `%c${ICONS.info} ${message}`,
      `color: ${COLORS.info}; font-weight: bold;`,
      data || ''
    );
  },

  debug: (message, data) => {
    console.debug(
      `%c${ICONS.debug} ${message}`,
      `color: ${COLORS.debug};`,
      data || ''
    );
  },

  /**
   * Grouped Logs
   */
  group: (label, color = COLORS.info) => {
    console.groupCollapsed(
      `%c${label}`,
      `color: ${color}; font-weight: bold;`
    );
  },

  groupEnd: () => {
    console.groupEnd();
  },

  /**
   * Table Log
   */
  table: (data, columns) => {
    console.table(data, columns);
  },

  /**
   * Time Tracking
   */
  time: (label) => {
    console.time(`${ICONS.time} ${label}`);
  },

  timeEnd: (label) => {
    console.timeEnd(`${ICONS.time} ${label}`);
  }
};

export default Console;
