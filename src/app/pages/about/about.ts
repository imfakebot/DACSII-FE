import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.html',
  styleUrls: ['./about.scss']
})
export class AboutComponent {
  features = [
    {
      icon: 'fa-clock',
      title: 'Đặt sân 24/7',
      description: 'Hệ thống hoạt động liên tục, bạn có thể đặt sân bất cứ lúc nào'
    },
    {
      icon: 'fa-shield-halved',
      title: 'Thanh toán an toàn',
      description: 'Bảo mật thông tin thanh toán với công nghệ mã hóa hiện đại'
    },
    {
      icon: 'fa-location-dot',
      title: 'Nhiều địa điểm',
      description: 'Hệ thống sân rộng khắp, dễ dàng tìm sân gần bạn'
    },
    {
      icon: 'fa-headset',
      title: 'Hỗ trợ tận tâm',
      description: 'Đội ngũ chăm sóc khách hàng sẵn sàng hỗ trợ mọi lúc'
    }
  ];

  stats = [
    { number: '10,000+', label: 'Khách hàng' },
    { number: '50+', label: 'Sân thể thao' },
    { number: '4.8/5', label: 'Đánh giá' },
    { number: '24/7', label: 'Hỗ trợ' }
  ];
}
