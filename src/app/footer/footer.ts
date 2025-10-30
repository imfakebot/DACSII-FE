import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";

@Component({
  selector: "app-footer",
  standalone: true,
  imports: [RouterModule],
  templateUrl: "./footer.html",
    styleUrl: './footer.scss'
})
export class FooterComponent {
    footerText = "© 2024 DACSII-FE. All rights reserved.";  
    currentYear: number = new Date().getFullYear(); 
    location: string = 'Trần Đại Nghĩa, Đà Nẵng';
    hotline: string = '0765.539.316';
    email: string = 'linhtvt.24it@vku.udn.vn';
}