const target = 'http://localhost:3000';

export default {
  "/auth": { target, secure: false, changeOrigin: true },
  "/fields": { target, secure: false, changeOrigin: true },
  "/field-types": { target, secure: false, changeOrigin: true },
  "/locations": { target, secure: false, changeOrigin: true },
  "/pricing": { target, secure: false, changeOrigin: true },
  "/bookings": { target, secure: false, changeOrigin: true },
  "/users": { target, secure: false, changeOrigin: true },
  "/utilities": { target, secure: false, changeOrigin: true },
  "/review": { target, secure: false, changeOrigin: true },
  "/voucher": { target, secure: false, changeOrigin: true },
  "/feedbacks": { target, secure: false, changeOrigin: true },
  "/branches": { target, secure: false, changeOrigin: true },
  "/payment/": { target, secure: false, changeOrigin: true },
  "/uploads": { target, secure: false, changeOrigin: true }
};
