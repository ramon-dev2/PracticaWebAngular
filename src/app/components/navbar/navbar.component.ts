import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CarritoService } from '../../services/carrito.service';
import { ThemeService } from '../../services/theme.service';
import { SearchBarComponent } from '../search-bar/search-bar.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [AsyncPipe, RouterLink, RouterLinkActive, SearchBarComponent],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent {
  protected readonly carrito = inject(CarritoService);
  protected readonly theme = inject(ThemeService);
  protected readonly cantidad$ = this.carrito.cantidad$;
}
