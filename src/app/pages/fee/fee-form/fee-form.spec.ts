import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeeForm } from './fee-form';

describe('FeeForm', () => {
  let component: FeeForm;
  let fixture: ComponentFixture<FeeForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeeForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeeForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
