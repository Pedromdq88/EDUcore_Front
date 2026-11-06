import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantList } from './tenant-list';

describe('TenantList', () => {
  let component: TenantList;
  let fixture: ComponentFixture<TenantList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
