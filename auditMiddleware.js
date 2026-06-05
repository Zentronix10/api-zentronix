const createAuditMiddleware = (db, auditService) => {
  return {
    // Log all requests
    logRequest: async (req, res, next) => {
      const startTime = Date.now();
      
      // Store original send function
      const originalSend = res.send;
      
      res.send = function(data) {
        const duration = Date.now() - startTime;
        
        // Log the request
        const logData = {
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          action: req.method,
          resource: req.baseUrl + req.route?.path,
          resourceId: req.params.id || null,
          status: res.statusCode >= 200 && res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          duration: duration,
          metadata: {
            method: req.method,
            url: req.originalUrl,
            query: req.query,
            statusCode: res.statusCode,
            responseTime: duration
          }
        };
        
        // Don't log sensitive endpoints with full body
        if (!req.originalUrl.includes('/auth/login') && !req.originalUrl.includes('/auth/register')) {
          logData.metadata.body = req.body;
        }
        
        auditService.log(logData).catch(console.error);
        
        originalSend.call(this, data);
      };
      
      next();
    },

    // Log user actions
    logUserAction: (action, resource, getResourceId = null) => {
      return async (req, res, next) => {
        const startTime = Date.now();
        
        const originalSend = res.send;
        
        res.send = function(data) {
          const duration = Date.now() - startTime;
          
          const resourceId = getResourceId ? getResourceId(req, res) : req.params.id || req.body.id;
          
          auditService.log({
            userId: req.user?.id,
            userEmail: req.user?.email,
            userRole: req.user?.role,
            action: action,
            resource: resource,
            resourceId: resourceId,
            status: res.statusCode >= 200 && res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            duration: duration,
            metadata: {
              requestBody: req.body,
              responseData: typeof data === 'string' ? data.substring(0, 500) : data
            }
          }).catch(console.error);
          
          originalSend.call(this, data);
        };
        
        next();
      };
    },

    // Log sensitive operations
    logSensitiveOperation: (action, resource) => {
      return async (req, res, next) => {
        const startTime = Date.now();
        const originalSend = res.send;
        
        res.send = function(data) {
          const duration = Date.now() - startTime;
          
          auditService.log({
            userId: req.user?.id,
            userEmail: req.user?.email,
            userRole: req.user?.role,
            action: action,
            resource: resource,
            resourceId: req.params.id || req.body.id,
            status: res.statusCode >= 200 && res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            duration: duration,
            severity: 'CRITICAL',
            isSensitive: true,
            metadata: {
              action: action,
              timestamp: new Date().toISOString(),
              details: req.body
            }
          }).catch(console.error);
          
          originalSend.call(this, data);
        };
        
        next();
      };
    },

    // Check audit permission
    requireAuditPermission: (req, res, next) => {
      const allowedRoles = ['admin', 'compliance', 'auditor'];
      
      if (!allowedRoles.includes(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Audit access requires admin, compliance, or auditor role.'
        });
      }
      
      next();
    },

    // Require admin role
    requireAdmin: (req, res, next) => {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required.'
        });
      }
      next();
    },

    // Log authentication attempts
    logAuthAttempt: async (req, res, next) => {
      const originalSend = res.send;
      
      res.send = function(data) {
        const success = res.statusCode === 200;
        const responseData = typeof data === 'string' ? JSON.parse(data) : data;
        
        auditService.logLogin(
          req.body.email,
          req.ip,
          req.get('User-Agent'),
          success,
          success ? null : responseData?.message
        ).catch(console.error);
        
        originalSend.call(this, data);
      };
      
      next();
    }
  };
};

module.exports = createAuditMiddleware;
