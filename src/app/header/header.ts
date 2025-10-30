import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";
import { Router } from "express";


@Component({
  selector: "app-header",
  standalone: true,
  imports: [RouterModule],
  templateUrl: "./header.html",
    styleUrl: './header.scss'
})
export class HeaderComponent {
  title = "DACSII-FE";
}