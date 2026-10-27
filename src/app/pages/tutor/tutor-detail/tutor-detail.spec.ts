import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TutorDetail } from './tutor-detail';

describe('TutorDetail', () => {
  let component: TutorDetail;
  let fixture: ComponentFixture<TutorDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TutorDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
