const createRateLimiter = ({
  windowMs,
  max,
  message,
  keyGenerator = (req) => req.ip || req.socket.remoteAddress || 'unknown',
  skipSuccessfulRequests = false,
}) => {
  const hits = new Map();

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.expiresAt <= now) {
      hits.set(key, { count: 1, expiresAt: now + windowMs });
    } else {
      entry.count += 1;
    }

    const current = hits.get(key);

    if (current.count > max) {
      return res.status(429).json({ message });
    }

    if (skipSuccessfulRequests) {
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode < 400) {
          const latest = hits.get(key);
          if (latest) {
            latest.count = Math.max(0, latest.count - 1);
          }
        }

        return originalJson(body);
      };
    }

    next();
  };
};

module.exports = {
  createRateLimiter,
};
