import { TestBed } from '@angular/core/testing';

import { Tenant } from './tenant';

describe('Tenant', () => {
  let service: Tenant;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Tenant);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
