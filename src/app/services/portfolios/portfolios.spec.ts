import { TestBed } from '@angular/core/testing';

import { Portfolios } from './portfolios';

describe('Portfolios', () => {
  let service: Portfolios;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Portfolios);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
