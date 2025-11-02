import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { FieldService } from "../field-service/field.service";

@Component({
  selector: "app-detail",
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: "./detail.html",
  styleUrl: './detail.scss'
})
export class DetailComponent implements OnInit {
    id = '';
    field: any;
    
    constructor(
        private route: ActivatedRoute,
        private fieldService: FieldService,
        private router: Router
    ) {}

    ngOnInit() {
        this.id = this.route.snapshot.paramMap.get('id') || '';
        this.field = this.fieldService.getFieldById(Number(this.id));
    }

    // Navigate to booking page (programmatic)
    bookField() {
        if (!this.field) return;
        // navigate to booking route and pass the field id as query param
        this.router.navigate(['/booking'], { queryParams: { fieldId: this.field.id } });
    }

    // go to home
    goHome() {
        this.router.navigate(['/']);
    }

    
}