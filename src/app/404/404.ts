import { Component, OnInit, OnDestroy, AfterViewInit, PLATFORM_ID, Inject } from "@angular/core";
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: "app-404",
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: "./404.html",
    styleUrls: ["./404.scss"]
})
export class NotFoundComponent implements AfterViewInit, OnDestroy {
    private animationFrameId: number | null = null;

    constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

    ngAfterViewInit() {
        // Only run in browser (not SSR)
        if (isPlatformBrowser(this.platformId)) {
            setTimeout(() => {
                this.drawVisor();
                this.animate();
            }, 0);
        }
    }

    ngOnDestroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    private drawVisor() {
        const canvas = document.getElementById('visor') as HTMLCanvasElement;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.beginPath();
        ctx.moveTo(5, 45);
        ctx.bezierCurveTo(15, 64, 45, 64, 55, 45);
        
        ctx.lineTo(55, 20);
        ctx.bezierCurveTo(55, 15, 50, 10, 45, 10);
        
        ctx.lineTo(15, 10);
        
        ctx.bezierCurveTo(15, 10, 5, 10, 5, 20);
        ctx.lineTo(5, 45);
        
        ctx.fillStyle = '#2f3640';
        ctx.strokeStyle = '#f5f6fa';
        ctx.fill();
        ctx.stroke();
    }

    private animate() {
        const cordCanvas = document.getElementById('cord') as HTMLCanvasElement;
        if (!cordCanvas) return;
        
        const ctx = cordCanvas.getContext('2d');
        if (!ctx) return;

        let y1 = 160;
        let y2 = 100;
        let y3 = 100;

        let y1Forward = true;
        let y2Forward = false;
        let y3Forward = true;

        const animateFrame = () => {
            ctx.clearRect(0, 0, cordCanvas.width, cordCanvas.height);
            
            ctx.beginPath();
            ctx.moveTo(130, 170);
            ctx.bezierCurveTo(250, y1, 345, y2, 400, y3);
            
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 8;
            ctx.stroke();
            
            if (y1 === 100) y1Forward = true;
            if (y1 === 300) y1Forward = false;
            if (y2 === 100) y2Forward = true;
            if (y2 === 310) y2Forward = false;
            if (y3 === 100) y3Forward = true;
            if (y3 === 317) y3Forward = false;
            
            y1Forward ? y1 += 1 : y1 -= 1;
            y2Forward ? y2 += 1 : y2 -= 1;
            y3Forward ? y3 += 1 : y3 -= 1;

            this.animationFrameId = requestAnimationFrame(animateFrame);
        };

        animateFrame();
    }
}