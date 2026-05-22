import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'seller' | 'admin';
  whatsappNumber?: string;
  address?: Address;
  aadhaarId?: string;
  geoLocation?: GeoLocation;
  createdDate: Date;
}

export interface Address {
  homeOrOfficeNumber?: string;
  street?: string;
  landmark: string;
  city: string;
  state: string;
  pin: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  statusCode: number;
  message: string;
  data: {
    user: User;
    token: string;
    refreshToken: string;
  };
}

export interface AadhaarValidationResponse {
  statusCode: number;
  message: string;
  data: {
    aadhaarId: string;
    valid: boolean;
    provider: 'govt-portal' | 'local-format-check';
  };
  timestamp: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private tokenSubject = new BehaviorSubject<string | null>(null);
  public token$ = this.tokenSubject.asObservable();
  private expiryTimer?: ReturnType<typeof setTimeout>;
  private readonly userSessionMs = 15 * 60 * 1000;
  private readonly privilegedSessionMs = 30 * 60 * 1000;
  private readonly mockUsers: Array<User & { password: string }> = [
    { id: 'admin-1', email: 'admin@shophub.test', password: 'Admin@123', name: 'Admin Lead', role: 'admin', whatsappNumber: '+919900001001', createdDate: new Date() },
    { id: 'user-1', email: 'user1@shophub.test', password: 'User@123', name: 'Anika Rao', role: 'user', whatsappNumber: '+919900001011', createdDate: new Date() },
    { id: 'user-2', email: 'user2@shophub.test', password: 'User@123', name: 'Rahul Menon', role: 'user', whatsappNumber: '+919900001012', createdDate: new Date() },
    { id: 'user-3', email: 'user3@shophub.test', password: 'User@123', name: 'Meera Shah', role: 'user', whatsappNumber: '+919900001013', createdDate: new Date() },
    { id: 'seller-1', email: 'seller1@shophub.test', password: 'Seller@123', name: 'Urban Cart Co', role: 'seller', whatsappNumber: '+919900001101', createdDate: new Date() },
    { id: 'seller-2', email: 'seller2@shophub.test', password: 'Seller@123', name: 'Fresh Home Sellers', role: 'seller', whatsappNumber: '+919900001102', createdDate: new Date() },
    { id: 'seller-3', email: 'seller3@shophub.test', password: 'Seller@123', name: 'Tech Basket', role: 'seller', whatsappNumber: '+919900001103', createdDate: new Date() },
    { id: 'seller-4', email: 'seller4@shophub.test', password: 'Seller@123', name: 'Style Yard', role: 'seller', whatsappNumber: '+919900001104', createdDate: new Date() },
  ];

  constructor(private http: HttpClient) {
    this.loadUserFromStorage();
  }

  /**
   * Login user
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((response) => {
        if (response.statusCode === 200) {
          this.setUser(response.data.user);
          this.setToken(response.data.token);
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
      }),
      catchError(() => {
        const user = this.mockUsers.find((item) => item.email === email && item.password === password);
        if (!user) {
          throw new Error('Invalid login credentials');
        }
        const { password: _password, ...safeUser } = user;
        const response: AuthResponse = {
          statusCode: 200,
          message: 'Mock login successful. Backend API was not reachable.',
          data: {
            user: safeUser,
            token: `mock-token-${safeUser.role}-${Date.now()}`,
            refreshToken: `mock-refresh-${Date.now()}`,
          },
        };
        this.setUser(response.data.user);
        this.setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        return of(response);
      })
    );
  }

  /**
   * Register new user
   */
  register(user: Partial<User> & { password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, user).pipe(
      tap(() => undefined),
      catchError(() => {
        const newUser: User = {
          id: `${user.role || 'user'}-${Date.now()}`,
          email: user.email || '',
          name: user.name || 'New User',
          role: user.role || 'user',
          whatsappNumber: user.whatsappNumber,
          address: user.address,
          aadhaarId: user.aadhaarId,
          geoLocation: user.geoLocation,
          createdDate: new Date(),
        };
        const response: AuthResponse = {
          statusCode: 201,
          message: 'Mock registration successful. Backend API was not reachable.',
          data: {
            user: newUser,
            token: `mock-token-${newUser.role}-${Date.now()}`,
            refreshToken: `mock-refresh-${Date.now()}`,
          },
        };
        return of(response);
      })
    );
  }

