import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TenantService } from '../../../services/tenant/tenant';
import { Tenant } from '../../../models/tenant';

@Component({
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tenant-detail.html',
  styleUrl: './tenant-detail.css'
})
export class TenantDetail implements OnInit {
  tenant = signal<Tenant | null>(null);

  constructor(private tenantService: TenantService) {}

  ngOnInit(): void {
    this.tenantService.getProfile().subscribe(data => this.tenant.set(data?.profile || data));
  }
}