const createTwoFactorMiddleware = (db, twoFactorService) => {
  return {
    // Require 2FA for specific routes
    requireTwoFactor: async (req, res, next) => {
      try {
        const userId = req.user.id;
        const twoFactorVerified = req.headers['x-2fa-verified'];
        
        const status = await twoFactorService.getTwoFactorStatus(userId);
        
        if (status.enabled && !twoFactorVerified) {
          return res.status(401).json({
            success: false,
            message: '2FA verification required',
            requireTwoFactor: true,
            availableMethods: status.availableMethods
          });
        }
        
        next();
      } catch (error) {
        next();
      }
    },

    // Verify 2FA token in header
    verifyTwoFactorToken: async (req, res, next) => {
      try {
        const token = req.headers['x-2fa-token'];
        const sessionId = req.headers['x-2fa-session'];
        
        if (!token || !sessionId) {
          return next();
        }
        
        // Validate token (simplified - in production use JWT)
        const session = db.twoFactorSessions?.find(s => 
          s.id === sessionId && 
          s.status === 'verified'
        );
        
        if (session && !session.isExpired()) {
          req.headers['x-2fa-verified'] = 'true';
        }
        
        next();
      } catch (error) {
        next();
      }
    },

    // Rate limit 2FA attempts
    rateLimitTwoFactor: async (req, res, next) => {
      const userId = req.user?.id || req.params.userId;
      const ipAddress = req.ip;
      
      // Get recent attempts
      const recentAttempts = db.twoFactorSessions?.filter(s => 
        (s.userId === userId || s.ipAddress === ipAddress) &&
        new Date(s.createdAt) > new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
      ) || [];
      
      if (recentAttempts.length >= 5) {
        return res.status(429).json({
          success: false,
          message: 'Too many 2FA attempts. Please try again later.',
          retryAfter: 900 // 15 minutes in seconds
        });
      }
      
      next();
    },

    // Log 2FA activity
    logTwoFactorActivity: async (req, res, next) => {
      const startTime = Date.now();
      
      const originalSend = res.send;
      
      res.send = function(data) {
        const responseTime = Date.now() - startTime;
        
        console.log(`[2FA] User: ${req.user?.id}, Path: ${req.path}, Status: ${res.statusCode}, Time: ${responseTime}ms`);
        
        originalSend.call(this, data);
      };
      
      next();
    },

    // Require admin role
    requireAdmin: (req, res, next) => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required for this operation'
        });
      }
      next();
    }
  };
};

module.exports = createTwoFactorMiddleware;
