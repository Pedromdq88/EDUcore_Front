import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Footer } from './components/footer/footer';
import { Header } from './components/header/header';
import { Sidebar } from './components/sidebar/sidebar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, Footer, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  sidebarCollapsed = false;
  mobileMenuOpen = false;
  constructor(public router: Router) {}
  get isLoginPage(): boolean { return this.router.url.startsWith('/login'); }
  toggleSidebar(): void {
    if (window.innerWidth < 900) this.mobileMenuOpen = !this.mobileMenuOpen;
    else this.sidebarCollapsed = !this.sidebarCollapsed;
  }
  closeMobileMenu(): void { this.mobileMenuOpen = false; }
}
