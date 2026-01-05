import { Pipe, PipeTransform } from '@angular/core';
import { XssSanitizerService } from './xss-sanitizer.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Pipe để escape HTML trong templates
 * Sử dụng: {{ userInput | safeText }}
 */
@Pipe({
  name: 'safeText',
  standalone: true
})
export class SafeTextPipe implements PipeTransform {
  constructor(private xss: XssSanitizerService) {}

  transform(value: string | null | undefined): string {
    return this.xss.escapeHtml(value);
  }
}

/**
 * Pipe để strip tất cả HTML tags
 * Sử dụng: {{ htmlContent | stripHtml }}
 */
@Pipe({
  name: 'stripHtml',
  standalone: true
})
export class StripHtmlPipe implements PipeTransform {
  constructor(private xss: XssSanitizerService) {}

  transform(value: string | null | undefined): string {
    return this.xss.stripHtml(value);
  }
}

/**
 * Pipe để sanitize URL
 * Sử dụng: [href]="userUrl | safeUrl"
 */
@Pipe({
  name: 'safeUrl',
  standalone: true
})
export class SafeUrlPipe implements PipeTransform {
  constructor(private xss: XssSanitizerService) {}

  transform(value: string | null | undefined): string {
    return this.xss.sanitizeUrl(value);
  }
}

/**
 * Pipe để hiển thị HTML đã được sanitize
 * CHỈ sử dụng khi thực sự cần hiển thị rich text
 * Sử dụng: [innerHTML]="content | sanitizeHtml"
 */
@Pipe({
  name: 'sanitizeHtml',
  standalone: true
})
export class SanitizeHtmlPipe implements PipeTransform {
  constructor(
    private xss: XssSanitizerService,
    private sanitizer: DomSanitizer
  ) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';
    const sanitized = this.xss.sanitizeHtml(value);
    return this.sanitizer.bypassSecurityTrustHtml(sanitized);
  }
}
