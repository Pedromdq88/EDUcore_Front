import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { can, Capability } from '../../guards/roles';
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  @Input()
  collapsed = false;
  @Input()
  mobileOpen = false;
  @Output()
  navigate = new EventEmitter<void>();
  can(capability: Capability): boolean {
    return can(sessionStorage.getItem('current_user_role'), capability);
  }
  get isTutor(): boolean {
    return sessionStorage.getItem('current_user_role') === 'TUTOR';
  }
}
