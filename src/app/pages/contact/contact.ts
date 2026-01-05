import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss']
})
export class ContactComponent {
  contactForm = {
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  };

  contactInfo = [
    {
      icon: 'fa-location-dot',
      title: 'Địa chỉ',
      content: 'Thành phố Đà Nẵng 🏛️',
      link: ''
    },
    {
      icon: 'fa-phone',
      title: 'Điện thoại',
      content: '0765539316',
      link: 'tel:0765539316'
    },
    {
      icon: 'fa-envelope',
      title: 'Email',
      content: 'linhtvt24it@vku.udn.vn',
      link: 'mailto:linhtvt24it@vku.udn.vn'
    },
    {
      icon: 'fa-clock',
      title: 'Giờ làm việc',
      content: 'T2 - CN: 7:00 - 22:00',
      link: ''
    }
  ];
  contactInfo1 = [
    {
      icon: 'fa-location-dot',
      title: 'Địa chỉ',
      content: 'Thành phố Đà Nẵng 🏛️',
      link: ''
    },
    {
      icon: 'fa-phone',
      title: 'Điện thoại',
      content: '0765539316',
      link: 'tel:0765539316'
    },
    {
      icon: 'fa-envelope',
      title: 'Email',
      content: 'linhtvt.24it@vku.udn.vn',
      link: 'mailto:linhtvt.24it@vku.udn.vn'
    },
    {
      icon: 'fa-envelope',
      title: 'Email',
      content: 'anhtt.24it@vku.udn.vn',
      link: 'mailto:anhtt.24it@vku.udn.vn'
    },
    {
      icon: 'fa-clock',
      title: 'Giờ làm việc',
      content: 'T2 - CN: 7:00 - 22:00',
      link: ''
    }
  ];

  onSubmit() {
    console.log('Contact form submitted:', this.contactForm);
    alert('Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.');
    this.contactForm = {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    };
  }
}
