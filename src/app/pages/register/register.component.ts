import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Address, AuthService, GeoLocation } from '@services/auth.service';
import { ConfirmDialogService } from '@services/confirm-dialog.service';
import { WhatsAppNotificationService } from '@services/whatsapp-notification.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: false,
})
export class RegisterComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('geoMap') geoMapRef?: ElementRef<HTMLDivElement>;

  role: 'user' | 'seller' = 'user';
  name = '';
  email = '';
  password = '';
  whatsappNumber = '';
  businessName = '';
  aadhaarId = '';
  aadhaarMessage = '';
  aadhaarMessageType: 'success' | 'error' = 'success';
  address: Address = {
    homeOrOfficeNumber: '',
    street: '',
    landmark: '',
    city: '',
    state: '',
    pin: '',
  };
  geoLocation?: GeoLocation;
  locationAccuracy?: number;
  locationLoading = false;
  private readonly goodLocationAccuracyMeters = 100;
  private readonly locationWatchTimeoutMs = 30000;
  private map?: any;
  private mapMarker?: any;
  private readonly defaultMapLocation: GeoLocation = {
    latitude: 12.9716,
    longitude: 77.5946,
  };
  message = '';
  messageType: 'success' | 'error' = 'success';
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private whatsappService: WhatsAppNotificationService,
    private confirmDialogService: ConfirmDialogService,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    const role = this.route.snapshot.queryParamMap.get('role');
    if (role === 'seller') {
      this.role = 'seller';
    }
  }

  ngAfterViewInit(): void {
    this.initGeoMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  register(): void {
    if (!this.isAddressValid()) {
      this.showError('Nearby/Landmark, City, State, and Pin are mandatory.');
      return;
    }

    if (this.aadhaarId && !this.isAadhaarFormatValid()) {
      this.showError('Aadhaar ID must be 12 digits when entered.');
      return;
    }

    this.confirmDialogService.openConfirmDialog({
      title: this.role === 'seller' ? 'Add product seller' : 'Add user',
      message: 'Are you sure to Add ?',
      confirmText: 'Add',
      cancelText: 'Cancel',
      type: 'add',
    });

    this.confirmDialogService.result$.pipe(take(1)).subscribe((result) => {
      if (!result.confirmed) return;
      this.submitRegistration();
    });
  }

  private submitRegistration(): void {
    this.loading = true;
    this.message = '';
    this.messageType = 'success';
    const name = this.role === 'seller' && this.businessName ? this.businessName : this.name;

    this.authService
      .register({
        name,
        email: this.email,
        password: this.password,
        role: this.role,
        whatsappNumber: this.whatsappService.formatPhoneNumber(this.whatsappNumber || '9900001999'),
        address: {
          homeOrOfficeNumber: this.address.homeOrOfficeNumber?.trim(),
          street: this.address.street?.trim(),
          landmark: this.address.landmark.trim(),
          city: this.address.city.trim(),
          state: this.address.state.trim(),
          pin: this.address.pin.trim(),
        },
        aadhaarId: this.aadhaarId ? this.normalizeAadhaar() : undefined,
        geoLocation: this.geoLocation,
      })
      .subscribe({
        next: (response) => {
          this.messageType = 'success';
          this.message =
            this.role === 'seller'
              ? 'You submitted the new registration. Admin will review and approve it, then you can try to login. It will take 24 hrs to approve.'
              : `${response.message || 'Registration successful.'} Please login now.`;
          if (this.role === 'seller') {
            this.whatsappService
              .notifyAdminSellerAdded(response.data.user.id, response.data.user.name)
              .subscribe({
                next: (notificationResponse) => {
                  this.message = `${this.message} ${notificationResponse.message}`;
                },
                error: () => {
                  this.message = `${this.message} Admin WhatsApp notification could not be sent.`;
                },
            });
          }
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          this.messageType = 'error';
          this.message =
            error?.error?.message || error?.message || 'Registration failed. Please verify fields or backend status.';
        },
      });
  }

  useGeoMapLocation(): void {
    if (!navigator.geolocation) {
      this.showError('GeoMap location is not supported in this browser.');
      return;
    }

    if (!window.isSecureContext) {
      this.showError('GeoMap location works only on HTTPS or localhost. Please run the app on localhost or use HTTPS.');
      return;
    }

    this.locationLoading = true;
    this.messageType = 'success';
    this.message = 'Finding exact browser location. This can take up to 30 seconds.';
    this.watchBrowserLocation();
  }

  private watchBrowserLocation(): void {
    let bestPosition: GeolocationPosition | null = null;
    let finished = false;
    let watchId: number | undefined;

    const finishWithPosition = (position: GeolocationPosition): void => {
      if (finished) return;
      finished = true;
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearTimeout(timeoutId);
      this.applyBrowserPosition(position);
    };

    const timeoutId = setTimeout(() => {
      if (finished) return;
      if (bestPosition) {
        finishWithPosition(bestPosition);
        return;
      }

      finished = true;
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
      this.requestSingleBrowserLocation();
    }, this.locationWatchTimeoutMs);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
          this.locationAccuracy = position.coords.accuracy;
          this.messageType = 'success';
          this.message = `Improving GeoMap accuracy. Current accuracy is about ${Math.round(position.coords.accuracy)} meters.`;
        }

        if (position.coords.accuracy <= this.goodLocationAccuracyMeters) {
          finishWithPosition(position);
        }
      },
      (error) => {
        if (bestPosition) {
          finishWithPosition(bestPosition);
          return;
        }

        finished = true;
        clearTimeout(timeoutId);
        if (watchId !== undefined) {
          navigator.geolocation.clearWatch(watchId);
        }
        this.requestSingleBrowserLocation(error);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: this.locationWatchTimeoutMs }
    );
  }

  private requestSingleBrowserLocation(previousError?: GeolocationPositionError): void {
    navigator.geolocation.getCurrentPosition(
      (position) => this.applyBrowserPosition(position),
      (error) => this.populateAddressFromIpLocation(previousError || error),
      { enableHighAccuracy: false, maximumAge: 120000, timeout: 20000 }
    );
  }

  private applyBrowserPosition(position: GeolocationPosition): void {
    this.locationAccuracy = position.coords.accuracy;
    this.geoLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    this.setMapSelection(this.geoLocation);
    this.populateAddressFromCoordinates(this.geoLocation, this.locationAccuracy);
  }

  validateAadhaar(): void {
    if (!this.aadhaarId) {
      this.aadhaarMessageType = 'success';
      this.aadhaarMessage = 'Aadhaar ID is optional.';
      return;
    }

    if (!this.isAadhaarFormatValid()) {
      this.aadhaarMessageType = 'error';
      this.aadhaarMessage = 'Aadhaar ID must be 12 digits.';
      return;
    }

    this.authService.validateAadhaar(this.aadhaarId).subscribe({
      next: (response) => {
        this.aadhaarMessageType = response.data.valid ? 'success' : 'error';
        this.aadhaarMessage = response.message;
      },
      error: (error) => {
        this.aadhaarMessageType = 'error';
        this.aadhaarMessage = error?.error?.message || 'Aadhaar validation failed.';
      },
    });
  }

  private populateAddressFromCoordinates(location: GeoLocation, accuracy?: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${location.latitude}&lon=${location.longitude}`;
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        const mapAddress = data.address || {};
        this.address.homeOrOfficeNumber = mapAddress.house_number || this.address.homeOrOfficeNumber || '';
        this.address.street = mapAddress.road || mapAddress.pedestrian || mapAddress.neighbourhood || this.address.street || '';
        this.address.landmark =
          mapAddress.suburb ||
          mapAddress.neighbourhood ||
          mapAddress.locality ||
          data.name ||
          this.address.landmark ||
          '';
        this.address.city =
          mapAddress.city || mapAddress.town || mapAddress.village || mapAddress.county || this.address.city || '';
        this.address.state = mapAddress.state || this.address.state || '';
        this.address.pin = mapAddress.postcode || this.address.pin || '';
        this.locationLoading = false;
        this.messageType = 'success';
        this.message = accuracy
          ? `GeoMap location selected with about ${Math.round(accuracy)} meters accuracy. Address fields were auto populated.`
          : 'GeoMap location selected and address fields were auto populated.';
      })
      .catch(() => {
        this.locationLoading = false;
        this.showError('GeoMap location was selected, but address lookup failed. Please complete the address manually.');
      });
  }

  private populateAddressFromIpLocation(geoError: GeolocationPositionError): void {
    fetch('https://ipapi.co/json/')
      .then((response) => response.json())
      .then((data) => {
        if (!data || data.error) {
          throw new Error('IP location lookup failed');
        }

        this.geoLocation = {
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
        };
        this.locationAccuracy = undefined;
        this.setMapSelection(this.geoLocation);
        this.address.city = data.city || this.address.city;
        this.address.state = data.region || this.address.state;
        this.address.pin = data.postal || this.address.pin;
        this.address.landmark = this.address.landmark || data.city || '';
        this.locationLoading = false;
        this.messageType = 'success';
        this.message =
          'Exact browser location was unavailable, so an approximate GeoMap location was used. Please verify the address fields.';
      })
      .catch(() => {
        this.locationLoading = false;
        this.showError(this.getGeoLocationErrorMessage(geoError));
      });
  }

  private initGeoMap(): void {
    if (!this.geoMapRef) return;

    this.loadLeaflet().then((leaflet) => {
      const center = this.geoLocation || this.defaultMapLocation;
      this.map = leaflet.map(this.geoMapRef!.nativeElement, {
        center: [center.latitude, center.longitude],
        zoom: 13,
      });

      leaflet
        .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        })
        .addTo(this.map);

      this.mapMarker = leaflet
        .marker([center.latitude, center.longitude], { draggable: true })
        .addTo(this.map);

      this.map.on('click', (event: any) => {
        this.zone.run(() => this.selectMapLocation(event.latlng.lat, event.latlng.lng));
      });

      this.mapMarker.on('dragend', () => {
        const markerLocation = this.mapMarker.getLatLng();
        this.zone.run(() => this.selectMapLocation(markerLocation.lat, markerLocation.lng));
      });

      setTimeout(() => this.map.invalidateSize(), 0);
    }).catch(() => {
      this.showError('GeoMap could not be loaded. Please check internet connection or enter address manually.');
    });
  }

  private selectMapLocation(latitude: number, longitude: number): void {
    this.locationLoading = true;
    this.locationAccuracy = undefined;
    this.geoLocation = { latitude, longitude };
    this.setMapSelection(this.geoLocation);
    this.populateAddressFromCoordinates(this.geoLocation);
  }

  private setMapSelection(location: GeoLocation): void {
    if (!this.map || !this.mapMarker) return;

    this.mapMarker.setLatLng([location.latitude, location.longitude]);
    this.map.setView([location.latitude, location.longitude], Math.max(this.map.getZoom(), 15));
  }

  private loadLeaflet(): Promise<any> {
    const existingLeaflet = (window as any).L;
    if (existingLeaflet) {
      return Promise.resolve(existingLeaflet);
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.getElementById('leaflet-js') as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve((window as any).L));
        existingScript.addEventListener('error', reject);
        return;
      }

      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve((window as any).L);
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  private isAddressValid(): boolean {
    return !!this.address.landmark.trim() && !!this.address.city.trim() && !!this.address.state.trim() && !!this.address.pin.trim();
  }

  private isAadhaarFormatValid(): boolean {
    return /^\d{12}$/.test(this.normalizeAadhaar());
  }

  private normalizeAadhaar(): string {
    return this.aadhaarId.replace(/\D/g, '');
  }

  private getGeoLocationErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'GeoMap permission is blocked by the browser or operating system. Please allow location permission or enter address manually.';
      case error.POSITION_UNAVAILABLE:
        return 'GeoMap location is currently unavailable on this device or network. Please enter address manually.';
      case error.TIMEOUT:
        return 'GeoMap location timed out. Please try again near a stronger GPS/Wi-Fi signal or enter address manually.';
      default:
        return 'Unable to access GeoMap location. Please enter address manually.';
    }
  }

  private showError(message: string): void {
    this.messageType = 'error';
    this.message = message;
  }
}