  validateAadhaar(aadhaarId: string): Observable<AadhaarValidationResponse> {
    const normalizedAadhaar = aadhaarId.replace(/\D/g, '');
    return this.http
      .post<AadhaarValidationResponse>(`${this.apiUrl}/aadhaar/validate`, {
        aadhaarId: normalizedAadhaar,
      })
      .pipe(
        catchError(() =>
          of({
            statusCode: 200,
            message: normalizedAadhaar.length === 12
              ? 'Aadhaar format validated locally. Government portal was not reachable.'
              : 'Aadhaar must be 12 digits.',
            data: {
              aadhaarId: normalizedAadhaar,
              valid: normalizedAadhaar.length === 12,
              provider: 'local-format-check' as const,
            },
            timestamp: new Date().toISOString(),
          })
        )
      );
  }

  /**
   * Logout user
   */
  logout(): Observable<{ statusCode: number; message: string }> {
    this.clearUser();
    return this.http.post<{ statusCode: number; message: string }>(`${this.apiUrl}/logout`, {}).pipe(
      catchError(() => of({ statusCode: 200, message: 'Logged out locally' }))
    );
  }

  /**
   * Refresh token
   */
  refreshToken(): Observable<{ statusCode: number; message: string; data: { token: string } }> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http
      .post<{ statusCode: number; message: string; data: { token: string } }>(
        `${this.apiUrl}/refresh`,
        { refreshToken }
      )
      .pipe(
        tap((response) => {
          if (response.statusCode === 200) {
            this.setToken(response.data.token);
            localStorage.setItem('token', response.data.token);
          }
        })
      );
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const expiresAt = Number(localStorage.getItem('sessionExpiresAt') || 0);
    if (expiresAt && Date.now() > expiresAt) {
      this.clearUser();
      return false;
    }
    return !!this.currentUserSubject.value && !!this.tokenSubject.value;
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'admin';
  }

  /**
   * Update user profile
   */
  updateProfile(user: Partial<User>): Observable<AuthResponse> {
    return this.http.put<AuthResponse>(`${this.apiUrl}/profile`, user).pipe(
      tap((response) => {
        if (response.statusCode === 200) {
          this.setUser(response.data.user);
        }
      })
    );
  }

  /**
   * Get auth token
   */
  getToken(): string | null {
    return this.tokenSubject.value || localStorage.getItem('token');
  }

  // Private helper methods
  private setUser(user: User): void {
    this.currentUserSubject.next(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    const sessionMs = user.role === 'user' ? this.userSessionMs : this.privilegedSessionMs;
    const expiresAt = Date.now() + sessionMs;
    localStorage.setItem('sessionExpiresAt', expiresAt.toString());
    this.scheduleSessionExpiry(sessionMs);
  }

  private setToken(token: string): void {
    this.tokenSubject.next(token);
  }

  private clearUser(): void {
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
    }
    this.currentUserSubject.next(null);
    this.tokenSubject.next(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('sessionExpiresAt');
  }

  private loadUserFromStorage(): void {
    const user = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');
    if (user && token) {
      try {
        const expiresAt = Number(localStorage.getItem('sessionExpiresAt') || 0);
        if (expiresAt && Date.now() > expiresAt) {
          this.clearUser();
          return;
        }
        this.currentUserSubject.next(JSON.parse(user));
        this.tokenSubject.next(token);
        if (expiresAt) {
          this.scheduleSessionExpiry(expiresAt - Date.now());
        }
      } catch (error) {
        console.error('Error loading user from storage:', error);
      }
    }
  }

  private scheduleSessionExpiry(delayMs: number): void {
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
    }
    this.expiryTimer = setTimeout(() => this.clearUser(), Math.max(delayMs, 0));
  }
}
