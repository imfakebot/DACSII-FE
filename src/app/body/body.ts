import { CommonModule, NgFor } from "@angular/common";
import { Component } from "@angular/core";
import { Router, RouterLink, RouterModule } from "@angular/router";
import { FieldService } from "../field-service/field.service";
import { Field } from "../field-service/field.type";

@Component({
  selector: "app-body",
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, NgFor],
  templateUrl: "./body.html",
    styleUrl: './body.scss'
})
export class BodyComponent {
  title = 'Chào mừng đến với Hệ Thống Đặt Sân Bóng Đá Trực Tuyến'; 

  //   // list render sân bóng
  //   fields = [
  //       {
  //           id : 1,
  //           name: 'Sân bóng Mini A',
  //           image: 'assets/campnou.jpg', 
  //           price: 150000
  //       },
  //       {
  //           id : 2,
  //           name: 'Sân bóng Mini B',
  //           image: 'assets/bernabeu.jpg',
  //           price: 120000
  //       },
  //       {
  //           id : 3,
  //           name: 'Sân bóng Cỏ Nhân Tạo',
  //           image: 'assets/Mu.jpg',
  //           price: 200000
  //       }
  // ];

  // Sử dụng dữ liệu từ ProductService
  fields: Field[] = []; 
  constructor(private fieldService: FieldService, private router: Router) {
    this.fields = this.fieldService.getFields(); 
  }

  // Navigate to detail page programmatically
  goToDetail(fieldId: number) {
    // use navigate so we can add logic here later (analytics, validation, etc.)
    this.router.navigate(['/detail', fieldId]);
  }

}   
