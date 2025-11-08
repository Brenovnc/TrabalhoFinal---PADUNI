// Simple in-memory rate limiter for login attempts
// In production, use Redis or similar for distributed systems

const loginAttempts = new Map();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of loginAttempts.entries()) {
    if (now > data.expiresAt) {
      loginAttempts.delete(key);
    }
  }
}, 60000); // Clean up every minute

function checkRateLimit(identifier) {
  const now = Date.now();
  const data = loginAttempts.get(identifier);

  // If blocked, check if block period has expired
  if (data && data.blockedUntil && now < data.blockedUntil) {
    const minutesLeft = Math.ceil((data.blockedUntil - now) / 60000);
    return {
      blocked: true,
      minutesLeft
    };
  }

  // If block period expired, reset
  if (data && data.blockedUntil && now >= data.blockedUntil) {
    loginAttempts.delete(identifier);
    return { blocked: false };
  }

  // If no data, allow
  if (!data) {
    return { blocked: false };
  }

  // Check time window (2 minutes)
  const twoMinutesAgo = now - 120000; // 2 minutes in milliseconds
  
  // Filter attempts within last 2 minutes
  const recentAttempts = data.attempts.filter(timestamp => timestamp > twoMinutesAgo);

  // If 10 or more attempts in 2 minutes, block for 30 minutes
  if (recentAttempts.length >= 10) {
    const blockedUntil = now + 1800000; // 30 minutes in milliseconds
    loginAttempts.set(identifier, {
      attempts: recentAttempts,
      blockedUntil,
      expiresAt: blockedUntil + 60000 // Keep for 31 minutes total
    });
    return {
      blocked: true,
      minutesLeft: 30
    };
  }

  // Update attempts
  loginAttempts.set(identifier, {
    attempts: recentAttempts,
    expiresAt: now + 180000 // Keep for 3 minutes
  });

  return { blocked: false };
}

function recordFailedAttempt(identifier) {
  const now = Date.now();
  const data = loginAttempts.get(identifier);

  if (!data) {
    loginAttempts.set(identifier, {
      attempts: [now],
      expiresAt: now + 180000
    });
  } else {
    data.attempts.push(now);
    loginAttempts.set(identifier, data);
  }
}

function clearAttempts(identifier) {
  loginAttempts.delete(identifier);
}

module.exports = {
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts
};

