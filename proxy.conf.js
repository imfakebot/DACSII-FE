module.exports = {
  "/auth": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: function(req, res, proxyOptions) {
      if (req.method === 'GET' && req.headers.accept && req.headers.accept.indexOf('text/html') !== -1) {
        return '/index.html';
      }
    }
  },
  "/fields": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: function(req, res, proxyOptions) {
      if (req.method === 'GET' && req.headers.accept && req.headers.accept.indexOf('text/html') !== -1) {
        return '/index.html';
      }
    }
  },
  "/field-types": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: function(req, res, proxyOptions) {
      if (req.method === 'GET' && req.headers.accept && req.headers.accept.indexOf('text/html') !== -1) {
        return '/index.html';
      }
    }
  },
  "/locations": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: function(req, res, proxyOptions) {
      if (req.method === 'GET' && req.headers.accept && req.headers.accept.indexOf('text/html') !== -1) {
        return '/index.html';
      }
    }
  },
  "/pricing": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: function(req, res, proxyOptions) {
      if (req.method === 'GET' && req.headers.accept && req.headers.accept.indexOf('text/html') !== -1) {
        return '/index.html';
      }
    }
  },
  "/bookings": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: function(req, res, proxyOptions) {
      if (req.method === 'GET' && req.headers.accept && req.headers.accept.indexOf('text/html') !== -1) {
        return '/index.html';
      }
    }
  },
  "/users": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: function(req, res, proxyOptions) {
      if (req.method === 'GET' && req.headers.accept && req.headers.accept.indexOf('text/html') !== -1) {
        return '/index.html';
      }
    }
  },
  "/utilities": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: function(req, res, proxyOptions) {
      if (req.method === 'GET' && req.headers.accept && req.headers.accept.indexOf('text/html') !== -1) {
        return '/index.html';
      }
    }
  },
  "/review": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: function(req, res, proxyOptions) {
      if (req.method === 'GET' && req.headers.accept && req.headers.accept.indexOf('text/html') !== -1) {
        return '/index.html';
      }
    }
  },
  "/voucher": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: function(req, res, proxyOptions) {
      if (req.method === 'GET' && req.headers.accept && req.headers.accept.indexOf('text/html') !== -1) {
        return '/index.html';
      }
    }
  },
  "/feedbacks": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: function(req, res, proxyOptions) {
      if (req.method === 'GET' && req.headers.accept && req.headers.accept.indexOf('text/html') !== -1) {
        return '/index.html';
      }
    }
  },
  "/branches": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: function(req, res, proxyOptions) {
      if (req.method === 'GET' && req.headers.accept && req.headers.accept.indexOf('text/html') !== -1) {
        return '/index.html';
      }
    }
  },
  "/payment": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    bypass: function(req, res, proxyOptions) {
      if (req.method === 'GET' && req.headers.accept && req.headers.accept.indexOf('text/html') !== -1) {
        return '/index.html';
      }
    }
  }
};
