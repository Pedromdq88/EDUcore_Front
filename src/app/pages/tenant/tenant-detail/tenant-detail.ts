import { inject, ChangeDetectionStrategy } from '@angular/core';
import { UiDialogService } from '../../../services/ui-dialog/ui-dialog';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TenantService } from '../../../services/tenant/tenant';
import { Tenant } from '../../../models/tenant';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tenant-detail.html',
  styleUrl: './tenant-detail.css'
})
export class TenantDetail implements OnInit {
  private readonly dialogs=inject(UiDialogService);

  tenant = signal<Tenant | null>(null);
  tickets=signal<any[]>([]);ticketError='';ticketBusy=false;
  get isDirector():boolean{return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role')||'');}
  get canSeeTickets():boolean{return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role')||'');}

  constructor(private tenantService: TenantService) {}

  ngOnInit(): void {
    this.tenantService.getProfile().subscribe(data => this.tenant.set(data?.profile || data));
    if(this.canSeeTickets)this.loadTickets();
  }
  loadTickets():void{this.tenantService.getTickets().subscribe({next:rows=>this.tickets.set(rows),error:()=>this.ticketError='No se pudieron consultar las solicitudes pendientes.'});}
  changesFor(ticket:any):Array<{label:string;current:string;proposed:string}>{
    try {
      const proposed=JSON.parse(ticket.proposedDataJson||'{}');const current=this.tenant() as any;
      const fields=[['name','Nombre'],['legalName','Razón social'],['cue','CUE'],['dipregep','DIPREGEP'],['district','Distrito'],['sector','Sector'],['levels','Niveles'],['shifts','Turnos'],['city','Ciudad'],['address','Domicilio'],['phone','Teléfono'],['email','Email'],['academicYear','Ciclo lectivo']];
      return fields.filter(([key])=>proposed[key]!=null && String(proposed[key])!==String(current?.[key]??''))
        .map(([key,label])=>({label,current:String(current?.[key]??'—'),proposed:String(proposed[key])}));
    }catch{return [];}
  }
  async resolve(id:string,approve:boolean):Promise<void>{if(!(await this.dialogs.confirm(approve?'¿Aprobar y aplicar estos cambios?':'¿Rechazar esta solicitud?')))return;
    this.ticketBusy=true;this.ticketError='';this.tenantService.resolveTicket(id,approve).subscribe({next:()=>{this.ticketBusy=false;this.loadTickets();this.tenantService.getProfile().subscribe(data=>this.tenant.set(data?.profile||data));},error:e=>{this.ticketBusy=false;this.ticketError='No se pudo resolver la solicitud (HTTP '+(e.status||'sin conexión')+').';}});}
}