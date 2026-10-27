import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherDetail } from './teacher-detail';

describe('TeacherDetail', () => {
  let component: TeacherDetail;
  let fixture: ComponentFixture<TeacherDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeacherDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
