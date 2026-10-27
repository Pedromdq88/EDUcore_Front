import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeeDetail } from './fee-detail';

describe('FeeDetail', () => {
  let component: FeeDetail;
  let fixture: ComponentFixture<FeeDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeeDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeeDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
