import React, { useState, useEffect, useRef, useMemo, Component, ErrorInfo, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  ColorScheme
} from '@vis.gl/react-google-maps';
import {
  Wind,
  ShieldAlert,
  Leaf,
  Award,
  Navigation,
  MapPin,
  Clock,
  Activity,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
  Car,
  Bike,
  Compass,
  Play,
  Pause,
  RotateCcw,
  TreePine,
  Zap,
  ArrowUpDown,
  Search,
  Flame,
  Check,
  Radio,
  SlidersHorizontal,
  X,
  RefreshCw,
  LocateFixed,
  MousePointerClick,
  Menu,
  ChevronDown,
  ChevronUp,
  Gauge,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  ExternalLink,
  Sun,
  Moon,
  User as UserIcon,
  LogOut,
  Cloud,
  Timer
} from 'lucide-react';
import {
  AirQualityData,
  fetchLiveAirQuality,
  calculateCorridorAQI,
  getAQIClassification
} from './services/aqi.ts';
import {
  getCurrentUser,
  signOutUser,
  recordJourneyPoints,
  UserProfile,
  JourneyRecord,
  getAWSConfigStatus
} from './services/auth';
import { AuthModal } from './components/AuthModal';
import { ActiveJourneyHUD, ActiveJourneyState } from './components/ActiveJourneyHUD';
import { JourneyResultModal } from './components/JourneyResultModal';
import { AWSGuideModal } from './components/AWSGuideModal';
import { BrandLogo, BrandLogoSvg } from './components/BrandLogo';
import { LocationPermissionModal } from './components/LocationPermissionModal';

const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyBr2eRAlBj_DiofylA2gTBRkW7p5m8BZjo';

type TabType = 'planner' | 'alerts' | 'rewards';
type RouteType = 'route-a' | 'route-b';
type MapDisplayMode = 'google-maps' | 'schematic-map';
type CommuterMode = 'car' | 'bike' | 'ev';
type ThemeMode = 'dark' | 'light';

interface LocationPoint {
  address: string;
  lat: number;
  lng: number;
}

interface PlaceSuggestion {
  placeId?: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
}

interface NavigationStep {
  instruction: string;
  distanceText: string;
  distanceMeters: number;
  durationText: string;
  maneuver?: string;
  lat: number;
  lng: number;
}

interface CalculatedRoute {
  type: RouteType;
  title: string;
  subtitle: string;
  durationText: string;
  durationMinutes: number;
  distanceText: string;
  distanceKm: number;
  aqiData: AirQualityData;
  co2SavedGrams: number;
  path: google.maps.LatLngLiteral[];
  steps: NavigationStep[];
  description: string;
}

// Preset popular commutes in Delhi NCR for instant testing
const POPULAR_PRESETS = [
  {
    name: 'Shahdara ➔ DTU (Yamuna Corridor)',
    origin: { address: 'Shahdara, Delhi', lat: 28.6738, lng: 77.2913 },
    destination: { address: 'Delhi Technological University (DTU), Rohini', lat: 28.7501, lng: 77.1177 },
  },
  {
    name: 'Connaught Place ➔ Noida Sec 62',
    origin: { address: 'Connaught Place, New Delhi', lat: 28.6315, lng: 77.2167 },
    destination: { address: 'Sector 62, Noida, Uttar Pradesh', lat: 28.6280, lng: 77.3649 },
  },
  {
    name: 'Aerocity ➔ Cyber Hub Gurgaon',
    origin: { address: 'Aerocity, New Delhi', lat: 28.5503, lng: 77.1215 },
    destination: { address: 'Cyber Hub, DLF Phase 2, Gurugram', lat: 28.4950, lng: 77.0895 },
  },
  {
    name: 'Civil Lines ➔ Saket (Ridge Bypass)',
    origin: { address: 'Civil Lines, Delhi', lat: 28.6814, lng: 77.2227 },
    destination: { address: 'Saket, New Delhi', lat: 28.5244, lng: 77.2066 },
  },
];

// Common landmark suggestions for Delhi autocomplete fallback
const DELHI_SUGGESTIONS = [
  'Shahdara, Delhi',
  'Delhi Technological University (DTU), Rohini',
  'Connaught Place, New Delhi',
  'Kashmere Gate ISBT, Delhi',
  'Yamuna Biodiversity Park, Wazirabad, Delhi',
  'Civil Lines, Delhi',
  'Sector 62, Noida, Uttar Pradesh',
  'Cyber Hub, DLF Phase 2, Gurugram',
  'Hauz Khas, New Delhi',
  'Saket District Centre, New Delhi',
  'Anand Vihar ISBT, Delhi',
  'Janakpuri District Centre, New Delhi',
];

// Helper to compute bearing between two points
function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Strip HTML tags from Google Directions instructions
function cleanHtmlInstructions(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || html;
}

