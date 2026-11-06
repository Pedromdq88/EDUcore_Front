import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherForm } from './teacher-form';

describe('TeacherForm', () => {
  let component: TeacherForm;
  let fixture: ComponentFixture<TeacherForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeacherForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
