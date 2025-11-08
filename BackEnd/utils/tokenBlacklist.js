// Simple in-memory token blacklist
// In production, use Redis or database for distributed systems

const blacklistedTokens = new Set();

// Clean up old tokens periodically (optional, as tokens expire naturally)
// In production with JWT, tokens can't be truly invalidated without checking a blacklist
// This is a simple implementation for demonstration

function blacklistToken(token) {
  // In a real implementation, you might want to store expiration time
  // For simplicity, we'll just store the token
  blacklistedTokens.add(token);
}

function isTokenBlacklisted(token) {
  return blacklistedTokens.has(token);
}

// Optional: Clean up function (not really needed as Set is efficient)
function clearBlacklist() {
  blacklistedTokens.clear();
}

module.exports = {
  blacklistToken,
  isTokenBlacklisted,
  clearBlacklist
};

