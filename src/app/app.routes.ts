import { Routes } from '@angular/router';
import { BodyComponent } from './body/body';
import { DetailComponent } from './field-details/detail';


export const routes: Routes = [
    { path: '', component: BodyComponent },
    { path: 'detail/:id', component: DetailComponent }
    
];
