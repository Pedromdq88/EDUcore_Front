import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TutorForm } from './tutor-form';

describe('TutorForm', () => {
  let component: TutorForm;
  let fixture: ComponentFixture<TutorForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TutorForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
