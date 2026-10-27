import { TestBed } from '@angular/core/testing';

import { Fee } from './fee';

describe('Fee', () => {
  let service: Fee;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Fee);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