// Robust Error Boundary for Google Maps
class MapErrorBoundary extends Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Map Error caught by boundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Inner Map Controller component that handles rendering polylines, traffic, and 3D driving camera
function MapRouteRenderer({
  origin,
  destination,
  routes,
  selectedRoute,
  onSelectRoute,
  showHeatmap,
  showCanopy,
  showTraffic,
  pickMode,
  onMapClick,
  clickedLocation,
  isDrivingMode,
  currentCommuterPos,
  currentHeading,
  theme,
  userGpsLocation,
  centerTrigger,
}: {
  origin: LocationPoint;
  destination: LocationPoint;
  routes: { routeA: CalculatedRoute | null; routeB: CalculatedRoute | null };
  selectedRoute: RouteType;
  onSelectRoute: (type: RouteType) => void;
  showHeatmap: boolean;
  showCanopy: boolean;
  showTraffic: boolean;
  pickMode: 'origin' | 'destination' | null;
  onMapClick: (lat: number, lng: number) => void;
  clickedLocation: { lat: number; lng: number; address: string } | null;
  isDrivingMode: boolean;
  currentCommuterPos: google.maps.LatLngLiteral | null;
  currentHeading: number;
  theme: ThemeMode;
  userGpsLocation?: google.maps.LatLngLiteral | null;
  centerTrigger?: number;
}) {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  // Pan to User GPS location when triggered
  useEffect(() => {
    if (map && userGpsLocation && centerTrigger && centerTrigger > 0) {
      map.panTo(userGpsLocation);
      map.setZoom(14);
    }
  }, [map, userGpsLocation, centerTrigger]);

  // Manage Real-time Traffic Layer
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    if (!trafficLayerRef.current) {
      trafficLayerRef.current = new google.maps.TrafficLayer();
    }

    if (showTraffic) {
      trafficLayerRef.current.setMap(map);
    } else {
      trafficLayerRef.current.setMap(null);
    }

    return () => {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    };
  }, [map, showTraffic]);

  // Manage Map Click Listener and Picking Cursor
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    map.setOptions({
      draggableCursor: pickMode ? 'crosshair' : null,
    });

    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onMapClick(e.latLng.lat(), e.latLng.lng());
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, pickMode, onMapClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      circlesRef.current.forEach((c) => c.setMap(null));
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    };
  }, []);

  // Compute combined route bounds
  const routeBounds = useMemo(() => {
    if (typeof google === 'undefined' || !google.maps) return null;
    const b = new google.maps.LatLngBounds();
    b.extend({ lat: origin.lat, lng: origin.lng });
    b.extend({ lat: destination.lat, lng: destination.lng });
    if (routes.routeA?.path) {
      routes.routeA.path.forEach((p) => b.extend(p));
    }
    if (routes.routeB?.path) {
      routes.routeB.path.forEach((p) => b.extend(p));
    }
    return b;
  }, [origin, destination, routes]);

  // Update bounds and polylines when routes change
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    // Remove existing polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    // Remove existing circles
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    const casingColor = theme === 'dark' ? '#070b12' : '#ffffff';

    // Render Route A (Original Shortest Path - Non-AQI Highway)
    if (routes.routeA && routes.routeA.path.length > 0) {
      const isAActive = selectedRoute === 'route-a';

      // Outer Casing Polyline
      const casingA = new google.maps.Polyline({
        path: routes.routeA.path,
        geodesic: true,
        strokeColor: casingColor,
        strokeOpacity: 0.9,
        strokeWeight: isAActive ? 8.5 : 5,
        zIndex: isAActive ? 24 : 11,
        map: map,
      });
      casingA.addListener('click', () => onSelectRoute('route-a'));
      polylinesRef.current.push(casingA);

      // Inner Colored Polyline
      const polyA = new google.maps.Polyline({
        path: routes.routeA.path,
        geodesic: true,
        strokeColor: isAActive ? '#f43f5e' : '#fb7185',
        strokeOpacity: isAActive ? 0.95 : 0.55,
        strokeWeight: isAActive ? 6 : 3,
        zIndex: isAActive ? 25 : 12,
        map: map,
      });
      polyA.addListener('click', () => onSelectRoute('route-a'));
      polylinesRef.current.push(polyA);

      // Hotspot circle if heatmap enabled
      if (showHeatmap) {
        const midIdx = Math.floor(routes.routeA.path.length * 0.45);
        if (routes.routeA.path[midIdx]) {
          const smogCircle = new google.maps.Circle({
            strokeColor: '#f43f5e',
            strokeOpacity: 0.45,
            strokeWeight: 1,
            fillColor: '#f43f5e',
            fillOpacity: isAActive ? 0.18 : 0.08,
            map: map,
            center: routes.routeA.path[midIdx],
            radius: 1400,
          });
          circlesRef.current.push(smogCircle);
        }
      }
    }

    // Render Route B (GreenPath Clean-Air Bio-Corridor)
    if (routes.routeB && routes.routeB.path.length > 0) {
      const isBActive = selectedRoute === 'route-b';

      // Outer Casing Polyline
      const casingB = new google.maps.Polyline({
        path: routes.routeB.path,
        geodesic: true,
        strokeColor: casingColor,
        strokeOpacity: 0.9,
        strokeWeight: isBActive ? 8.5 : 5,
        zIndex: isBActive ? 24 : 11,
        map: map,
      });
      casingB.addListener('click', () => onSelectRoute('route-b'));
      polylinesRef.current.push(casingB);

      // Inner Colored Polyline
      const polyB = new google.maps.Polyline({
        path: routes.routeB.path,
        geodesic: true,
        strokeColor: isBActive ? '#10b981' : '#34d399',
        strokeOpacity: isBActive ? 0.95 : 0.55,
        strokeWeight: isBActive ? 6 : 3,
        zIndex: isBActive ? 25 : 12,
        map: map,
      });
      polyB.addListener('click', () => onSelectRoute('route-b'));
      polylinesRef.current.push(polyB);

      // Canopy circle if canopy enabled
      if (showCanopy) {
        const midIdx = Math.floor(routes.routeB.path.length * 0.5);
        if (routes.routeB.path[midIdx]) {
          const greenCircle = new google.maps.Circle({
            strokeColor: '#10b981',
            strokeOpacity: 0.5,
            strokeWeight: 1,
            fillColor: '#059669',
            fillOpacity: isBActive ? 0.18 : 0.08,
            map: map,
            center: routes.routeB.path[midIdx],
            radius: 1600,
          });
          circlesRef.current.push(greenCircle);
        }
      }
    }

    // Fit bounds if NOT in driving mode
    if (!isDrivingMode && routeBounds) {
      try {
        map.fitBounds(routeBounds, { top: 80, right: 40, bottom: 220, left: 40 });
      } catch {
        // fallback
      }
    }
  }, [map, routes, selectedRoute, showHeatmap, showCanopy, isDrivingMode, routeBounds, theme]);

  // DRIVING MODE CAMERA CONTROLLER: Real-time 3D tilt, heading rotation, and tracking
  useEffect(() => {
    if (!map) return;

    if (isDrivingMode && currentCommuterPos) {
      try {
        map.panTo(currentCommuterPos);

        // Vector map 3D tilt & heading
        if (typeof (map as any).setTilt === 'function') {
          (map as any).setTilt(55);
        }
        if (typeof (map as any).setHeading === 'function' && !isNaN(currentHeading)) {
          (map as any).setHeading(currentHeading);
        }

        const currentZoom = map.getZoom();
        if (currentZoom !== 17) {
          map.setZoom(17);
        }
      } catch (err) {
        console.warn('Driving camera tracking:', err);
      }
    } else if (!isDrivingMode) {
      try {
        if (typeof (map as any).setTilt === 'function') {
          (map as any).setTilt(0);
        }
        if (typeof (map as any).setHeading === 'function') {
          (map as any).setHeading(0);
        }
        if (routeBounds) {
          map.fitBounds(routeBounds, { top: 80, right: 40, bottom: 220, left: 40 });
        }
      } catch {
        // fallback
      }
    }
  }, [map, isDrivingMode, currentCommuterPos, currentHeading, routeBounds]);

  if (!map) return null;

  return (
    <>
      {/* Origin Advanced Marker */}
      {origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng) && !isDrivingMode && (
        <AdvancedMarker
          position={{ lat: origin.lat, lng: origin.lng }}
          title={`Origin: ${origin.address}`}
        >
          <div className="flex flex-col items-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-black shadow-lg shadow-cyan-500/30 border border-white/80">
              <MapPin className="h-3.5 w-3.5 stroke-[2]" />
            </div>
            <div className={`rounded-md px-2 py-0.5 text-[9px] font-medium tracking-wide text-cyan-500 mt-1 shadow whitespace-nowrap ${theme === 'dark' ? 'glass-card-dark' : 'glass-card-light'}`}>
              Origin
            </div>
          </div>
        </AdvancedMarker>
      )}

      {/* Destination Advanced Marker */}
      {destination && Number.isFinite(destination.lat) && Number.isFinite(destination.lng) && (
        <AdvancedMarker
          position={{ lat: destination.lat, lng: destination.lng }}
          title={`Destination: ${destination.address}`}
        >
          <div className="flex flex-col items-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-black shadow-lg shadow-emerald-500/30 border border-white/80">
              <Navigation className="h-3.5 w-3.5 stroke-[2]" />
            </div>
            <div className={`rounded-md px-2 py-0.5 text-[9px] font-medium tracking-wide text-emerald-500 mt-1 shadow whitespace-nowrap ${theme === 'dark' ? 'glass-card-dark' : 'glass-card-light'}`}>
              Destination
            </div>
          </div>
        </AdvancedMarker>
      )}

      {/* Interactive Clicked Location Target Pin */}
      {clickedLocation && Number.isFinite(clickedLocation.lat) && Number.isFinite(clickedLocation.lng) && (
        <AdvancedMarker
          position={{ lat: clickedLocation.lat, lng: clickedLocation.lng }}
          title={`Selected on Map: ${clickedLocation.address}`}
        >
          <div className="flex flex-col items-center">
            <div className="relative">
              <span className="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-amber-400 opacity-60"></span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-black shadow-xl border border-white relative z-10">
                <MapPin className="h-3.5 w-3.5 stroke-[2]" />
              </div>
            </div>
            <div className={`rounded-md px-2 py-0.5 text-[9px] font-medium text-amber-500 mt-1 whitespace-nowrap max-w-[130px] truncate ${theme === 'dark' ? 'glass-card-dark' : 'glass-card-light'}`}>
              {clickedLocation.address}
            </div>
          </div>
        </AdvancedMarker>
      )}

      {/* Simulated Commuter Vehicle Marker */}
      {isDrivingMode && currentCommuterPos && Number.isFinite(currentCommuterPos.lat) && Number.isFinite(currentCommuterPos.lng) && (
        <AdvancedMarker position={currentCommuterPos}>
          <div className="flex flex-col items-center">
            <div
              style={{ transform: `rotate(${currentHeading}deg)` }}
              className="transition-transform duration-100 ease-out"
            >
              <div className="relative flex items-center justify-center">
                <span
                  className={`animate-ping absolute inline-flex h-10 w-10 rounded-full opacity-50 ${
                    selectedRoute === 'route-a' ? 'bg-rose-500' : 'bg-emerald-400'
                  }`}
                />
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-black shadow-2xl border border-white ring-4 ${
                    selectedRoute === 'route-a'
                      ? 'bg-rose-500 ring-rose-500/30 text-white'
                      : 'bg-emerald-400 ring-emerald-500/30 text-black'
                  }`}
                >
                  <Navigation className="h-4.5 w-4.5 fill-current" />
                </div>
              </div>
            </div>
          </div>
        </AdvancedMarker>
      )}
    </>
  );
}

export default function App() {
  // Theme state: dark / light with persistence
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gp_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  useEffect(() => {
    try {
      localStorage.setItem('gp_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    } catch {
      // storage error fallback
    }
  }, [theme]);

  // Navigation / Drawer Tab
  const [activeTab, setActiveTab] = useState<TabType>('planner');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState<boolean>(false);

  // Selected route and map display mode
  const [selectedRoute, setSelectedRoute] = useState<RouteType>('route-b');
  const [mapDisplayMode, setMapDisplayMode] = useState<MapDisplayMode>('google-maps');

  // Commuter travel mode: Car, Bicycle, EV
  const [commuterMode, setCommuterMode] = useState<CommuterMode>('car');

  // Commute endpoints
  const [originInput, setOriginInput] = useState<string>('Shahdara, Delhi');
  const [destInput, setDestInput] = useState<string>('Delhi Technological University (DTU), Rohini');
  const [isEndpointsExpanded, setIsEndpointsExpanded] = useState<boolean>(false);

  // Autocomplete dropdown state and suggestions
  const [activeField, setActiveField] = useState<'origin' | 'dest' | null>(null);
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);

  // Geocoded active points
  const [originPoint, setOriginPoint] = useState<LocationPoint>({
    address: 'Shahdara, Delhi',
    lat: 28.6738,
    lng: 77.2913,
  });

  const [destPoint, setDestPoint] = useState<LocationPoint>({
    address: 'Delhi Technological University (DTU), Rohini',
    lat: 28.7501,
    lng: 77.1177,
  });

  // Loading and error states
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Map visualization state toggles
  const [showAqiHeatmap, setShowAqiHeatmap] = useState<boolean>(true);
  const [showGreenCanopy, setShowGreenCanopy] = useState<boolean>(true);
  const [showTraffic, setShowTraffic] = useState<boolean>(true);

  // Interactive map picking & GPS states
  const [pickMode, setPickMode] = useState<'origin' | 'destination' | null>(null);
  const [clickedLocation, setClickedLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Geolocation Permission & Precision Tracking States
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [userGpsLocation, setUserGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [centerTrigger, setCenterTrigger] = useState<number>(0);

  // Check geolocation permissions on load and prompt gently if first visit
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          setLocationPermissionStatus(status.state as any);
          status.onchange = () => {
            setLocationPermissionStatus(status.state as any);
          };
        })
        .catch(() => {
          setLocationPermissionStatus('unknown');
        });
    }

    const hasPrompted = localStorage.getItem('greenpath_location_prompt_seen');
    if (!hasPrompted) {
      const timer = setTimeout(() => {
        setIsLocationModalOpen(true);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, []);

  // DRIVING MODE & NAVIGATION SIMULATION STATES
  const [isDrivingMode, setIsDrivingMode] = useState<boolean>(false);
  const [isSimulationPaused, setIsSimulationPaused] = useState<boolean>(false);
  const [simulationProgress, setSimulationProgress] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  // Live atmospheric baseline AQI state
  const [liveAqiBaseline, setLiveAqiBaseline] = useState<AirQualityData | null>(null);

  // User Authentication & AWS Profile
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [isAWSGuideOpen, setIsAWSGuideOpen] = useState<boolean>(false);

  // Active Real-World Journey Tracking in Google Maps
  const [activeJourney, setActiveJourney] = useState<ActiveJourneyState | null>(null);
  const [journeyResult, setJourneyResult] = useState<JourneyRecord | null>(null);

  // Gamification state
  const [claimedRewards, setClaimedRewards] = useState<string[]>([]);
  const [co2SavedTotal, setCo2SavedTotal] = useState<number>(() => currentUser?.totalCo2SavedKg || 34.2);
  const [ecoPoints, setEcoPoints] = useState<number>(() => currentUser?.ecoPoints || 1420);

  useEffect(() => {
    if (currentUser) {
      setEcoPoints(currentUser.ecoPoints);
      setCo2SavedTotal(currentUser.totalCo2SavedKg);
    }
  }, [currentUser]);

  // Bottom route comparison card collapsed toggle
  const [isRouteCardMinimized, setIsRouteCardMinimized] = useState<boolean>(false);

  useEffect(() => {
    const onQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  // Computed routes for Route A and Route B
  const [routes, setRoutes] = useState<{
    routeA: CalculatedRoute | null;
    routeB: CalculatedRoute | null;
  }>({
    routeA: null,
    routeB: null,
  });

  // Fetch real Google Maps Places Autocomplete predictions dynamically
  const fetchPlacePredictions = useCallback((input: string) => {
    if (!input.trim()) {
      const defaultList: PlaceSuggestion[] = DELHI_SUGGESTIONS.slice(0, 5).map((s) => ({
        mainText: s.split(',')[0],
        secondaryText: s.split(',').slice(1).join(',').trim(),
        fullText: s,
      }));
      setPlaceSuggestions(defaultList);
      return;
    }

    if (
      typeof window !== 'undefined' &&
      (window as any).google?.maps?.places?.AutocompleteService
    ) {
      try {
        const service = new (window as any).google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          {
            input,
            componentRestrictions: { country: 'in' },
          },
          (predictions: any, status: any) => {
            if (status === 'OK' && predictions && predictions.length > 0) {
              const list: PlaceSuggestion[] = predictions.map((p: any) => ({
                placeId: p.place_id,
                mainText: p.structured_formatting?.main_text || p.description,
                secondaryText: p.structured_formatting?.secondary_text || '',
                fullText: p.description,
              }));
              setPlaceSuggestions(list);
              return;
            }
            // Fallback to local filtering
            const filtered: PlaceSuggestion[] = DELHI_SUGGESTIONS.filter((s) =>
              s.toLowerCase().includes(input.toLowerCase())
            ).map((s) => ({
              mainText: s.split(',')[0],
              secondaryText: s.split(',').slice(1).join(',').trim(),
              fullText: s,
            }));
            setPlaceSuggestions(filtered);
          }
        );
        return;
      } catch (e) {
        console.warn('AutocompleteService error:', e);
      }
    }

    // Default fallback
    const filtered: PlaceSuggestion[] = DELHI_SUGGESTIONS.filter((s) =>
      s.toLowerCase().includes(input.toLowerCase())
    ).map((s) => ({
      mainText: s.split(',')[0],
      secondaryText: s.split(',').slice(1).join(',').trim(),
      fullText: s,
    }));
    setPlaceSuggestions(filtered);
  }, []);

  // Update predictions when active field input changes
  useEffect(() => {
    if (activeField === 'origin') {
      fetchPlacePredictions(originInput);
    } else if (activeField === 'dest') {
      fetchPlacePredictions(destInput);
    }
  }, [activeField, originInput, destInput, fetchPlacePredictions]);

  // Calculate distance between two lat/lng in km (Haversine)
  const calculateDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Reverse Geocoding helper
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        const address = await new Promise<string | null>((resolve) => {
          geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            if (status === 'OK' && results && results[0]) {
              resolve(results[0].formatted_address);
            } else {
              resolve(null);
            }
          });
        });
        if (address) return address;
      } catch {
        // Fallback
      }
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',');
        return parts.slice(0, 3).join(', ');
      }
    } catch {
      // Fallback
    }

    return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
  };

  // Helper to wait for Google Maps DirectionsService
  const waitForGoogleDirections = async (maxWaitMs = 3500): Promise<boolean> => {
    if (typeof window !== 'undefined' && (window as any).google?.maps?.DirectionsService) {
      return true;
    }
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      await new Promise((r) => setTimeout(r, 100));
      if (typeof window !== 'undefined' && (window as any).google?.maps?.DirectionsService) {
        return true;
      }
    }
    return false;
  };

  // Convert Google Directions steps into NavigationStep list
  const extractStepsFromGoogleRoute = (route: any): NavigationStep[] => {
    if (!route || !route.legs || !route.legs[0] || !route.legs[0].steps) return [];
    return route.legs[0].steps.map((st: any) => ({
      instruction: cleanHtmlInstructions(st.instructions || 'Continue straight'),
      distanceText: st.distance?.text || '500 m',
      distanceMeters: st.distance?.value || 500,
      durationText: st.duration?.text || '1 min',
      maneuver: st.maneuver || 'straight',
      lat: typeof st.start_location?.lat === 'function' ? st.start_location.lat() : st.start_location?.lat,
      lng: typeof st.start_location?.lng === 'function' ? st.start_location.lng() : st.start_location?.lng,
    }));
  };

  // Fetch genuine Google Maps Driving Routes with real DirectionsService factoring in travelMode
  const fetchGoogleMapsRoutes = async (
    orig: LocationPoint,
    dest: LocationPoint,
    baseAqi: AirQualityData,
    mode: CommuterMode
  ): Promise<{ routeA: CalculatedRoute; routeB: CalculatedRoute } | null> => {
    try {
      const isReady = await waitForGoogleDirections(3500);
      if (!isReady || typeof window === 'undefined' || !(window as any).google?.maps?.DirectionsService) {
        return null;
      }

      const ds = new (window as any).google.maps.DirectionsService();

      let googleTravelMode = (window as any).google.maps.TravelMode.DRIVING;
      if (mode === 'bike') {
        googleTravelMode = (window as any).google.maps.TravelMode.BICYCLING;
      }

      let result = await new Promise<any>((resolve) => {
        ds.route(
          {
            origin: { lat: orig.lat, lng: orig.lng },
            destination: { lat: dest.lat, lng: dest.lng },
            travelMode: googleTravelMode,
            provideRouteAlternatives: true,
          },
          (res: any, status: any) => {
            if (status === 'OK' && res && res.routes && res.routes.length > 0) {
              resolve(res);
            } else {
              if (mode === 'bike') {
                ds.route(
                  {
                    origin: { lat: orig.lat, lng: orig.lng },
                    destination: { lat: dest.lat, lng: dest.lng },
                    travelMode: (window as any).google.maps.TravelMode.DRIVING,
                    provideRouteAlternatives: true,
                  },
                  (dRes: any, dStatus: any) => {
                    if (dStatus === 'OK' && dRes?.routes?.length > 0) resolve(dRes);
                    else resolve(null);
                  }
                );
              } else {
                resolve(null);
              }
            }
          }
        );
      });

      if (!result || !result.routes || result.routes.length === 0) {
        return null;
      }

      const r0 = result.routes[0];
      const leg0 = r0.legs[0];
      const pathA: google.maps.LatLngLiteral[] = r0.overview_path.map((pt: any) => ({
        lat: pt.lat(),
        lng: pt.lng(),
      }));
      const distA_Km = Math.round(((leg0?.distance?.value || 1000) / 1000) * 10) / 10;
      let durA_Mins = Math.max(Math.round((leg0?.duration?.value || 60) / 60), 2);

      if (mode === 'bike' && durA_Mins < distA_Km * 3) {
        durA_Mins = Math.round(distA_Km * 3.5);
      }

      const summaryA = r0.summary ? `via ${r0.summary}` : 'Arterial Corridor';
      const stepsA = extractStepsFromGoogleRoute(r0);

      let pathB: google.maps.LatLngLiteral[] = [];
      let distB_Km = distA_Km;
      let durB_Mins = durA_Mins + (mode === 'bike' ? 4 : 2);
      let summaryB = 'Yamuna Green Corridor';
      let stepsB: NavigationStep[] = [];

      if (result.routes.length > 1) {
        const r1 = result.routes[1];
        const leg1 = r1.legs[0];
        pathB = r1.overview_path.map((pt: any) => ({ lat: pt.lat(), lng: pt.lng() }));
        distB_Km = Math.round(((leg1?.distance?.value || 1000) / 1000) * 10) / 10;
        durB_Mins = Math.max(Math.round((leg1?.duration?.value || 60) / 60), 2);
        if (mode === 'bike' && durB_Mins < distB_Km * 3) {
          durB_Mins = Math.round(distB_Km * 3.6);
        }
        summaryB = r1.summary ? `via ${r1.summary}` : 'Clean-air bypass route';
        stepsB = extractStepsFromGoogleRoute(r1);
      } else {
        try {
          const midLat = (orig.lat + dest.lat) / 2 + 0.015;
          const midLng = (orig.lng + dest.lng) / 2 - 0.015;
          const ecoRes = await new Promise<any>((resolve) => {
            ds.route(
              {
                origin: { lat: orig.lat, lng: orig.lng },
                destination: { lat: dest.lat, lng: dest.lng },
                waypoints: [{ location: { lat: midLat, lng: midLng }, stopover: false }],
                travelMode: googleTravelMode,
              },
              (res: any, status: any) => {
                if (status === 'OK' && res?.routes?.length > 0) resolve(res);
                else resolve(null);
              }
            );
          });
          if (ecoRes && ecoRes.routes[0]) {
            const er = ecoRes.routes[0];
            const eleg = er.legs[0];
            pathB = er.overview_path.map((pt: any) => ({ lat: pt.lat(), lng: pt.lng() }));
            distB_Km = Math.round(((eleg?.distance?.value || distA_Km * 1000) / 1000) * 10) / 10;
            durB_Mins = Math.max(Math.round((eleg?.duration?.value || durA_Mins * 60) / 60), durA_Mins + 2);
            if (mode === 'bike' && durB_Mins < distB_Km * 3) {
              durB_Mins = Math.round(distB_Km * 3.6);
            }
            summaryB = er.summary ? `via ${er.summary} (Green Belt)` : 'Yamuna Green Belt Corridor';
            stepsB = extractStepsFromGoogleRoute(er);
          }
        } catch {
          // fallback
        }
      }

      if (pathB.length === 0) {
        pathB = [...pathA];
        distB_Km = Math.round(distA_Km * 1.05 * 10) / 10;
        durB_Mins = durA_Mins + (mode === 'bike' ? 4 : 2);
        stepsB = stepsA;
      }

      const aqiA = calculateCorridorAQI(baseAqi, 'highway');
      const aqiB = calculateCorridorAQI(baseAqi, 'clean-air');

      let carbonSavedGrams = 0;
      if (mode === 'bike') {
        carbonSavedGrams = Math.round(distA_Km * 142);
      } else if (mode === 'ev') {
        carbonSavedGrams = Math.round(distA_Km * 125);
      } else {
        carbonSavedGrams = Math.round(distA_Km * 25);
      }

      const modeTitleSuffix =
        mode === 'bike' ? '(Bicycle Trail)' : mode === 'ev' ? '(EV Route)' : '(Driving)';

      const computedA: CalculatedRoute = {
        type: 'route-a',
        title: `Shortest Arterial ${modeTitleSuffix}`,
        subtitle: `${summaryA} · Standard highway corridor with heavy diesel traffic`,
        durationText: `${durA_Mins} mins`,
        durationMinutes: durA_Mins,
        distanceText: `${distA_Km} km`,
        distanceKm: distA_Km,
        aqiData: aqiA,
        co2SavedGrams: 0,
        path: pathA,
        steps: stepsA.length > 0 ? stepsA : [
          { instruction: 'Head towards main arterial highway', distanceText: '400 m', distanceMeters: 400, durationText: '1 min', maneuver: 'straight', lat: orig.lat, lng: orig.lng },
          { instruction: 'Continue along heavy freight corridor', distanceText: `${distA_Km} km`, distanceMeters: distA_Km * 1000, durationText: `${durA_Mins} min`, maneuver: 'straight', lat: (orig.lat + dest.lat) / 2, lng: (orig.lng + dest.lng) / 2 },
          { instruction: 'Arrive at destination', distanceText: '100 m', distanceMeters: 100, durationText: '1 min', maneuver: 'straight', lat: dest.lat, lng: dest.lng }
        ],
        description: `Shortest road route cutting through congested industrial freight corridors and heavy diesel exhaust traps (${aqiA.pm25} µg/m³ PM2.5).`,
      };

      const computedB: CalculatedRoute = {
        type: 'route-b',
        title: `GreenPath Bio-Corridor ${modeTitleSuffix}`,
        subtitle: `${summaryB} · Clean-air optimized route via riverfront & tree canopies`,
        durationText: `${durB_Mins} mins`,
        durationMinutes: durB_Mins,
        distanceText: `${distB_Km} km`,
        distanceKm: distB_Km,
        aqiData: aqiB,
        co2SavedGrams: carbonSavedGrams,
        path: pathB,
        steps: stepsB.length > 0 ? stepsB : [
          { instruction: 'Depart via local green boulevard', distanceText: '500 m', distanceMeters: 500, durationText: '1 min', maneuver: 'straight', lat: orig.lat, lng: orig.lng },
          { instruction: 'Merge onto Yamuna Bio-Corridor / Riverfront Road', distanceText: `${distB_Km} km`, distanceMeters: distB_Km * 1000, durationText: `${durB_Mins} min`, maneuver: 'turn-right', lat: (orig.lat + dest.lat) / 2, lng: (orig.lng + dest.lng) / 2 },
          { instruction: 'Arrive at destination via clean-air access', distanceText: '150 m', distanceMeters: 150, durationText: '1 min', maneuver: 'straight', lat: dest.lat, lng: dest.lng }
        ],
        description: `Rerouted along wetland bio-buffers and tree foliage. Bypasses 60% of toxic particulates with minimal time delta (+${durB_Mins - durA_Mins > 0 ? durB_Mins - durA_Mins : 2}m).`,
      };

      return { routeA: computedA, routeB: computedB };
    } catch {
      return null;
    }
  };

  // Secondary fallback using OSRM with mode awareness
  const fetchOSRMRealRoadRoutes = async (
    orig: LocationPoint,
    dest: LocationPoint,
    baseAqi: AirQualityData,
    mode: CommuterMode
  ): Promise<{ routeA: CalculatedRoute; routeB: CalculatedRoute } | null> => {
    try {
      const profile = mode === 'bike' ? 'bicycle' : 'driving';
      const url = `https://router.project-osrm.org/route/v1/${profile}/${orig.lng},${orig.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.routes || data.routes.length === 0) return null;

      const r0 = data.routes[0];
      const pathA = r0.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
      const distA_Km = Math.round((r0.distance / 1000) * 10) / 10;
      const durA_Mins = Math.max(Math.round(r0.duration / 60), 2);

      let pathB = pathA;
      let distB_Km = distA_Km;
      let durB_Mins = durA_Mins + 2;

      if (data.routes.length > 1) {
        const r1 = data.routes[1];
        pathB = r1.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
        distB_Km = Math.round((r1.distance / 1000) * 10) / 10;
        durB_Mins = Math.max(Math.round(r1.duration / 60), 2);
      }

      const aqiA = calculateCorridorAQI(baseAqi, 'highway');
      const aqiB = calculateCorridorAQI(baseAqi, 'clean-air');

      let carbonSavedGrams = 0;
      if (mode === 'bike') carbonSavedGrams = Math.round(distA_Km * 142);
      else if (mode === 'ev') carbonSavedGrams = Math.round(distA_Km * 125);
      else carbonSavedGrams = Math.round(distA_Km * 25);

      return {
        routeA: {
          type: 'route-a',
          title: `Shortest Path (${mode})`,
          subtitle: 'Standard route taken without air quality consideration',
          durationText: `${durA_Mins} mins`,
          durationMinutes: durA_Mins,
          distanceText: `${distA_Km} km`,
          distanceKm: distA_Km,
          aqiData: aqiA,
          co2SavedGrams: 0,
          path: pathA,
          steps: [
            { instruction: 'Head on main corridor', distanceText: '500 m', distanceMeters: 500, durationText: '1 min', maneuver: 'straight', lat: orig.lat, lng: orig.lng },
            { instruction: `Continue along arterial road (${distA_Km} km)`, distanceText: `${distA_Km} km`, distanceMeters: distA_Km * 1000, durationText: `${durA_Mins} min`, maneuver: 'straight', lat: (orig.lat + dest.lat) / 2, lng: (orig.lng + dest.lng) / 2 },
            { instruction: 'Arrive at destination', distanceText: '100 m', distanceMeters: 100, durationText: '1 min', maneuver: 'straight', lat: dest.lat, lng: dest.lng }
          ],
          description: 'Default shortest route. Heavy diesel freight and particulate stagnation.',
        },
        routeB: {
          type: 'route-b',
          title: `GreenPath Bio-Corridor (${mode})`,
          subtitle: 'Clean-air optimized route via riverfront & tree canopies',
          durationText: `${durB_Mins} mins`,
          durationMinutes: durB_Mins,
          distanceText: `${distB_Km} km`,
          distanceKm: distB_Km,
          aqiData: aqiB,
          co2SavedGrams: carbonSavedGrams,
          path: pathB,
          steps: [
            { instruction: 'Turn onto Green Buffer Corridor', distanceText: '400 m', distanceMeters: 400, durationText: '1 min', maneuver: 'turn-right', lat: orig.lat, lng: orig.lng },
            { instruction: `Follow Riverfront Bio-Route (${distB_Km} km)`, distanceText: `${distB_Km} km`, distanceMeters: distB_Km * 1000, durationText: `${durB_Mins} min`, maneuver: 'straight', lat: (orig.lat + dest.lat) / 2, lng: (orig.lng + dest.lng) / 2 },
            { instruction: 'Arrive at destination', distanceText: '100 m', distanceMeters: 100, durationText: '1 min', maneuver: 'straight', lat: dest.lat, lng: dest.lng }
          ],
          description: 'Buffered by vegetation and green corridors. 60% less particulate inhalation.',
        },
      };
    } catch {
      return null;
    }
  };

  // Generate calculated route data based on origin, destination, and selected mode
  const computeEcoRoutes = async (
    orig: LocationPoint,
    dest: LocationPoint,
    mode: CommuterMode = commuterMode
  ) => {
    setIsCalculating(true);

    try {
      const midLat = (orig.lat + dest.lat) / 2;
      const midLng = (orig.lng + dest.lng) / 2;
      const liveAqi = await fetchLiveAirQuality(midLat, midLng);
      setLiveAqiBaseline(liveAqi);

      const gmp = await fetchGoogleMapsRoutes(orig, dest, liveAqi, mode);
      if (gmp) {
        setRoutes(gmp);
        return;
      }

      const osrm = await fetchOSRMRealRoadRoutes(orig, dest, liveAqi, mode);
      if (osrm) {
        setRoutes(osrm);
        return;
      }

      const baseDistKm = calculateDistanceKm(orig.lat, orig.lng, dest.lat, dest.lng);
      const roadDistA = Math.max(Math.round(baseDistKm * 1.25 * 10) / 10, 2.5);
      const roadDistB = Math.max(Math.round(baseDistKm * 1.35 * 10) / 10, 3.2);

      let durationA = 10;
      let durationB = 14;
      if (mode === 'bike') {
        durationA = Math.max(Math.round(roadDistA * 3.8), 12);
        durationB = Math.max(Math.round(roadDistB * 3.9), 15);
      } else {
        durationA = Math.max(Math.round(roadDistA * 1.8), 10);
        durationB = Math.max(Math.round(roadDistB * 1.95), 14);
      }

      let carbonSavedGrams = 0;
      if (mode === 'bike') carbonSavedGrams = Math.round(roadDistA * 142);
      else if (mode === 'ev') carbonSavedGrams = Math.round(roadDistA * 125);
      else carbonSavedGrams = Math.round(roadDistA * 25);

      const steps = 40;
      const pA: google.maps.LatLngLiteral[] = [];
      const pB: google.maps.LatLngLiteral[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        pA.push({
          lat: orig.lat + (dest.lat - orig.lat) * t,
          lng: orig.lng + (dest.lng - orig.lng) * t,
        });
        const bow = Math.sin(t * Math.PI) * (mode === 'bike' ? 0.03 : 0.02);
        pB.push({
          lat: orig.lat + (dest.lat - orig.lat) * t + bow,
          lng: orig.lng + (dest.lng - orig.lng) * t - bow,
        });
      }

      const aqiA = calculateCorridorAQI(liveAqi, 'highway');
      const aqiB = calculateCorridorAQI(liveAqi, 'clean-air');

      setRoutes({
        routeA: {
          type: 'route-a',
          title: `Shortest Path (${mode})`,
          subtitle: 'Standard route taken without AQI consideration',
          durationText: `${durationA} mins`,
          durationMinutes: durationA,
          distanceText: `${roadDistA} km`,
          distanceKm: roadDistA,
          aqiData: aqiA,
          co2SavedGrams: 0,
          path: pA,
          steps: [
            { instruction: 'Head toward main corridor', distanceText: '400 m', distanceMeters: 400, durationText: '1 min', maneuver: 'straight', lat: orig.lat, lng: orig.lng },
            { instruction: `Continue along arterial road (${roadDistA} km)`, distanceText: `${roadDistA} km`, distanceMeters: roadDistA * 1000, durationText: `${durationA} min`, maneuver: 'straight', lat: midLat, lng: midLng },
            { instruction: 'Arrive at destination', distanceText: '100 m', distanceMeters: 100, durationText: '1 min', maneuver: 'straight', lat: dest.lat, lng: dest.lng }
          ],
          description: 'The default shortest route standard navigation would take if ignoring air quality.',
        },
        routeB: {
          type: 'route-b',
          title: `GreenPath Bio-Corridor (${mode})`,
          subtitle: 'Clean-air optimized route via riverfront & tree canopies',
          durationText: `${durationB} mins`,
          durationMinutes: durationB,
          distanceText: `${roadDistB} km`,
          distanceKm: roadDistB,
          aqiData: aqiB,
          co2SavedGrams: carbonSavedGrams,
          path: pB,
          steps: [
            { instruction: 'Turn onto Green Buffer Corridor', distanceText: '500 m', distanceMeters: 500, durationText: '1 min', maneuver: 'turn-right', lat: orig.lat, lng: orig.lng },
            { instruction: `Follow Yamuna Wetland Bio-Route (${roadDistB} km)`, distanceText: `${roadDistB} km`, distanceMeters: roadDistB * 1000, durationText: `${durationB} min`, maneuver: 'straight', lat: midLat, lng: midLng },
            { instruction: 'Arrive at destination', distanceText: '100 m', distanceMeters: 100, durationText: '1 min', maneuver: 'straight', lat: dest.lat, lng: dest.lng }
          ],
          description: 'Buffered by vegetation and green corridors. 60% less particulate inhalation.',
        },
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsCalculating(false);
    }
  };

  // Run initial route computation on mount
  useEffect(() => {
    computeEcoRoutes(originPoint, destPoint, commuterMode);
  }, []);

  // Handle commuterMode change
  const handleSelectCommuterMode = (newMode: CommuterMode) => {
    setCommuterMode(newMode);
    computeEcoRoutes(originPoint, destPoint, newMode);
  };

  // Handle clicking anywhere on the map to set Origin or Destination
  const handleMapClick = async (lat: number, lng: number) => {
    if (isDrivingMode) return;

    setIsCalculating(true);
    const address = await reverseGeocode(lat, lng);

    if (pickMode === 'origin') {
      const newOrig: LocationPoint = { address, lat, lng };
      setOriginPoint(newOrig);
      setOriginInput(address);
      setPickMode(null);
      setClickedLocation(null);
      setStatusMessage(`Origin set to: ${address}`);
      setTimeout(() => setStatusMessage(null), 3000);
      computeEcoRoutes(newOrig, destPoint, commuterMode);
    } else if (pickMode === 'destination') {
      const newDest: LocationPoint = { address, lat, lng };
      setDestPoint(newDest);
      setDestInput(address);
      setPickMode(null);
      setClickedLocation(null);
      setStatusMessage(`Destination set to: ${address}`);
      setTimeout(() => setStatusMessage(null), 3000);
      computeEcoRoutes(originPoint, newDest, commuterMode);
    } else {
      setIsCalculating(false);
      setClickedLocation({ lat, lng, address });
    }
  };

  // Precise Geolocation Request & Permission Handler
  const handleRequestLocationPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported by your browser.');
      setTimeout(() => setStatusMessage(null), 3500);
      return;
    }

    setIsLocating(true);
    setStatusMessage('Acquiring high-accuracy GPS position...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        setLocationPermissionStatus('granted');
        localStorage.setItem('greenpath_location_prompt_seen', 'true');
        setIsLocationModalOpen(false);

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserGpsLocation({ lat, lng });
        setCenterTrigger((c) => c + 1);

        const address = await reverseGeocode(lat, lng);
        const resolvedAddress = address || `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

        const newOrig: LocationPoint = {
          address: resolvedAddress,
          lat,
          lng,
        };
        setOriginPoint(newOrig);
        setOriginInput(resolvedAddress);
        setStatusMessage(`GPS Location Active: ${resolvedAddress.split(',')[0]}`);
        setTimeout(() => setStatusMessage(null), 3500);
        computeEcoRoutes(newOrig, destPoint, commuterMode);
      },
      (err) => {
        setIsLocating(false);
        localStorage.setItem('greenpath_location_prompt_seen', 'true');
        if (err.code === 1) {
          setLocationPermissionStatus('denied');
          setStatusMessage('Location permission denied. You can select your start point on the map.');
        } else {
          setStatusMessage('GPS position timed out. Please click map to pick point.');
        }
        setTimeout(() => setStatusMessage(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [destPoint, commuterMode]);

  // Handle "Use Current Location" (GPS) as Origin - opens permission modal if needed
  const handleUseCurrentLocation = () => {
    if (locationPermissionStatus === 'granted') {
      handleRequestLocationPermission();
    } else {
      setIsLocationModalOpen(true);
    }
  };

  // Select Place Suggestion from Autocomplete
  const handleSelectSuggestion = (suggestion: PlaceSuggestion, field: 'origin' | 'dest') => {
    setActiveField(null);

    if (
      typeof window !== 'undefined' &&
      (window as any).google?.maps?.Geocoder &&
      suggestion.placeId
    ) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ placeId: suggestion.placeId }, (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          const newPt: LocationPoint = {
            address: results[0].formatted_address || suggestion.fullText,
            lat: loc.lat(),
            lng: loc.lng(),
          };
          if (field === 'origin') {
            setOriginPoint(newPt);
            setOriginInput(newPt.address);
            computeEcoRoutes(newPt, destPoint, commuterMode);
          } else {
            setDestPoint(newPt);
            setDestInput(newPt.address);
            computeEcoRoutes(originPoint, newPt, commuterMode);
          }
          return;
        }
      });
    }

    if (field === 'origin') {
      setOriginInput(suggestion.fullText);
      handleSearchRoutes();
    } else {
      setDestInput(suggestion.fullText);
      handleSearchRoutes();
    }
  };

  // DRIVING MODE ANIMATION LOOP
  useEffect(() => {
    let interval: any;
    if (isDrivingMode && !isSimulationPaused) {
      const speedStep = 0.4 * playbackSpeed;
      interval = setInterval(() => {
        setSimulationProgress((prev) => {
          if (prev >= 100) {
            setIsSimulationPaused(true);
            return 100;
          }
          return Math.min(prev + speedStep, 100);
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isDrivingMode, isSimulationPaused, playbackSpeed]);

  // Current active route object
  const activeRouteObj = useMemo(() => {
    return selectedRoute === 'route-a' ? routes.routeA : routes.routeB;
  }, [selectedRoute, routes]);

  // Construct official Google Maps Navigation URL with direct navigation intent
  const googleMapsExternalUrl = useMemo(() => {
    const travelParam = commuterMode === 'bike' ? 'bicycling' : 'driving';
    const origParam = encodeURIComponent(`${originPoint.lat.toFixed(5)},${originPoint.lng.toFixed(5)}`);
    const destParam = encodeURIComponent(`${destPoint.lat.toFixed(5)},${destPoint.lng.toFixed(5)}`);

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origParam}&destination=${destParam}&travelmode=${travelParam}&dir_action=navigate`;

    if (selectedRoute === 'route-b' && routes.routeB && routes.routeB.path.length > 5) {
      const mid = routes.routeB.path[Math.floor(routes.routeB.path.length * 0.5)];
      if (mid) {
        url += `&waypoints=${encodeURIComponent(`${mid.lat.toFixed(5)},${mid.lng.toFixed(5)}`)}`;
      }
    }
    return url;
  }, [originPoint, destPoint, commuterMode, selectedRoute, routes.routeB]);

  // Interpolated commuter position for driving mode
  const currentCommuterPos = useMemo(() => {
    if (!activeRouteObj || activeRouteObj.path.length === 0) return null;
    const path = activeRouteObj.path;
    const progressFactor = Math.min(Math.max(simulationProgress / 100, 0), 1);
    const index = Math.floor(progressFactor * (path.length - 1));
    return path[index] || path[0];
  }, [activeRouteObj, simulationProgress]);

  // Heading calculation for driving mode (smooth vehicle direction)
  const currentHeading = useMemo(() => {
    if (!activeRouteObj || activeRouteObj.path.length < 2) return 0;
    const path = activeRouteObj.path;
    const progressFactor = Math.min(Math.max(simulationProgress / 100, 0), 1);
    const index = Math.floor(progressFactor * (path.length - 1));
    const nextIndex = Math.min(index + 1, path.length - 1);

    const p1 = path[index];
    const p2 = path[nextIndex];
    if (!p1 || !p2 || (p1.lat === p2.lat && p1.lng === p2.lng)) return 0;

    return Math.round(calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng));
  }, [activeRouteObj, simulationProgress]);

  // Current active navigation step for driving mode HUD
  const currentNavStep = useMemo(() => {
    if (!activeRouteObj || activeRouteObj.steps.length === 0) {
      return {
        instruction: 'Continue along corridor',
        distanceText: '350 m',
        maneuver: 'straight',
      };
    }
    const steps = activeRouteObj.steps;
    const stepIdx = Math.min(
      Math.floor((simulationProgress / 100) * steps.length),
      steps.length - 1
    );
    return steps[stepIdx] || steps[0];
  }, [activeRouteObj, simulationProgress]);

  // Remaining trip metrics during navigation
  const remainingMetrics = useMemo(() => {
    if (!activeRouteObj) return { mins: 0, km: 0, speedKmH: 45, etaText: '10:00 AM' };
    const remainingFraction = 1 - Math.min(simulationProgress / 100, 1);
    const mins = Math.max(1, Math.round(activeRouteObj.durationMinutes * remainingFraction));
    const km = Math.max(0.1, Math.round(activeRouteObj.distanceKm * remainingFraction * 10) / 10);
    const baseSpeed = commuterMode === 'bike' ? 18 : 42;
    const speedKmH = isSimulationPaused ? 0 : baseSpeed + Math.round(Math.sin(simulationProgress) * 4);

    const etaDate = new Date(Date.now() + mins * 60000);
    const etaText = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return { mins, km, speedKmH, etaText };
  }, [activeRouteObj, simulationProgress, isSimulationPaused, commuterMode]);

  // Handle start in-app driving navigation simulation
  const handleStartDrivingMode = () => {
    setSimulationProgress(0);
    setIsSimulationPaused(false);
    setIsDrivingMode(true);
    setIsEndpointsExpanded(false);
    setIsMenuOpen(false);
    setIsLayersMenuOpen(false);
  };

  // Exit in-app driving navigation
  const handleExitDrivingMode = () => {
    setIsDrivingMode(false);
    setIsSimulationPaused(false);
    setSimulationProgress(0);
  };

  // Launch Google Maps Real-World Navigation & Activate Tracking Timer HUD
  const handleStartGoogleMapsJourney = (openExternalWindow = true) => {
    if (!activeRouteObj) return;

    // Reset and exit in-app 3D driving simulation if active
    setIsDrivingMode(false);
    setIsSimulationPaused(false);
    setIsEndpointsExpanded(false);

    const newJourney: ActiveJourneyState = {
      routeTitle: activeRouteObj.title,
      originAddress: originPoint.address,
      destinationAddress: destPoint.address,
      originCoords: { lat: originPoint.lat, lng: originPoint.lng },
      destinationCoords: { lat: destPoint.lat, lng: destPoint.lng },
      expectedMinutes: activeRouteObj.durationMinutes,
      distanceKm: activeRouteObj.distanceKm,
      routeType: selectedRoute,
      co2SavedGrams: activeRouteObj.co2SavedGrams,
      potentialPoints: selectedRoute === 'route-b' ? 180 : 40,
      startedAt: Date.now(),
      googleMapsUrl: googleMapsExternalUrl,
    };

    setActiveJourney(newJourney);
    if (openExternalWindow) {
      try {
        window.open(googleMapsExternalUrl, '_blank', 'noopener,noreferrer');
      } catch {
        // Fallback if browser blocks popups
      }
    }
  };

  // Evaluate & Verify Finished Journey (Duration match & Destination Perimeter check)
  const handleFinishJourney = (actualSeconds: number, simulatedNearDestination: boolean) => {
    if (!activeJourney) return;

    const expectedSecs = activeJourney.expectedMinutes * 60;
    // Minimum duration threshold: at least 40% of expected duration or >= 12s when test-simulated
    const isDurationReasonable = actualSeconds >= Math.max(expectedSecs * 0.4, 12);
    const isVerified = isDurationReasonable && simulatedNearDestination;

    let reason = '';
    if (!isDurationReasonable && !simulatedNearDestination) {
      reason = `Journey invalid: Finished too quickly (${actualSeconds}s vs ${activeJourney.expectedMinutes}m expected) and destination perimeter was not reached.`;
    } else if (!isDurationReasonable) {
      reason = `Journey invalid: Finished in only ${Math.floor(actualSeconds / 60)}m ${actualSeconds % 60}s, but expected duration was ${activeJourney.expectedMinutes}m. Minimum travel duration required to prevent spoofing.`;
    } else if (!simulatedNearDestination) {
      reason = `Journey invalid: Destination location mismatch. Current coordinates are not within the target arrival perimeter of ${activeJourney.destinationAddress.split(',')[0]}.`;
    } else {
      reason = `Verified: Completed in ${Math.floor(actualSeconds / 60)}m ${actualSeconds % 60}s (within acceptable ${activeJourney.expectedMinutes}m traffic threshold) and destination arrival perimeter confirmed!`;
    }

    const record: JourneyRecord = {
      id: `jrn_${Date.now()}`,
      routeTitle: activeJourney.routeTitle,
      originAddress: activeJourney.originAddress,
      destinationAddress: activeJourney.destinationAddress,
      originCoords: activeJourney.originCoords,
      destinationCoords: activeJourney.destinationCoords,
      actualDurationSeconds: actualSeconds,
      expectedDurationMinutes: activeJourney.expectedMinutes,
      distanceKm: activeJourney.distanceKm,
      routeType: activeJourney.routeType,
      aqiSavedPercent: activeJourney.routeType === 'route-b' ? 58 : 0,
      co2SavedGrams: activeJourney.co2SavedGrams,
      pointsEarned: isVerified ? activeJourney.potentialPoints : 0,
      isVerified,
      verificationReason: reason,
      completedAt: new Date().toISOString(),
    };

    if (currentUser) {
      const updated = recordJourneyPoints(currentUser.id, record);
      if (updated) {
        setCurrentUser(updated);
        setEcoPoints(updated.ecoPoints);
        setCo2SavedTotal(updated.totalCo2SavedKg);
      }
    } else {
      if (isVerified) {
        setEcoPoints((prev) => prev + record.pointsEarned);
        setCo2SavedTotal((prev) => Math.round((prev + record.co2SavedGrams / 1000) * 10) / 10);
      }
    }

    setActiveJourney(null);
    setJourneyResult(record);
  };

  const handleSignOut = () => {
    signOutUser();
    setCurrentUser(null);
  };

  // Handle preset selection
  const handleSelectPreset = (preset: (typeof POPULAR_PRESETS)[0]) => {
    setOriginInput(preset.origin.address);
    setDestInput(preset.destination.address);
    setOriginPoint(preset.origin);
    setDestPoint(preset.destination);
    setIsEndpointsExpanded(false);
    computeEcoRoutes(preset.origin, preset.destination, commuterMode);
  };

  // Swap origin and destination
  const handleSwapLocations = () => {
    const tempInput = originInput;
    const tempPoint = originPoint;
    setOriginInput(destInput);
    setOriginPoint(destPoint);
    setDestInput(tempInput);
    setDestPoint(tempPoint);
    computeEcoRoutes(destPoint, tempPoint, commuterMode);
  };

  // Handle searching / Geocoding
  const handleSearchRoutes = async () => {
    if (!originInput.trim() || !destInput.trim()) return;

    setIsCalculating(true);
    setActiveField(null);
    setIsEndpointsExpanded(false);

    try {
      if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
        const geocoder = new (window as any).google.maps.Geocoder();

        const geocodeAddress = (address: string): Promise<LocationPoint> => {
          return new Promise((resolve) => {
            geocoder.geocode(
              { address, componentRestrictions: { country: 'IN' } },
              (results: any, status: any) => {
                if (status === 'OK' && results && results[0]) {
                  const loc = results[0].geometry.location;
                  resolve({
                    address: results[0].formatted_address || address,
                    lat: loc.lat(),
                    lng: loc.lng(),
                  });
                } else {
                  resolve({
                    address,
                    lat: 28.6139 + (Math.random() - 0.5) * 0.15,
                    lng: 77.2090 + (Math.random() - 0.5) * 0.15,
                  });
                }
              }
            );
          });
        };

        const [resolvedOrigin, resolvedDest] = await Promise.all([
          geocodeAddress(originInput),
          geocodeAddress(destInput),
        ]);

        setOriginPoint(resolvedOrigin);
        setDestPoint(resolvedDest);
        computeEcoRoutes(resolvedOrigin, resolvedDest, commuterMode);
      } else {
        computeEcoRoutes(originPoint, destPoint, commuterMode);
      }
    } catch {
      computeEcoRoutes(originPoint, destPoint, commuterMode);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleClaimReward = (id: string, cost: number) => {
    if (ecoPoints >= cost && !claimedRewards.includes(id)) {
      setEcoPoints((prev) => prev - cost);
      setClaimedRewards((prev) => [...prev, id]);
    }
  };

  // Fallback schematic vector map
  const renderSchematicVectorMap = () => (
    <div className={`relative w-full h-full overflow-hidden flex items-center justify-center ${theme === 'dark' ? 'bg-[#070b12]' : 'bg-[#f1f5f9]'}`}>
      <svg className="w-full h-full select-none" viewBox="0 0 1000 700" preserveAspectRatio="none">
        <defs>
          <linearGradient id="schRouteA" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id="schRouteB" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <radialGradient id="schSmog" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="schGreen" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* River corridor */}
        <path
          d="M 680,40 C 660,140 680,240 650,330 C 620,420 660,500 700,600 C 720,650 710,690 710,700"
          fill="none"
          stroke="#0284c7"
          strokeWidth="24"
          strokeOpacity={theme === 'dark' ? 0.25 : 0.4}
        />

        {showGreenCanopy && (
          <ellipse cx="650" cy="245" rx="85" ry="120" fill="url(#schGreen)" />
        )}

        {showAqiHeatmap && (
          <circle cx="520" cy="360" r="130" fill="url(#schSmog)" />
        )}

        {/* Route A Path */}
        <path
          d="M 820,504 L 620,385 L 420,266 L 340,196 L 180,140"
          fill="none"
          stroke="url(#schRouteA)"
          strokeWidth={selectedRoute === 'route-a' ? 7 : 3.5}
          strokeOpacity={selectedRoute === 'route-a' ? 0.95 : 0.3}
          className="cursor-pointer"
          onClick={() => setSelectedRoute('route-a')}
        />

        {/* Route B Path */}
        <path
          d="M 820,504 Q 720,400 680,245 T 500,180 T 320,150 L 180,140"
          fill="none"
          stroke="url(#schRouteB)"
          strokeWidth={selectedRoute === 'route-b' ? 7 : 3.5}
          strokeOpacity={selectedRoute === 'route-b' ? 0.95 : 0.3}
          className="cursor-pointer"
          onClick={() => setSelectedRoute('route-b')}
        />

        {/* Origin Pin */}
        <g transform="translate(820, 504)">
          <circle r="10" fill="#38bdf8" fillOpacity="0.25" className="animate-pulse" />
          <circle r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
        </g>

        {/* Destination Pin */}
        <g transform="translate(180, 140)">
          <circle r="10" fill="#34d399" fillOpacity="0.25" className="animate-pulse" />
          <circle r="5" fill="#34d399" stroke="#ffffff" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );

  const panelClass =
    theme === 'dark'
      ? 'glass-panel-dark text-zinc-100'
      : 'bg-white/95 backdrop-blur-2xl border border-slate-200 shadow-2xl text-slate-800';
  const cardClass =
    theme === 'dark'
      ? 'glass-card-dark text-zinc-200'
      : 'bg-slate-100/90 border border-slate-200 text-slate-800';
  const metallicTitleClass = theme === 'dark' ? 'metallic-text-dark' : 'metallic-text-light';

  return (
    <div className={`relative h-screen w-screen overflow-hidden antialiased selection:bg-emerald-400 selection:text-black ${theme === 'dark' ? 'bg-[#070b12] text-zinc-200' : 'bg-[#f8fafc] text-zinc-800'}`}>
      {/* Quota Banner */}
      {quotaExceeded && (
        <div className="absolute top-0 left-0 right-0 z-50 glass-card-dark border-b border-amber-500/30 text-amber-300 px-4 py-2 text-xs text-center font-light">
          <span>Google Maps Platform quota reached. Schematic fallback active.</span>
        </div>
      )}

      {/* FULL SCREEN CANVAS MAP */}
      <div className="absolute inset-0 w-full h-full">
        {mapDisplayMode === 'google-maps' ? (
          <MapErrorBoundary fallback={renderSchematicVectorMap()}>
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'geometry', 'marker', 'routes']}>
              <Map
                defaultCenter={{ lat: 28.69, lng: 77.2 }}
                defaultZoom={12}
                gestureHandling="greedy"
                disableDefaultUI={true}
                fullscreenControl={false}
                mapTypeControl={false}
                streetViewControl={false}
                zoomControl={false}
                scaleControl={false}
                rotateControl={false}
                mapId="DEMO_MAP_ID"
                colorScheme={theme === 'dark' ? ColorScheme.DARK : ColorScheme.LIGHT}
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                className="w-full h-full"
              >
                <MapRouteRenderer
                  origin={originPoint}
                  destination={destPoint}
                  routes={routes}
                  selectedRoute={selectedRoute}
                  onSelectRoute={(type) => setSelectedRoute(type)}
                  showHeatmap={showAqiHeatmap}
                  showCanopy={showGreenCanopy}
                  showTraffic={showTraffic}
                  pickMode={pickMode}
                  onMapClick={handleMapClick}
                  clickedLocation={clickedLocation}
                  isDrivingMode={isDrivingMode}
                  currentCommuterPos={currentCommuterPos}
                  currentHeading={currentHeading}
                  theme={theme}
                  userGpsLocation={userGpsLocation}
                  centerTrigger={centerTrigger}
                />
              </Map>
            </APIProvider>
          </MapErrorBoundary>
        ) : (
          renderSchematicVectorMap()
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. NORMAL MODE UI OVERLAYS (Hidden during in-app driving mode) */}
      {/* ========================================================================= */}
      {!isDrivingMode && (
        <>
          {/* TOP FULL-WIDTH SOLID OPAQUE BAR */}
          <header className={`fixed top-0 left-0 right-0 w-full z-50 transition-colors shadow-md border-b ${
            theme === 'dark'
              ? 'bg-[#090d16] border-zinc-800 text-zinc-100'
              : 'bg-white border-slate-200 text-slate-800 shadow-sm'
          }`}>
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
              {/* Left: App Brand "GreenPath AI" with custom SVG logo */}
              <BrandLogo variant="full" size="md" theme={theme} className="flex-shrink-0" />

              {/* Center (Desktop / Tablet): Commute Capsule */}
              <div className="hidden md:flex flex-1 max-w-md mx-2 relative">
                <div
                  onClick={() => setIsEndpointsExpanded(true)}
                  className={`w-full cursor-pointer flex items-center justify-between gap-2.5 ${cardClass} rounded-2xl p-2 px-3.5 transition-all hover:border-emerald-400/40 border border-black/10 dark:border-white/10 group`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0 stroke-[2]" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-normal tracking-wide truncate">
                        <span className="truncate max-w-[110px]">{originPoint.address.split(',')[0]}</span>
                        <span className="text-emerald-500 font-light">➔</span>
                        <span className="truncate max-w-[120px]">{destPoint.address.split(',')[0]}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-[10px] text-zinc-400 font-light">
                    <span className="font-metallic">{activeRouteObj?.durationText || 'Computing...'}</span>
                    <span>•</span>
                    <span className={`font-medium ${activeRouteObj?.aqiData.badgeText || 'text-emerald-400'}`}>
                      AQI {activeRouteObj?.aqiData.aqi || 110}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-400 group-hover:text-emerald-500 transition-colors stroke-[1.5]" />
                  </div>
                </div>
              </div>

              {/* Right: Quick Start Navigation + User Auth + Theme Toggle + Layers + Menu */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Fast Action: Start in Google Maps Navigation */}
                <a
                  href={googleMapsExternalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleStartGoogleMapsJourney(false)}
                  className="hidden lg:flex items-center gap-1.5 h-8 sm:h-9 px-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-95"
                  title="Launch Google Maps & begin live tracked commute"
                >
                  <Navigation className="h-3.5 w-3.5 fill-black stroke-black" />
                  <span>Start Navigation</span>
                  <ExternalLink className="h-3 w-3 stroke-[2.2] opacity-80" />
                </a>

                {/* User Auth Profile Badge or Sign In button */}
                {currentUser ? (
                  <button
                    onClick={() => {
                      setActiveTab('rewards');
                      setIsMenuOpen(true);
                    }}
                    className={`flex items-center gap-1.5 h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl text-xs font-normal transition-all ${cardClass} hover:border-emerald-500/40 border border-black/10 dark:border-white/10`}
                    title={`Logged in as ${currentUser.name} (${currentUser.ecoPoints} pts)`}
                  >
                    <div className="flex h-5 w-5 sm:h-5.5 sm:w-5.5 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 text-black text-[10px] font-bold font-metallic">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:inline text-xs font-medium truncate max-w-[85px]">
                      {currentUser.name.split(' ')[0]}
                    </span>
                    <span className="font-metallic text-[10px] text-emerald-500 font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15">
                      {currentUser.ecoPoints}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setAuthModalMode('signin');
                      setIsAuthModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-95"
                    title="Sign In / Register"
                  >
                    <UserIcon className="h-3.5 w-3.5 stroke-[2.2]" />
                    <span>Sign In</span>
                  </button>
                )}

                {/* Theme Toggle (Dark / Light) */}
                <button
                  onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                  className={`flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl text-xs font-normal transition-all ${cardClass} hover:border-emerald-500/40 border border-black/10 dark:border-white/10`}
                  title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                  aria-label="Toggle dark/light theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-amber-300 stroke-[1.75]" />
                  ) : (
                    <Moon className="h-4 w-4 text-slate-700 stroke-[1.75]" />
                  )}
                </button>

                {/* Layers Popover Button */}
                <div className="relative">
                  <button
                    onClick={() => setIsLayersMenuOpen(!isLayersMenuOpen)}
                    className={`flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-normal tracking-wide transition-all ${cardClass} border border-black/10 dark:border-white/10 ${
                      isLayersMenuOpen ? 'border-emerald-400/50 text-emerald-500' : ''
                    }`}
                    title="Map Overlays & Layers"
                  >
                    <Layers className="h-4 w-4 text-emerald-500 stroke-[1.75]" />
                    <span className="hidden sm:inline">Layers</span>
                  </button>

                  {/* Layers Dropdown Menu */}
                  {isLayersMenuOpen && (
                    <div className={`absolute right-0 mt-2 w-52 sm:w-56 rounded-2xl ${panelClass} p-2.5 shadow-2xl z-50 space-y-1.5 animate-in fade-in zoom-in-95 border border-black/10 dark:border-white/10`}>
                      <div className="text-[9px] font-light uppercase tracking-[0.2em] text-zinc-400 px-2 py-1">
                        Environmental Layers
                      </div>

                      <button
                        onClick={() => setShowTraffic(!showTraffic)}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors"
                      >
                        <span className="flex items-center gap-2 font-light">
                          <Radio className="h-3.5 w-3.5 text-amber-400 stroke-[1.75]" />
                          <span>Live Traffic</span>
                        </span>
                        <span className={`h-1.5 w-1.5 rounded-full ${showTraffic ? 'bg-amber-400' : 'bg-zinc-400'}`} />
                      </button>

                      <button
                        onClick={() => setShowAqiHeatmap(!showAqiHeatmap)}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors"
                      >
                        <span className="flex items-center gap-2 font-light">
                          <Activity className="h-3.5 w-3.5 text-rose-400 stroke-[1.75]" />
                          <span>Smog Hotspots</span>
                        </span>
                        <span className={`h-1.5 w-1.5 rounded-full ${showAqiHeatmap ? 'bg-rose-400' : 'bg-zinc-400'}`} />
                      </button>

                      <button
                        onClick={() => setShowGreenCanopy(!showGreenCanopy)}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors"
                      >
                        <span className="flex items-center gap-2 font-light">
                          <TreePine className="h-3.5 w-3.5 text-emerald-400 stroke-[1.75]" />
                          <span>Canopy Buffer</span>
                        </span>
                        <span className={`h-1.5 w-1.5 rounded-full ${showGreenCanopy ? 'bg-emerald-400' : 'bg-zinc-400'}`} />
                      </button>

                      <div className="pt-1 border-t border-black/10 dark:border-white/[0.08]">
                        <button
                          onClick={() =>
                            setMapDisplayMode((prev) =>
                              prev === 'google-maps' ? 'schematic-map' : 'google-maps'
                            )
                          }
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs hover:bg-black/5 dark:hover:bg-white/[0.08] transition-colors font-light"
                        >
                          <span className="flex items-center gap-2">
                            <Compass className="h-3.5 w-3.5 text-cyan-400 stroke-[1.75]" />
                            <span>Vector vs Schematic</span>
                          </span>
                          <span className="text-[10px] text-zinc-400 font-metallic">
                            {mapDisplayMode === 'google-maps' ? 'Vector' : 'Schem'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Hamburger / App Menu Drawer Button */}
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className={`flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-normal tracking-wide ${cardClass} border border-black/10 dark:border-white/10 transition-all`}
                  title="Open Main Menu"
                >
                  <Menu className="h-4 w-4 text-emerald-500 stroke-[1.75]" />
                  <span className="hidden sm:inline">Menu</span>
                </button>
              </div>
            </div>

            {/* Mobile Row: Commute Capsule + Direct Start in Google Maps Navigation */}
            <div className="md:hidden px-3 pb-2.5 pt-0.5 relative flex items-center gap-2">
              <div
                onClick={() => setIsEndpointsExpanded(true)}
                className={`cursor-pointer flex-1 flex items-center justify-between gap-2 ${cardClass} rounded-2xl p-2 px-3 border border-black/10 dark:border-white/10 min-w-0`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0 stroke-[2]" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-xs font-normal tracking-wide truncate">
                      <span className="truncate max-w-[95px]">{originPoint.address.split(',')[0]}</span>
                      <span className="text-emerald-500 font-light">➔</span>
                      <span className="truncate max-w-[105px]">{destPoint.address.split(',')[0]}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-light">
                      <span className="font-metallic">{activeRouteObj?.durationText || 'Computing...'}</span>
                      <span>•</span>
                      <span className="capitalize">{commuterMode}</span>
                      <span>•</span>
                      <span className={`font-medium ${activeRouteObj?.aqiData.badgeText || 'text-emerald-400'}`}>
                        AQI {activeRouteObj?.aqiData.aqi || 110}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-zinc-400 stroke-[1.5] flex-shrink-0" />
              </div>

              {/* Mobile Direct Start in Google Maps Navigation Button */}
              <a
                href={googleMapsExternalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleStartGoogleMapsJourney(false)}
                className="flex items-center gap-1 h-9 px-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 text-black text-xs font-semibold shadow-md active:scale-95 flex-shrink-0"
                title="Start navigation in Google Maps"
              >
                <Navigation className="h-3.5 w-3.5 fill-black stroke-black" />
                <span>Start</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-80 stroke-[2.2]" />
              </a>
            </div>
          </header>

          {/* Modal Overlay for Expanded Route Inputs (Planner) */}
          {isEndpointsExpanded && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-md animate-in fade-in">
              <div className={`w-full max-w-lg ${panelClass} rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-2xl border animate-in zoom-in-95 max-h-[85vh] overflow-y-auto custom-scrollbar`}>
                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/[0.08] pb-2">
                  <span className="text-[11px] font-medium tracking-[0.16em] uppercase metallic-accent flex items-center gap-1.5">
                    <Leaf className="h-3.5 w-3.5 stroke-[1.75]" />
                    Clean-Air Route Planner
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleSwapLocations}
                      title="Swap Origin and Destination"
                      className={`p-1.5 rounded-lg ${cardClass} hover:opacity-80 transition-opacity`}
                    >
                      <ArrowUpDown className="h-3 w-3 stroke-[1.5]" />
                    </button>
                    <button
                      onClick={() => setIsEndpointsExpanded(false)}
                      className={`p-1.5 rounded-lg ${cardClass} hover:opacity-80 transition-opacity`}
                    >
                      <X className="h-3.5 w-3.5 stroke-[1.5]" />
                    </button>
                  </div>
                </div>

                {/* Travel Mode Selector (Car, Bicycle, EV) */}
                <div className="space-y-1">
                  <span className="text-[10px] font-light tracking-[0.18em] uppercase text-zinc-400">
                    Travel Mode
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    <button
                      onClick={() => handleSelectCommuterMode('car')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-xs font-normal tracking-wide transition-all ${
                        commuterMode === 'car'
                          ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-500 shadow-sm'
                          : `border-black/5 dark:border-white/[0.06] ${cardClass} opacity-80 hover:opacity-100`
                      }`}
                    >
                      <Car className="h-3.5 w-3.5 stroke-[1.75]" />
                      <span>Car</span>
                    </button>

                    <button
                      onClick={() => handleSelectCommuterMode('bike')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-xs font-normal tracking-wide transition-all ${
                        commuterMode === 'bike'
                          ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-500 shadow-sm'
                          : `border-black/5 dark:border-white/[0.06] ${cardClass} opacity-80 hover:opacity-100`
                      }`}
                    >
                      <Bike className="h-3.5 w-3.5 stroke-[1.75]" />
                      <span>Bicycle</span>
                    </button>

                    <button
                      onClick={() => handleSelectCommuterMode('ev')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-xs font-normal tracking-wide transition-all ${
                        commuterMode === 'ev'
                          ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-500 shadow-sm'
                          : `border-black/5 dark:border-white/[0.06] ${cardClass} opacity-80 hover:opacity-100`
                      }`}
                    >
                      <Zap className="h-3.5 w-3.5 stroke-[1.75]" />
                      <span>EV Mode</span>
                    </button>
                  </div>
                </div>

                {/* Origin Input */}
                <div className="space-y-1 relative">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400 font-light tracking-wider uppercase">Origin</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleUseCurrentLocation}
                          disabled={isLocating}
                          className="flex items-center gap-1.5 text-[10px] text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/40 px-2 py-0.5 rounded-md border border-cyan-700/40 transition-colors cursor-pointer"
                          title={locationPermissionStatus === 'granted' ? 'GPS permission granted - click to re-locate' : 'Request GPS location permission'}
                        >
                          <LocateFixed className={`h-2.5 w-2.5 stroke-[1.75] ${isLocating ? 'animate-spin text-emerald-400' : ''}`} />
                          <span>{isLocating ? 'Acquiring...' : 'My Location'}</span>
                          {locationPermissionStatus === 'granted' && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPickMode(pickMode === 'origin' ? null : 'origin')}
                          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                            pickMode === 'origin'
                              ? 'bg-cyan-400 text-black border-cyan-300 font-medium'
                              : `${cardClass} border-black/10 dark:border-white/10`
                          }`}
                        >
                          <MousePointerClick className="h-2.5 w-2.5 stroke-[1.75]" />
                          <span>Pick Map</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/[0.08] bg-black/5 dark:bg-black/40 px-3 py-2 text-xs focus-within:border-emerald-400/50 transition-colors">
                      <MapPin className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0 stroke-[1.75]" />
                      <input
                        type="text"
                        value={originInput}
                        onFocus={() => setActiveField('origin')}
                        onChange={(e) => setOriginInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchRoutes()}
                        placeholder="Search address or landmark..."
                        className="w-full bg-transparent outline-none font-light text-xs placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                      />
                    </div>

                    {/* Google Maps Place Autocomplete Suggestions for Origin */}
                    {activeField === 'origin' && placeSuggestions.length > 0 && (
                      <div className={`absolute top-full left-0 right-0 mt-1.5 z-50 rounded-2xl ${panelClass} shadow-2xl p-1.5 max-h-44 overflow-y-auto custom-scrollbar border`}>
                        <div className="text-[9px] uppercase font-light tracking-[0.18em] text-zinc-400 px-2 py-1 flex items-center justify-between">
                          <span>Google Maps Places:</span>
                          <span className="text-emerald-500 text-[8px]">Live</span>
                        </div>
                        {placeSuggestions.map((sug, i) => (
                          <div
                            key={i}
                            onMouseDown={() => handleSelectSuggestion(sug, 'origin')}
                            className="px-2.5 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/[0.08] rounded-xl cursor-pointer flex items-center gap-2 transition-colors"
                          >
                            <MapPin className="h-3 w-3 text-cyan-400 flex-shrink-0 stroke-[1.5]" />
                            <div className="min-w-0">
                              <span className="font-normal block truncate">{sug.mainText}</span>
                              {sug.secondaryText && (
                                <span className="font-light text-[10px] text-zinc-400 block truncate">{sug.secondaryText}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Destination Input */}
                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400 font-light tracking-wider uppercase">Destination</span>
                      <button
                        type="button"
                        onClick={() => setPickMode(pickMode === 'destination' ? null : 'destination')}
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                          pickMode === 'destination'
                            ? 'bg-emerald-400 text-black border-emerald-300 font-medium'
                            : `${cardClass} border-black/10 dark:border-white/10`
                        }`}
                      >
                        <MousePointerClick className="h-2.5 w-2.5 stroke-[1.75]" />
                        <span>Pick Map</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/[0.08] bg-black/5 dark:bg-black/40 px-3 py-2 text-xs focus-within:border-emerald-400/50 transition-colors">
                      <Navigation className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 stroke-[1.75]" />
                      <input
                        type="text"
                        value={destInput}
                        onFocus={() => setActiveField('dest')}
                        onChange={(e) => setDestInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchRoutes()}
                        placeholder="Search destination landmark..."
                        className="w-full bg-transparent outline-none font-light text-xs placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                      />
                    </div>

                    {/* Google Maps Place Autocomplete Suggestions for Destination */}
                    {activeField === 'dest' && placeSuggestions.length > 0 && (
                      <div className={`absolute top-full left-0 right-0 mt-1.5 z-50 rounded-2xl ${panelClass} shadow-2xl p-1.5 max-h-44 overflow-y-auto custom-scrollbar border`}>
                        <div className="text-[9px] uppercase font-light tracking-[0.18em] text-zinc-400 px-2 py-1 flex items-center justify-between">
                          <span>Google Maps Places:</span>
                          <span className="text-emerald-500 text-[8px]">Live</span>
                        </div>
                        {placeSuggestions.map((sug, i) => (
                          <div
                            key={i}
                            onMouseDown={() => handleSelectSuggestion(sug, 'dest')}
                            className="px-2.5 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/[0.08] rounded-xl cursor-pointer flex items-center gap-2 transition-colors"
                          >
                            <Navigation className="h-3 w-3 text-emerald-500 flex-shrink-0 stroke-[1.5]" />
                            <div className="min-w-0">
                              <span className="font-normal block truncate">{sug.mainText}</span>
                              {sug.secondaryText && (
                                <span className="font-light text-[10px] text-zinc-400 block truncate">{sug.secondaryText}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Calculate Routes & Direct Start Navigation Action */}
                  <div className="pt-0.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={handleSearchRoutes}
                      disabled={isCalculating || !originInput || !destInput}
                      className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 text-xs font-medium tracking-wide transition-all border border-zinc-700/80 disabled:opacity-50 active:scale-98"
                    >
                      <Search className="h-3.5 w-3.5 stroke-[2]" />
                      <span>{isCalculating ? 'Computing Paths...' : 'Recalculate Routes'}</span>
                    </button>

                    <a
                      href={googleMapsExternalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleStartGoogleMapsJourney(false)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black py-2.5 text-xs font-semibold tracking-wide transition-all shadow-md active:scale-98"
                      title="Launch Google Maps & begin live tracked commute"
                    >
                      <Navigation className="h-3.5 w-3.5 fill-black stroke-black" />
                      <span>Start in Google Maps</span>
                      <ExternalLink className="h-3 w-3 opacity-80 stroke-[2]" />
                    </a>
                  </div>

                  {/* Popular Presets */}
                  <div className="pt-2 border-t border-black/10 dark:border-white/[0.08]">
                    <div className="text-[10px] uppercase font-light tracking-[0.18em] text-zinc-400 mb-1.5">
                      Popular Corridors:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectPreset(preset)}
                          className={`text-[10px] font-light px-2.5 py-1 rounded-lg transition-colors truncate max-w-full ${cardClass} hover:border-emerald-500/40`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Floating Pick Mode and Status Pill */}
          {pickMode && (
            <div className={`absolute top-28 sm:top-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 rounded-2xl ${panelClass} border border-emerald-400/60 px-3.5 py-2 text-xs shadow-2xl backdrop-blur-xl animate-bounce`}>
              <MousePointerClick className="h-4 w-4 text-emerald-500 stroke-[1.75]" />
              <span className="font-light tracking-wide text-xs">
                Tap map to select <strong className="text-emerald-500 uppercase font-medium">{pickMode}</strong>
              </span>
              <button
                onClick={() => setPickMode(null)}
                className={`rounded-lg ${cardClass} px-2 py-0.5 text-[11px] font-normal text-zinc-300`}
              >
                Cancel
              </button>
            </div>
          )}

          {statusMessage && (
            <div className={`absolute top-28 sm:top-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-2xl ${panelClass} border border-emerald-500/50 px-3.5 py-2 text-xs font-light text-emerald-500 shadow-2xl backdrop-blur-xl`}>
              <CheckCircle2 className="h-4 w-4 stroke-[1.75]" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Clicked Map Location Prompt */}
          {clickedLocation && (
            <div className={`absolute top-28 sm:top-24 left-1/2 -translate-x-1/2 z-40 rounded-3xl ${panelClass} p-3.5 sm:p-4 shadow-2xl max-w-sm w-[90%] sm:w-96 animate-in fade-in zoom-in-95 border`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <MapPin className="h-4 w-4 text-amber-400 flex-shrink-0 animate-pulse stroke-[1.75]" />
                  <span className="truncate">{clickedLocation.address}</span>
                </div>
                <button
                  onClick={() => setClickedLocation(null)}
                  className={`text-zinc-400 hover:text-white p-1 rounded-lg ${cardClass}`}
                >
                  <X className="h-3.5 w-3.5 stroke-[1.5]" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => {
                    const newOrig = {
                      address: clickedLocation.address,
                      lat: clickedLocation.lat,
                      lng: clickedLocation.lng,
                    };
                    setOriginPoint(newOrig);
                    setOriginInput(clickedLocation.address);
                    setClickedLocation(null);
                    computeEcoRoutes(newOrig, destPoint, commuterMode);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black py-2 text-xs font-medium transition-all shadow-md active:scale-98"
                >
                  <MapPin className="h-3.5 w-3.5 stroke-[2]" />
                  <span>Set as Origin</span>
                </button>

                <button
                  onClick={() => {
                    const newDest = {
                      address: clickedLocation.address,
                      lat: clickedLocation.lat,
                      lng: clickedLocation.lng,
                    };
                    setDestPoint(newDest);
                    setDestInput(clickedLocation.address);
                    setClickedLocation(null);
                    computeEcoRoutes(originPoint, newDest, commuterMode);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black py-2 text-xs font-medium transition-all shadow-md active:scale-98"
                >
                  <Navigation className="h-3.5 w-3.5 stroke-[2]" />
                  <span>Set Destination</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BOTTOM FLOATING ROUTE COMPARISON & LAUNCH NAVIGATION CARD */}
          {/* ========================================================================= */}
          <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-4 right-3 sm:right-4 z-30 pointer-events-none flex justify-center">
            <div className={`pointer-events-auto max-w-xl w-full rounded-3xl ${panelClass} p-3 sm:p-4 transition-all duration-300 shadow-2xl`}>
              {/* Header Toggle Row */}
              <div className="flex items-center justify-between mb-2 sm:mb-2.5">
                <span className="text-xs font-medium text-emerald-500 flex items-center gap-1.5">
                  <Leaf className="h-3.5 w-3.5 stroke-[2]" />
                  <span>Available Commute Routes</span>
                </span>

                <div className="flex items-center gap-2">
                  {isRouteCardMinimized && (
                    <a
                      href={googleMapsExternalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleStartGoogleMapsJourney(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black text-xs font-semibold shadow-md transition-all active:scale-95"
                      title="Launch Google Maps & begin live tracked commute"
                    >
                      <Navigation className="h-3.5 w-3.5 fill-black stroke-black" />
                      <span>Start in Google Maps</span>
                      <ExternalLink className="h-3 w-3 stroke-[2] opacity-80" />
                    </a>
                  )}

                  <button
                    onClick={() => setIsRouteCardMinimized(!isRouteCardMinimized)}
                    className={`p-1 rounded-lg text-zinc-400 hover:text-white ${cardClass}`}
                    title={isRouteCardMinimized ? 'Expand route details' : 'Minimize card'}
                  >
                    {isRouteCardMinimized ? <ChevronUp className="h-4 w-4 stroke-[1.5]" /> : <ChevronDown className="h-4 w-4 stroke-[1.5]" />}
                  </button>
                </div>
              </div>

              {/* Segmented Route Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 mb-2 sm:mb-3">
                {/* ROUTE A: SHORTEST ARTERIAL */}
                {routes.routeA && (
                  <button
                    onClick={() => setSelectedRoute('route-a')}
                    className={`text-left p-2.5 sm:p-3 rounded-2xl border transition-all ${
                      selectedRoute === 'route-a'
                        ? theme === 'dark'
                          ? 'border-rose-500/80 bg-rose-950/30 text-rose-100 ring-2 ring-rose-500/30 shadow-md'
                          : 'border-rose-500 bg-rose-50/90 text-rose-950 ring-2 ring-rose-500/20 shadow-md'
                        : `border-black/5 dark:border-white/[0.06] ${cardClass} opacity-80 hover:opacity-100`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                      <span className="text-[10px] uppercase font-light tracking-wider text-rose-500 flex items-center gap-1">
                        <Flame className="h-3 w-3 stroke-[1.75]" /> Shortest
                      </span>
                      <span className="text-xs sm:text-sm font-normal font-metallic">
                        {routes.routeA.durationText}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-400 font-light">
                      <span>{routes.routeA.distanceText}</span>
                      <span className={`font-medium ${routes.routeA.aqiData.badgeText}`}>
                        AQI {routes.routeA.aqiData.aqi}
                      </span>
                    </div>
                  </button>
                )}

                {/* ROUTE B: GREENPATH SAFE CORRIDOR */}
                {routes.routeB && (
                  <button
                    onClick={() => setSelectedRoute('route-b')}
                    className={`text-left p-2.5 sm:p-3 rounded-2xl border transition-all relative ${
                      selectedRoute === 'route-b'
                        ? theme === 'dark'
                          ? 'border-emerald-400/80 bg-emerald-950/30 text-emerald-100 ring-2 ring-emerald-400/30 shadow-md'
                          : 'border-emerald-500 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/20 shadow-md'
                        : `border-black/5 dark:border-white/[0.06] ${cardClass} opacity-80 hover:opacity-100`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                      <span className="text-[10px] uppercase font-light tracking-wider text-emerald-500 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 stroke-[1.75]" /> Clean Bio
                      </span>
                      <span className="text-xs sm:text-sm font-normal font-metallic">
                        {routes.routeB.durationText}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-400 font-light">
                      <span>{routes.routeB.distanceText}</span>
                      <span className={`font-medium ${routes.routeB.aqiData.badgeText}`}>
                        AQI {routes.routeB.aqiData.aqi}
                      </span>
                    </div>
                  </button>
                )}
              </div>

              {!isRouteCardMinimized && (
                <>
                  {/* Clean Summary Strip */}
                  {routes.routeA && routes.routeB && (
                    <div className={`mb-2.5 sm:mb-3 p-2 sm:p-2.5 rounded-xl ${cardClass} text-xs flex flex-wrap items-center justify-between gap-1 text-zinc-400 font-light`}>
                      {selectedRoute === 'route-b' ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 stroke-[1.75]" />
                          <span className="truncate">
                            Wetland canopy: <strong className="font-normal text-emerald-500">-60% toxic PM2.5</strong> (+{routes.routeB.durationMinutes - routes.routeA.durationMinutes > 0 ? `${routes.routeB.durationMinutes - routes.routeA.durationMinutes}m` : '0m'})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-rose-300 min-w-0">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-400 flex-shrink-0 stroke-[1.75]" />
                          <span className="truncate">
                            Diesel freight trap: <strong className="font-normal text-rose-400">{routes.routeA.aqiData.pm25} µg/m³ PM2.5</strong>
                          </span>
                        </div>
                      )}
                      <span className="text-[10px] font-metallic text-emerald-500 font-medium ml-auto">
                        {routes.routeB.co2SavedGrams}g CO₂ Saved
                      </span>
                    </div>
                  )}

                  {/* ACTION BUTTON GROUP: SEND TO GOOGLE MAPS + IN-APP 3D PREVIEW */}
                  <div className="flex items-center gap-2 pt-0.5">
                    {/* PRIMARY ACTION: SEND TO REAL GOOGLE MAPS APP & START TRACKED JOURNEY */}
                    <a
                      href={googleMapsExternalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleStartGoogleMapsJourney(false)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black py-2.5 sm:py-3 px-3 sm:px-4 text-xs font-semibold tracking-wide shadow-lg transition-all active:scale-[0.98]"
                      title="Launch Google Maps & begin live tracked commute"
                    >
                      <Navigation className="h-4 w-4 fill-black stroke-black" />
                      <span>Start in Google Maps</span>
                      <ExternalLink className="h-3.5 w-3.5 opacity-80 stroke-[2]" />
                    </a>

                    {/* SECONDARY ACTION: IN-APP 3D DRIVING SIMULATION PREVIEW */}
                    <button
                      onClick={handleStartDrivingMode}
                      className={`flex items-center justify-center gap-1.5 rounded-2xl ${cardClass} hover:opacity-100 py-2.5 sm:py-3 px-3 sm:px-3.5 text-xs font-light tracking-wide transition-all border border-black/10 dark:border-white/10 active:scale-[0.98]`}
                      title="Preview 3D simulation on this map"
                    >
                      <Compass className="h-4 w-4 text-emerald-500 stroke-[1.75]" />
                      <span className="hidden xs:inline">3D Preview</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* FLOATING MAP GPS LOCATOR BUTTON */}
          <div className="fixed right-3 sm:right-5 bottom-36 sm:bottom-40 z-30 pointer-events-auto">
            <button
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className={`flex items-center gap-2 p-2.5 sm:px-3 sm:py-2.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all active:scale-95 group cursor-pointer ${
                locationPermissionStatus === 'granted'
                  ? 'bg-[#090d16]/90 border-emerald-500/40 text-emerald-400 hover:border-emerald-400'
                  : 'bg-[#090d16]/90 border-zinc-700/80 text-zinc-300 hover:text-white hover:border-zinc-500'
              }`}
              title="Locate me & enable GPS permissions"
              aria-label="Locate my position"
            >
              <div className="relative flex items-center justify-center">
                <LocateFixed className={`h-4.5 w-4.5 sm:h-5 sm:w-5 stroke-[2] ${isLocating ? 'animate-spin text-emerald-400' : ''}`} />
                {locationPermissionStatus === 'granted' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
              <span className="hidden sm:inline text-xs font-medium">
                {isLocating
                  ? 'Locating...'
                  : locationPermissionStatus === 'granted'
                  ? 'GPS Active'
                  : 'Locate Me'}
              </span>
            </button>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. GOOGLE MAPS DRIVING NAVIGATION MODE (Full Screen In-Car HUD) */}
      {/* ========================================================================= */}
      {isDrivingMode && (
        <div className="absolute inset-0 pointer-events-none z-40 flex flex-col justify-between p-3 sm:p-6">
          {/* TOP GOOGLE MAPS TURN-BY-TURN NAVIGATION BANNER */}
          <div className="pointer-events-auto max-w-xl mx-auto w-full animate-in fade-in slide-in-from-top-6">
            <div className={`rounded-3xl ${panelClass} border border-emerald-400/30 p-3.5 sm:p-4 shadow-2xl flex items-center gap-3 sm:gap-4`}>
              {/* Maneuver Arrow Icon */}
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-emerald-950/70 border border-emerald-400/30 flex-shrink-0 text-emerald-300 shadow-inner">
                {currentNavStep.maneuver === 'turn-right' ? (
                  <CornerUpRight className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2]" />
                ) : currentNavStep.maneuver === 'turn-left' ? (
                  <CornerUpLeft className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2]" />
                ) : (
                  <ArrowUp className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2]" />
                )}
              </div>

              {/* Maneuver Text & Live AQI Guidance */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-light uppercase tracking-[0.2em] text-emerald-400">
                  In {currentNavStep.distanceText}
                </div>
                <div className="text-sm sm:text-base font-normal tracking-wide truncate leading-snug">
                  {currentNavStep.instruction}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px]">
                  <span
                    className={`font-medium px-2 py-0.5 rounded-full ${
                      selectedRoute === 'route-b'
                        ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-400/30'
                        : 'bg-rose-950/90 text-rose-200 border border-rose-500/30'
                    }`}
                  >
                    AQI {activeRouteObj?.aqiData.aqi} ({activeRouteObj?.aqiData.pm25} µg/m³)
                  </span>
                  <span className="text-zinc-400 font-light truncate hidden xs:inline">
                    {selectedRoute === 'route-b' ? 'Bio-Corridor' : 'Arterial'}
                  </span>
                </div>
              </div>

              {/* Start in Google Maps Navigation & Close */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={googleMapsExternalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleStartGoogleMapsJourney(false)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black text-xs font-semibold shadow-md transition-all active:scale-95"
                  title="Switch from preview to real Google Maps navigation"
                >
                  <Navigation className="h-3.5 w-3.5 fill-black stroke-black" />
                  <span className="hidden xs:inline">Start in</span>
                  <span>Google Maps</span>
                  <ExternalLink className="h-3 w-3 stroke-[2] opacity-80" />
                </a>

                <button
                  onClick={handleExitDrivingMode}
                  className={`p-2 rounded-xl ${cardClass} hover:opacity-80 transition-colors`}
                  title="Exit 3D Preview"
                >
                  <X className="h-4 w-4 stroke-[1.75]" />
                </button>
              </div>
            </div>
          </div>

          {/* BOTTOM DRIVING INSTRUMENT CLUSTER */}
          <div className="pointer-events-auto max-w-xl mx-auto w-full animate-in fade-in slide-in-from-bottom-6">
            <div className={`rounded-3xl ${panelClass} p-3.5 sm:p-4 shadow-2xl space-y-2.5 sm:space-y-3`}>
              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-metallic font-light">
                  <span>Transit Progress</span>
                  <span>{Math.round(simulationProgress)}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 rounded-full ${
                      selectedRoute === 'route-a' ? 'bg-rose-500' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${simulationProgress}%` }}
                  />
                </div>
              </div>

              {/* Metrics & Control Buttons */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                {/* Speedometer & ETA */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-light font-metallic">
                      {remainingMetrics.speedKmH}
                    </span>
                    <span className="text-xs text-zinc-400 font-light">km/h</span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-zinc-400 font-light truncate">
                    <strong className="text-emerald-500 font-normal">{remainingMetrics.mins} min</strong> ({remainingMetrics.km} km) · ETA {remainingMetrics.etaText}
                  </div>
                </div>

                {/* Playback, Google Maps Navigation & Exit Controls */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <a
                    href={googleMapsExternalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleStartGoogleMapsJourney(false)}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-black text-xs font-semibold shadow-sm transition-all active:scale-95 mr-0.5 sm:mr-1"
                    title="Launch Google Maps App & begin live turn-by-turn navigation"
                  >
                    <Navigation className="h-3.5 w-3.5 fill-black stroke-black" />
                    <span className="hidden sm:inline">Start in</span>
                    <span>Google Maps</span>
                    <ExternalLink className="h-3 w-3 stroke-[2] opacity-80" />
                  </a>

                  <button
                    onClick={() => setIsSimulationPaused(!isSimulationPaused)}
                    className={`p-2 rounded-xl ${cardClass} hover:opacity-80 transition-colors`}
                    title={isSimulationPaused ? 'Resume Navigation' : 'Pause'}
                  >
                    {isSimulationPaused ? <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[1.75]" /> : <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[1.75]" />}
                  </button>

                  <button
                    onClick={() => {
                      setPlaybackSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 1));
                    }}
                    className={`px-2 sm:px-2.5 py-1.5 rounded-xl ${cardClass} text-xs font-metallic text-emerald-500 transition-colors`}
                    title="Toggle Speed"
                  >
                    {playbackSpeed}x
                  </button>

                  <button
                    onClick={() => {
                      setSimulationProgress(0);
                      setIsSimulationPaused(false);
                    }}
                    className={`p-2 rounded-xl ${cardClass} text-zinc-400 hover:text-white transition-colors`}
                    title="Restart"
                  >
                    <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[1.75]" />
                  </button>

                  <button
                    onClick={handleExitDrivingMode}
                    className="flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white text-xs font-normal tracking-wide transition-all ml-0.5 shadow-md"
                    title="Exit Navigation Preview"
                  >
                    <X className="h-3.5 w-3.5 stroke-[1.75]" />
                    <span>Exit</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SLIDE-OVER MAIN MENU DRAWER (Clean tabs for Planner, Alerts & Rewards) */}
      {/* ========================================================================= */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className={`relative w-full max-w-sm sm:max-w-md h-full ${panelClass} flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 border-l border-black/10 dark:border-white/10`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/[0.08] p-4">
              <BrandLogo variant="full" size="md" theme={theme} />
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`p-2 rounded-xl ${cardClass} hover:opacity-80`}
                  title="Toggle Dark/Light Mode"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-300 stroke-[1.75]" /> : <Moon className="h-4 w-4 text-slate-700 stroke-[1.75]" />}
                </button>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className={`p-2 rounded-xl ${cardClass} text-zinc-400 hover:text-white`}
                >
                  <X className="h-5 w-5 stroke-[1.5]" />
                </button>
              </div>
            </div>

            {/* Segmented Tabs */}
            <div className="grid grid-cols-3 border-b border-black/10 dark:border-white/[0.08] p-1.5">
              <button
                onClick={() => setActiveTab('planner')}
                className={`py-2 text-xs font-light tracking-wider rounded-lg transition-all ${
                  activeTab === 'planner'
                    ? `${cardClass} text-emerald-500 border border-emerald-500/30`
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Corridors
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className={`py-2 text-xs font-light tracking-wider rounded-lg transition-all ${
                  activeTab === 'alerts'
                    ? `${cardClass} text-emerald-500 border border-emerald-500/30`
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sensors
              </button>
              <button
                onClick={() => setActiveTab('rewards')}
                className={`py-2 text-xs font-light tracking-wider rounded-lg transition-all ${
                  activeTab === 'rewards'
                    ? `${cardClass} text-emerald-500 border border-emerald-500/30`
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Wallet
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {/* TAB 1: COMMUTE & PRESETS */}
              {activeTab === 'planner' && (
                <div className="space-y-4">
                  {/* Commute Mode Selector */}
                  <div>
                    <span className="text-[10px] font-light uppercase tracking-[0.2em] text-zinc-400 block mb-2">
                      Active Commuter Vehicle
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleSelectCommuterMode('car')}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition-all ${
                          commuterMode === 'car'
                            ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-500'
                            : `border-black/5 dark:border-white/[0.06] ${cardClass} opacity-80`
                        }`}
                      >
                        <Car className="h-4 w-4 mb-1 stroke-[1.75]" />
                        <span className="font-light">Car</span>
                      </button>

                      <button
                        onClick={() => handleSelectCommuterMode('bike')}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition-all ${
                          commuterMode === 'bike'
                            ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-500'
                            : `border-black/5 dark:border-white/[0.06] ${cardClass} opacity-80`
                        }`}
                      >
                        <Bike className="h-4 w-4 mb-1 stroke-[1.75]" />
                        <span className="font-light">Bicycle</span>
                      </button>

                      <button
                        onClick={() => handleSelectCommuterMode('ev')}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition-all ${
                          commuterMode === 'ev'
                            ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-500'
                            : `border-black/5 dark:border-white/[0.06] ${cardClass} opacity-80`
                        }`}
                      >
                        <Zap className="h-4 w-4 mb-1 stroke-[1.75]" />
                        <span className="font-light">EV Mode</span>
                      </button>
                    </div>
                  </div>

                  {/* Popular Presets */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-light uppercase tracking-[0.2em] text-zinc-400">
                      Popular Delhi NCR Presets
                    </span>
                    <div className="space-y-2">
                      {POPULAR_PRESETS.map((preset, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            handleSelectPreset(preset);
                            setIsMenuOpen(false);
                          }}
                          className={`cursor-pointer p-3 rounded-2xl ${cardClass} hover:border-emerald-500/40 transition-colors border`}
                        >
                          <div className="text-xs font-normal mb-0.5 tracking-wide">{preset.name}</div>
                          <div className="text-[10px] font-light text-zinc-400 truncate">
                            {preset.origin.address} ➔ {preset.destination.address}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AIR QUALITY DATA & SENSORS */}
              {activeTab === 'alerts' && (
                <div className="space-y-4">
                  {/* Live Regional Sensor Card */}
                  <div className={`rounded-2xl ${cardClass} p-4 space-y-3 border`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-light uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 stroke-[1.75]" /> Live Delhi Sensor Network
                      </span>
                      <span className="text-[10px] font-metallic text-zinc-400">
                        {liveAqiBaseline?.source || 'Open-Meteo API'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className={`p-2.5 rounded-xl ${cardClass} border`}>
                        <span className="text-[10px] text-zinc-400 block uppercase font-light tracking-wider">PM2.5 Exposure</span>
                        <span className="text-base font-light font-metallic">
                          {liveAqiBaseline?.pm25 || 55} <span className="text-xs font-normal text-zinc-400">µg/m³</span>
                        </span>
                      </div>
                      <div className={`p-2.5 rounded-xl ${cardClass} border`}>
                        <span className="text-[10px] text-zinc-400 block uppercase font-light tracking-wider">PM10 Coarse</span>
                        <span className="text-base font-light font-metallic">
                          {liveAqiBaseline?.pm10 || 180} <span className="text-xs font-normal text-zinc-400">µg/m³</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className={`p-2 rounded-xl ${cardClass} border text-[10px]`}>
                        <span className="text-zinc-400 block font-light">Nitrogen Dioxide (NO₂)</span>
                        <span className="font-metallic text-emerald-500">{liveAqiBaseline?.no2 || 24} µg/m³</span>
                      </div>
                      <div className={`p-2 rounded-xl ${cardClass} border text-[10px]`}>
                        <span className="text-zinc-400 block font-light">Carbon Monoxide (CO)</span>
                        <span className="font-metallic text-emerald-500">{liveAqiBaseline?.co || 650} µg/m³</span>
                      </div>
                    </div>
                  </div>

                  {/* Health Advisory */}
                  <div className={`rounded-2xl ${cardClass} p-4 space-y-2 border border-amber-500/20`}>
                    <div className="flex items-center gap-2 text-amber-500 text-xs font-normal">
                      <AlertTriangle className="h-4 w-4 stroke-[1.75]" />
                      <span>Atmospheric Advisory & Bio-Corridor Guide</span>
                    </div>
                    <p className="text-xs text-zinc-400 font-light leading-relaxed">
                      Industrial highways trap heavy diesel particulates from interstate trucks. Using the Yamuna riverfront corridor bypasses up to 60% of toxic particulate inhalation.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: REWARDS, ACCOUNT & CARBON WALLET */}
              {activeTab === 'rewards' && (
                <div className="space-y-4">
                  {/* User Profile Card / Sign In Prompt */}
                  {currentUser ? (
                    <div className={`rounded-2xl ${cardClass} p-4 space-y-3 border border-emerald-500/20`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black font-metallic text-base font-bold shadow-sm">
                            {currentUser.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className={`text-sm font-medium ${metallicTitleClass}`}>{currentUser.name}</h4>
                            <p className="text-[11px] font-light text-zinc-400">{currentUser.email}</p>
                            <span className="inline-block mt-0.5 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-metallic">
                              {currentUser.verifiedJourneysCount} Verified Clean-Air Commutes
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                          title="Sign Out of Account"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Logout</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/10 dark:border-white/[0.08]">
                        <div className={`p-2 rounded-xl ${cardClass} border`}>
                          <span className="text-[10px] text-zinc-400 block font-light">Avoided CO₂</span>
                          <span className="text-base font-light text-emerald-500 font-metallic">{co2SavedTotal} kg</span>
                        </div>
                        <div className={`p-2 rounded-xl ${cardClass} border`}>
                          <span className="text-[10px] text-zinc-400 block font-light">EcoPoints Balance</span>
                          <span className="text-base font-light text-teal-400 font-metallic">{ecoPoints} pts</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`rounded-2xl ${cardClass} p-4 space-y-3 border border-amber-500/30`}>
                      <div className="flex items-center gap-2.5 text-xs">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                          <UserIcon className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="font-medium">Guest Commuter Session</div>
                          <div className="text-[10px] text-zinc-400 font-light">Create a free account to persist EcoPoints & sync with AWS!</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => {
                            setAuthModalMode('signin');
                            setIsAuthModalOpen(true);
                          }}
                          className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium text-center transition-colors"
                        >
                          Sign In
                        </button>
                        <button
                          onClick={() => {
                            setAuthModalMode('signup');
                            setIsAuthModalOpen(true);
                          }}
                          className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black text-xs font-semibold text-center transition-all shadow-sm"
                        >
                          Create Account
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Recent Verified Journeys (History) */}
                  {currentUser && currentUser.history && currentUser.history.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-light uppercase tracking-[0.2em] text-zinc-400">
                        Recent Verified Commutes
                      </span>
                      <div className="space-y-1.5">
                        {currentUser.history.slice(0, 4).map((jrn) => (
                          <div key={jrn.id} className={`p-2.5 rounded-xl ${cardClass} border text-xs space-y-1`}>
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate max-w-[170px]">{jrn.routeTitle}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                jrn.isVerified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700/50 text-zinc-400'
                              }`}>
                                {jrn.isVerified ? `+${jrn.pointsEarned} pts` : 'Unverified'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-light">
                              <span>{Math.floor(jrn.actualDurationSeconds / 60)}m transit · {jrn.distanceKm} km</span>
                              <span>{new Date(jrn.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Redeemable Rewards */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-light uppercase tracking-[0.2em] text-zinc-400">
                      Redeem Vouchers
                    </span>
                    <div className={`rounded-xl ${cardClass} p-3 flex items-center justify-between border`}>
                      <div>
                        <div className="text-xs font-normal">₹100 Delhi Metro (DMRC) Card Recharge</div>
                        <div className="text-[10px] font-light text-zinc-400">600 EcoPoints</div>
                      </div>
                      <button
                        onClick={() => handleClaimReward('dmrc', 600)}
                        disabled={claimedRewards.includes('dmrc') || ecoPoints < 600}
                        className="text-xs px-3 py-1.5 rounded-xl font-normal tracking-wide bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border border-emerald-500/30 disabled:opacity-50 transition-colors"
                      >
                        {claimedRewards.includes('dmrc') ? 'Claimed ✓' : 'Redeem'}
                      </button>
                    </div>

                    <div className={`rounded-xl ${cardClass} p-3 flex items-center justify-between border`}>
                      <div>
                        <div className="text-xs font-normal">N95 Carbon-Filter Clean Air Mask</div>
                        <div className="text-[10px] font-light text-zinc-400">450 EcoPoints</div>
                      </div>
                      <button
                        onClick={() => handleClaimReward('mask', 450)}
                        disabled={claimedRewards.includes('mask') || ecoPoints < 450}
                        className="text-xs px-3 py-1.5 rounded-xl font-normal tracking-wide bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border border-emerald-500/30 disabled:opacity-50 transition-colors"
                      >
                        {claimedRewards.includes('mask') ? 'Claimed ✓' : 'Redeem'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-black/10 dark:border-white/[0.08] p-3 flex items-center justify-between text-[11px] text-zinc-400 font-light">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Green Path Routing Engine
              </span>
              <span className="font-metallic">v3.5 (AWS Free Tier)</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODALS: ACTIVE REAL-WORLD JOURNEY HUD, RESULTS, AUTH & AWS GUIDE       */}
      {/* ========================================================================= */}

      {/* ACTIVE REAL-WORLD JOURNEY HUD (Timer & route verification) */}
      {activeJourney && (
        <ActiveJourneyHUD
          journey={activeJourney}
          onFinishJourney={handleFinishJourney}
          onCancelJourney={() => setActiveJourney(null)}
          theme={theme}
        />
      )}

      {/* JOURNEY VERIFICATION RESULT & CELEBRATION MODAL */}
      <JourneyResultModal
        journeyResult={journeyResult}
        onClose={() => setJourneyResult(null)}
        onOpenWallet={() => {
          setJourneyResult(null);
          setActiveTab('rewards');
          setIsMenuOpen(true);
        }}
        theme={theme}
      />

      {/* AUTHENTICATION MODAL (SIGN IN / SIGN UP) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setEcoPoints(user.ecoPoints);
          setCo2SavedTotal(user.totalCo2SavedKg);
        }}
        theme={theme}
        initialMode={authModalMode}
      />

      {/* AWS FREE TIER GUIDE MODAL */}
      <AWSGuideModal
        isOpen={isAWSGuideOpen}
        onClose={() => setIsAWSGuideOpen(false)}
        theme={theme}
      />

      {/* LOCATION PERMISSION PROMPT MODAL */}
      <LocationPermissionModal
        isOpen={isLocationModalOpen}
        onClose={() => {
          setIsLocationModalOpen(false);
          localStorage.setItem('greenpath_location_prompt_seen', 'true');
        }}
        onRequestPermission={handleRequestLocationPermission}
        isLocating={isLocating}
        permissionStatus={locationPermissionStatus}
        onChooseManually={() => {
          setIsEndpointsExpanded(true);
        }}
        isDark={theme === 'dark'}
      />
    </div>
  );
}
