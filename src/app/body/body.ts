import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";

@Component({
  selector: "app-body",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./body.html",
    styleUrl: './body.scss'
})
export class BodyComponent {
  title = 'Chào mừng đến với Hệ Thống Đặt Sân Bóng Đá Trực Tuyến'; 
    fields = [
        {
            name: 'Sân bóng Mini A',
            image: 'assets/campnou.jpg', 
            price: 150000
        },
        {
            name: 'Sân bóng Mini B',
            image: 'assets/bernabeu.jpg',
            price: 120000
        },
        {
            name: 'Sân bóng Cỏ Nhân Tạo',
            image: 'assets/Mu.jpg',
            price: 200000
        }
  ];
}   
