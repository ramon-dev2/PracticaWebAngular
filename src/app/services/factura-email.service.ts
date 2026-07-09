import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Orden } from '../models/orden';

export interface FacturaEmail {
  ordenId: string;
  destinatario: string;
  messageId?: string;
  enviadaEn: string;
}

const STORAGE_KEY = 'techstore-sent-invoices';
const API_URL = 'http://localhost:3000/api/enviar-factura';

@Injectable({ providedIn: 'root' })
export class FacturaEmailService {
  constructor(private readonly http: HttpClient) {}

  enviarFactura(orden: Orden): Observable<FacturaEmail> {
    return this.http.post<FacturaEmail>(API_URL, { orden }).pipe(
      tap((email) => {
        const enviados = this.cargarEnviados();
        localStorage.setItem(STORAGE_KEY, JSON.stringify([email, ...enviados]));
      })
    );
  }

  private cargarEnviados(): FacturaEmail[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as FacturaEmail[];
    } catch {
      return [];
    }
  }
}
