import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShiftService } from '../../../services/shift/shift';

@Component({
  selector: 'app-shift-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './shift-list.html',
  styleUrl: './shift-list.css'
})
export class ShiftList implements OnInit {
  days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  classrooms = signal<any[]>([]);
  schedules = signal<any[]>([]);

  constructor(private shiftService: ShiftService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.shiftService.getClassroomsConfig().subscribe(data => this.classrooms.set(data));
    this.shiftService.getClassSchedules().subscribe(data => this.schedules.set(data));
  }
}