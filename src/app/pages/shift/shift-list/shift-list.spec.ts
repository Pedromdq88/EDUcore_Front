import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShiftList } from './shift-list';

describe('ShiftList', () => {
  let component: ShiftList;
  let fixture: ComponentFixture<ShiftList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShiftList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShiftList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
