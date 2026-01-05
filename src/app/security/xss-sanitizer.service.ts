import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * XSS Sanitizer Service
 * 
 * Cung cấp các phương thức để làm sạch dữ liệu đầu vào,
 * ngăn chặn các cuộc tấn công Cross-Site Scripting (XSS).
 */
@Injectable({ providedIn: 'root' })
export class XssSanitizerService {
  
  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Loại bỏ tất cả HTML tags từ chuỗi
   * Sử dụng cho text input thông thường
   */
  stripHtml(input: string | null | undefined): string {
    if (!input) return '';
    return input
      .replace(/<[^>]*>/g, '') // Xóa tất cả HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  /**
   * Escape HTML entities để hiển thị an toàn
   * Chuyển đổi các ký tự đặc biệt thành HTML entities
   */
  escapeHtml(input: string | null | undefined): string {
    if (!input) return '';
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };
    return input.replace(/[&<>"'`=/]/g, (char) => map[char] || char);
  }

  /**
   * Sanitize URL để ngăn javascript: và data: protocols
   */
  sanitizeUrl(url: string | null | undefined): string {
    if (!url) return '';
    
    const trimmedUrl = url.trim().toLowerCase();
    
    // Chặn các protocol nguy hiểm
    const dangerousProtocols = [
      'javascript:',
      'data:',
      'vbscript:',
      'file:',
      'about:',
    ];
    
    for (const protocol of dangerousProtocols) {
      if (trimmedUrl.startsWith(protocol)) {
        console.warn(`[XSS] Blocked dangerous URL protocol: ${protocol}`);
        return '';
      }
    }
    
    // Cho phép http, https, mailto, tel và relative URLs
    if (
      trimmedUrl.startsWith('http://') ||
      trimmedUrl.startsWith('https://') ||
      trimmedUrl.startsWith('mailto:') ||
      trimmedUrl.startsWith('tel:') ||
      trimmedUrl.startsWith('/') ||
      trimmedUrl.startsWith('#') ||
      !trimmedUrl.includes(':')
    ) {
      return url;
    }
    
    console.warn(`[XSS] Blocked unknown URL protocol: ${url}`);
    return '';
  }

  /**
   * Sanitize HTML content - chỉ cho phép một số tags an toàn
   * Sử dụng khi cần hiển thị rich text từ user
   */
  sanitizeHtml(input: string | null | undefined): string {
    if (!input) return '';
    
    // Danh sách tags được phép
    const allowedTags = ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'span'];
    
    // Xóa tất cả attributes nguy hiểm (on* events, style, etc.)
    let sanitized = input.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*style\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*href\s*=\s*["']javascript:[^"']*["']/gi, '');
    
    // Xóa script tags hoàn toàn
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Xóa các tags không được phép
    const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
    sanitized = sanitized.replace(tagRegex, (match, tagName) => {
      if (allowedTags.includes(tagName.toLowerCase())) {
        // Giữ lại tag nhưng xóa attributes (trừ một số an toàn)
        return match.replace(/\s+[a-z-]+\s*=\s*["'][^"']*["']/gi, '');
      }
      return ''; // Xóa tag không được phép
    });
    
    return sanitized;
  }

  /**
   * Sanitize object - làm sạch tất cả string properties
   */
  sanitizeObject<T extends object>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = { ...obj };
    
    for (const key in sanitized) {
      if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
        const value = sanitized[key];
        
        if (typeof value === 'string') {
          (sanitized as any)[key] = this.escapeHtml(value);
        } else if (Array.isArray(value)) {
          (sanitized as any)[key] = value.map(item => 
            typeof item === 'string' ? this.escapeHtml(item) : 
            typeof item === 'object' ? this.sanitizeObject(item) : item
          );
        } else if (typeof value === 'object' && value !== null) {
          (sanitized as any)[key] = this.sanitizeObject(value as object);
        }
      }
    }
    
    return sanitized;
  }

  /**
   * Validate và sanitize input cho form fields
   */
  sanitizeFormInput(input: string | null | undefined, options?: {
    maxLength?: number;
    allowHtml?: boolean;
    trimWhitespace?: boolean;
  }): string {
    if (!input) return '';
    
    let result = input;
    
    // Trim whitespace
    if (options?.trimWhitespace !== false) {
      result = result.trim();
    }
    
    // Strip or escape HTML
    if (options?.allowHtml) {
      result = this.sanitizeHtml(result);
    } else {
      result = this.stripHtml(result);
    }
    
    // Limit length
    if (options?.maxLength && result.length > options.maxLength) {
      result = result.substring(0, options.maxLength);
    }
    
    return result;
  }

  /**
   * Tạo SafeHtml từ content đã được sanitize
   * CHỈ sử dụng khi thực sự cần thiết và đã sanitize trước
   */
  toSafeHtml(content: string): SafeHtml {
    const sanitized = this.sanitizeHtml(content);
    return this.sanitizer.bypassSecurityTrustHtml(sanitized);
  }
}
