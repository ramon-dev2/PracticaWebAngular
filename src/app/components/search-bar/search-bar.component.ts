import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.css'
})
export class SearchBarComponent {
  private readonly router = inject(Router);
  busqueda = '';

  buscar(): void {
    void this.router.navigate(['/productos'], { queryParams: { q: this.busqueda || null } });
  }
}
