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
  error='';busy=false;reason='';
  get isDirector():boolean{return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role')||'');}
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

    if(!this.isDirector && !this.reason.trim()){this.error='Ingresá el motivo de la solicitud.';return;}
    this.busy=true;this.error='';
    const req=this.isDirector?this.tenantService.updateProfile(this.tenant):this.tenantService.createTicket(this.reason.trim(),this.tenant);
    req.subscribe({
      next: () => {
        this.busy=false;alert(this.isDirector?'Datos actualizados.':'Solicitud enviada a Dirección para su aprobación.');
        this.router.navigate(['/school-profile']);
      },
      error: err => {this.busy=false;this.error="No se pudo guardar la solicitud (HTTP "+(err.status||"sin conexión")+").";}
    });
  }
}