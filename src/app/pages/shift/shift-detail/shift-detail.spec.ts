import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShiftDetail } from './shift-detail';

describe('ShiftDetail', () => {
  let component: ShiftDetail;
  let fixture: ComponentFixture<ShiftDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShiftDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShiftDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
