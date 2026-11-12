import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Footer } from './components/footer/footer';
import { UiDialog } from './components/ui-dialog/ui-dialog';
import { Header } from './components/header/header';
import { Sidebar } from './components/sidebar/sidebar';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, Footer, Sidebar, UiDialog],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  sidebarCollapsed = false;
  mobileMenuOpen = false;
  constructor(public router: Router) {}
  get isLoginPage(): boolean { return this.router.url.startsWith('/login') || this.router.url.startsWith('/change-password'); }
  toggleSidebar(): void {
    if (window.innerWidth < 900) this.mobileMenuOpen = !this.mobileMenuOpen;
    else this.sidebarCollapsed = !this.sidebarCollapsed;
  }
  closeMobileMenu(): void { this.mobileMenuOpen = false; }
}
