import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Login } from './login';
describe('Login',()=>{
 beforeEach(async()=>await TestBed.configureTestingModule({imports:[Login],providers:[provideRouter([]),provideHttpClient()]}).compileComponents());
 it('should render EduCore',()=>{
  const fixture=TestBed.createComponent(Login);
  expect(fixture.componentInstance).toBeTruthy();
 });
});
