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
  template: `
    <div class="promo-bar">
      <p><i class="fa-solid fa-truck-fast" aria-hidden="true"></i> Envio gratis en compras mayores a $50.000</p>
      <ul aria-label="Accesos rapidos">
        <li><a routerLink="/contacto">Ayuda</a></li>
        <li><a routerLink="/carrito">Seguimiento de pedidos</a></li>
        <li><a routerLink="/admin">Admin</a></li>
      </ul>
    </div>

    <header class="site-header">
      <div class="header-main">
        <a class="brand" routerLink="/" aria-label="TechStore inicio">
          <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i>
          <span >Tech Store</span>
        </a>
        <app-search-bar />
        <div class="header-actions" aria-label="Acciones de compra">
          <button type="button" class="button-ghost icon-action" (click)="theme.toggle()" aria-label="Cambiar tema">
            <i class="fa-solid fa-circle-half-stroke" aria-hidden="true"></i>
          </button>
          <a routerLink="/productos"><i class="fa-regular fa-heart" aria-hidden="true"></i> Favoritos <strong>0</strong></a>
          <a routerLink="/carrito"><i class="fa-solid fa-cart-shopping" aria-hidden="true"></i> Carrito <strong>{{ cantidad$ | async }}</strong></a>
        </div>
      </div>

      <nav class="main-nav" aria-label="Navegacion principal">
        <a class="category-trigger" routerLink="/productos"><i class="fa-solid fa-bars" aria-hidden="true"></i> Categorias</a>
        <ul>
          <li><a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Inicio</a></li>
          <li><a routerLink="/productos" routerLinkActive="active">Productos</a></li>
          <li><a routerLink="/productos" [queryParams]="{ oferta: true }">Ofertas</a></li>
          <li><a routerLink="/productos" [queryParams]="{ orden: 'novedades' }">Novedades</a></li>
          <li><a routerLink="/checkout">Checkout</a></li>
          <li><a routerLink="/contacto">Contacto</a></li>
        </ul>
      </nav>
    </header>
  `
})
export class NavbarComponent {
  protected readonly carrito = inject(CarritoService);
  protected readonly theme = inject(ThemeService);
  protected readonly cantidad$ = this.carrito.cantidad$;
}
