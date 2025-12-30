import { Injectable } from '@angular/core';

/**
 * Service mã hóa và giải mã ID để ẩn UUID trong URL
 * Phương pháp: Dùng Base64 URL-safe encoding
 */
@Injectable({ providedIn: 'root' })
export class IdEncoderService {

  /**
   * Mã hóa UUID thành chuỗi ngắn, an toàn cho URL
   * VD: "d197c4bb-ebb0-45ea-a14c-5d98dbbc6dea" => "ZDE5N2M0YmItZWJiMC00NWVhLWExNGMtNWQ5OGRiYmM2ZGVh"
   */
  encode(id: string): string {
    if (!id) return '';
    
    try {
      // Chuyển UUID sang Base64 URL-safe
      const base64 = btoa(id);
      
      // Thay thế các ký tự không an toàn cho URL
      return base64
        .replace(/\+/g, '-')  // Thay + thành -
        .replace(/\//g, '_')  // Thay / thành _
        .replace(/=/g, '');   // Bỏ padding =
    } catch (e) {
      console.error('Lỗi khi encode ID:', e);
      return id;
    }
  }

  /**
   * Giải mã chuỗi ngắn thành UUID gốc
   * VD: "ZDE5N2M0YmItZWJiMC00NWVhLWExNGMtNWQ5OGRiYmM2ZGVh" => "d197c4bb-ebb0-45ea-a14c-5d98dbbc6dea"
   */
  decode(encodedId: string): string {
    if (!encodedId) return '';
    
    try {
      // Chuyển về Base64 chuẩn
      let base64 = encodedId
        .replace(/-/g, '+')   // Thay - về +
        .replace(/_/g, '/');  // Thay _ về /
      
      // Thêm padding = nếu cần
      const padding = base64.length % 4;
      if (padding > 0) {
        base64 += '='.repeat(4 - padding);
      }
      
      // Giải mã Base64 thành UUID
      return atob(base64);
    } catch (e) {
      console.error('Lỗi khi decode ID:', e);
      return encodedId;
    }
  }

  /**
   * Tạo URL với ID đã mã hóa
   * VD: createUrl('/detail', 'uuid-123') => '/detail/encoded-string'
   */
  createUrl(basePath: string, id: string): string {
    const encodedId = this.encode(id);
    return `${basePath}/${encodedId}`;
  }

  /**
   * Lấy ID gốc từ URL params
   */
  getIdFromRoute(encodedId: string | null): string {
    if (!encodedId) return '';
    return this.decode(encodedId);
  }
}
