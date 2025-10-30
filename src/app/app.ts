import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header';
import { BodyComponent } from './body/body';  
import { FooterComponent } from './footer/footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, BodyComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');
}
