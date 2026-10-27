import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({ selector:'app-sidebar',standalone:true,imports:[RouterLink,RouterLinkActive],templateUrl:'./sidebar.html',styleUrl:'./sidebar.css' })
export class Sidebar {
 @Input() collapsed = false;
 @Input() mobileOpen = false;
 @Output() navigate = new EventEmitter<void>();
 get isTutor():boolean{return sessionStorage.getItem('current_user_role')==='TUTOR';}
 get canManage(): boolean { return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role') || ''); }
}
