import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class BaseUrlService {
  // Base URL trỏ tới nhóm endpoint auth
  private authBaseUrl: string = "http://localhost:3000/auth"; // Dev
  // Có thể bật production bằng hàm setAuthBaseUrl
  // Ví dụ: "https://dacsii-backend.onrender.com/auth"

  getAuthBaseUrl(): string {
    return this.authBaseUrl;
  }

  setAuthBaseUrl(url: string) {
    this.authBaseUrl = url;
  }
}