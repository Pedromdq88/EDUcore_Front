import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Teacher } from '../../../models/teacher';
import { TeacherService } from '../../../services/teacher/teacher';
import { PortfolioService } from '../../../services/portfolios/portfolios';
import { TeacherForm } from '../teacher-form/teacher-form';

@Component({
  selector: 'app-teacher-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TeacherForm],
  templateUrl: './teacher-detail.html',
  styleUrl: './teacher-detail.css'
})
export class TeacherDetail implements OnInit {
  get canEdit():boolean{return ['DIRECTOR','ADMINISTRATIVE'].includes(sessionStorage.getItem('current_user_role')||'');}
  teacher = signal<Teacher | null>(null); editOpen=false;
  portfolios = signal<any[]>([]);
  portfolioOpen=false;portfolioBusy=false;portfolioError='';portfolioEditId='';
  portfolio:any={title:'',description:'',category:'CURSO',activityDate:new Date().toISOString().slice(0,10),mediaUrl:''};

  constructor(
    private route: ActivatedRoute,
    private teacherService: TeacherService,
    private portfolioService: PortfolioService,private router:Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTeacherData(id);
    }
  }

  loadTeacherData(id: string) {
    this.teacherService.getStaffById(id).subscribe({next:found => this.teacher.set(found),error:()=>this.portfolioError="No se pudo cargar el personal."});
    this.portfolioService.getPortfoliosByStaff(id).subscribe(data => this.portfolios.set(data));
  }

  savePortfolio():void{
    const t=this.teacher();if(!t?.id||!this.portfolio.title.trim())return;
    this.portfolioBusy=true;this.portfolioError='';
    const op=this.portfolioEditId?this.portfolioService.updatePortfolio(this.portfolioEditId,{...this.portfolio,staffId:t.id}):this.portfolioService.createPortfolio({...this.portfolio,staffId:t.id});
    op.subscribe({next:()=>{this.portfolioBusy=false;this.portfolioOpen=false;this.portfolioEditId='';this.portfolioService.getPortfoliosByStaff(t.id!).subscribe(list=>this.portfolios.set(list));},error:()=>{this.portfolioBusy=false;this.portfolioError='No se pudo guardar el portfolio.';}});
  }
  editPortfolio(item:any):void{this.portfolio={title:item.title,description:item.description,category:item.category,activityDate:item.activityDate,mediaUrl:item.mediaUrl||''};this.portfolioEditId=item.id;this.portfolioOpen=true;}
  removePortfolio(id:string):void{const t=this.teacher();if(!t?.id||!confirm('¿Eliminar este portfolio?'))return;
    this.portfolioService.deletePortfolio(id).subscribe({next:()=>this.portfolioService.getPortfoliosByStaff(t.id!).subscribe(list=>this.portfolios.set(list)),error:()=>this.portfolioError='No se pudo eliminar el portfolio.'});
  }
  afterEdit(id:string):void{this.editOpen=false;this.loadTeacherData(id);}
  bajaTeacher() {
    const t = this.teacher();
    if (t?.id && confirm("¿Dar de baja a este miembro del personal?")) {
      this.teacherService.bajaStaff(t.id).subscribe(() => {
        this.router.navigate(['/teachers']);
      });
    }
  }
}