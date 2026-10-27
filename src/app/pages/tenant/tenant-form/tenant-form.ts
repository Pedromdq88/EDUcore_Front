import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TenantService } from '../../../services/tenant/tenant';
import { Tenant } from '../../../models/tenant';

@Component({
  selector: 'app-tenant-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tenant-form.html',
  styleUrl: './tenant-form.css'
})
export class TenantForm implements OnInit {
  tenant: Tenant = {
    name: '',
    legalName: '',
    district: '',
    sector: '',
    levels: '',
    shifts: '',
    city: '',
    academicYear: 2026,
    cue: '',
    dipregep: '',
    phone: '',
    email: '',
    address: ''
  };

  constructor(
    private tenantService: TenantService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.tenantService.getProfile().subscribe(data => {
      if (data) {
        this.tenant = { ...(data.profile || data) };
      }
    });
  }

  saveTenant() {
    if (!this.tenant.name || !this.tenant.legalName) {
      alert("Por favor complete los campos obligatorios de la institución.");
      return;
    }

    this.tenantService.updateProfile(this.tenant).subscribe({
      next: () => {
        alert("¡Datos institucionales actualizados con éxito!");
        this.router.navigate(['/school-profile']);
      },
      error: err => alert("Error al actualizar la institución: " + err.message)
    });
  }
}