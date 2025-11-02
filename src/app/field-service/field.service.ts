import { Injectable } from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class FieldService {
  fields = [
    {
      id: 1,
      name: 'Sân bóng Mini A',
      image: 'assets/campnou.jpg',
      price: 150000,
      size: '40m x 60m',
      surface: 'Cỏ nhân tạo 6F',
      capacity: '14 người',
      facilities: ['Phòng thay đồ', 'Nhà tắm', 'Căng tin', 'Bãi đỗ xe'],
      openHours: '6:00 - 22:00',
      address: '123 Đường ABC, Quận XYZ, TP.HCM',
      description: 'Sân bóng Mini A là một trong những sân bóng đá mini chất lượng cao tại khu vực. Với mặt cỏ nhân tạo 6F được nhập khẩu từ châu Âu, cùng hệ thống chiếu sáng hiện đại, đảm bảo trải nghiệm chơi bóng tuyệt vời cho người chơi.'
    },
    {
      id: 2,  
      name: 'Sân bóng Mini B',
      image: 'assets/bernabeu.jpg',
      price: 120000,
      size: '35m x 50m',
      surface: 'Cỏ nhân tạo 5F',
      capacity: '12 người',
      facilities: ['Phòng thay đồ', 'Nhà tắm', 'Bãi đỗ xe'],
      openHours: '6:00 - 23:00',
      address: '456 Đường DEF, Quận UVW, TP.HCM',
      description: 'Sân bóng Mini B là lựa chọn lý tưởng cho các đội bóng nhỏ và vừa. Với vị trí thuận lợi và giá cả hợp lý, sân đáp ứng đầy đủ nhu cầu cơ bản của người chơi.'
    },
    {
      id: 3,
      name: 'Sân bóng Cỏ Nhân Tạo',
      image: 'assets/Mu.jpg',
      price: 200000,
      size: '50m x 70m',
      surface: 'Cỏ nhân tạo 7F',
      capacity: '22 người',
      facilities: ['Phòng thay đồ VIP', 'Nhà tắm', 'Căng tin', 'Bãi đỗ xe', 'Phòng massage'],
      openHours: '5:30 - 23:00',
      address: '789 Đường GHI, Quận RST, TP.HCM',
      description: 'Sân bóng Cỏ Nhân Tạo là sân bóng cao cấp với đầy đủ tiện nghi. Được trang bị hệ thống cỏ nhân tạo 7F mới nhất, cùng các tiện ích đẳng cấp, đáp ứng nhu cầu của các đội bóng chuyên nghiệp.'
    }
  ];

  getFields() {
    return this.fields;
  }

  getFieldById(id: number) {
    return this.fields.find(field => field.id === id);
  }
}