import { Directive, ElementRef, HostListener, Input, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { XssSanitizerService } from './xss-sanitizer.service';

/**
 * Directive để tự động sanitize input khi user nhập
 * Sử dụng: <input xssSanitize [(ngModel)]="value">
 */
@Directive({
  selector: 'input[xssSanitize], textarea[xssSanitize]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => XssSanitizeDirective),
      multi: true
    }
  ]
})
export class XssSanitizeDirective implements ControlValueAccessor {
  @Input() xssSanitizeOptions: {
    stripHtml?: boolean;
    maxLength?: number;
    trimWhitespace?: boolean;
  } = { stripHtml: true, trimWhitespace: true };

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private el: ElementRef<HTMLInputElement | HTMLTextAreaElement>,
    private xss: XssSanitizerService
  ) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const sanitized = this.sanitize(target.value);
    this.onChange(sanitized);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
    // Sanitize và trim on blur
    const currentValue = this.el.nativeElement.value;
    const sanitized = this.sanitize(currentValue);
    if (currentValue !== sanitized) {
      this.el.nativeElement.value = sanitized;
      this.onChange(sanitized);
    }
  }

  writeValue(value: string): void {
    const sanitized = this.sanitize(value);
    this.el.nativeElement.value = sanitized || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.el.nativeElement.disabled = isDisabled;
  }

  private sanitize(value: string | null | undefined): string {
    if (!value) return '';
    
    let result = value;
    
    if (this.xssSanitizeOptions.stripHtml) {
      result = this.xss.stripHtml(result);
    }
    
    if (this.xssSanitizeOptions.trimWhitespace) {
      result = result.trim();
    }
    
    if (this.xssSanitizeOptions.maxLength && result.length > this.xssSanitizeOptions.maxLength) {
      result = result.substring(0, this.xssSanitizeOptions.maxLength);
    }
    
    return result;
  }
}

/**
 * Directive để ngăn paste HTML content
 * Sử dụng: <input noHtmlPaste>
 */
@Directive({
  selector: '[noHtmlPaste]',
  standalone: true
})
export class NoHtmlPasteDirective {
  constructor(private xss: XssSanitizerService) {}

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;
    
    // Chỉ lấy plain text, bỏ qua HTML
    let pastedText = clipboardData.getData('text/plain');
    
    // Sanitize thêm một lần nữa
    pastedText = this.xss.stripHtml(pastedText);
    
    // Insert text tại vị trí cursor
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    const currentValue = target.value;
    
    target.value = currentValue.substring(0, start) + pastedText + currentValue.substring(end);
    
    // Di chuyển cursor đến cuối text đã paste
    const newCursorPos = start + pastedText.length;
    target.setSelectionRange(newCursorPos, newCursorPos);
    
    // Trigger input event để update ngModel
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
