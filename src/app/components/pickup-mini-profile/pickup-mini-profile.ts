import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
export interface PickupMiniData {
  id?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  relationship?: string;
  documentNumber?: string;
  documentNumberMasked?: string;
  documentType?: string;
  birthDate?: string;
  age?: number;
  phone?: string;
  description?: string;
}
@Component({
  selector: 'app-pickup-mini-profile',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './pickup-mini-profile.html',
  styleUrl: './pickup-mini-profile.css'
})
export class PickupMiniProfile {
  @Input({
    required: true
  })
  person!: PickupMiniData;
  @Input({
    required: true
  })
  kind!: 'authorized' | 'restricted';
  @Input()
  institutional = false;
  get displayName(): string {
    return this.person.fullName || [this.person.firstName, this.person.lastName].filter(Boolean).join(' ') || 'Persona registrada';
  }
  get displayDocument(): string {
    return this.person.documentNumberMasked || this.person.documentNumber || 'No informado';
  }
}
