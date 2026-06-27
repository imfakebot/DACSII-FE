import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class BaseUrlService {
  // Base URL trỏ tới nhóm endpoint auth
  private authBaseUrl: string = "/auth"; // Dev (Sử dụng proxy)
  // Base URL trỏ tới API chính
  private apiBaseUrl: string = ""; // Dev (Sử dụng proxy)
  // Có thể bật production bằng hàm setAuthBaseUrl
  // Ví dụ: "https://dacsii-backend.onrender.com/auth"

  getAuthBaseUrl(): string {
    return this.authBaseUrl;
  }

  getApiBaseUrl(): string {
    return this.apiBaseUrl;
  }

  setAuthBaseUrl(url: string) {
    this.authBaseUrl = url;
  }
}