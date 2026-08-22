// ============================================================
//  location.js  –  Geolocation & Distance Calculation
//  BILLAXIS Phase 2 - Hyperlocal Discovery
// ============================================================

class LocationService {

    // ── Get user's current GPS location ──────────────────────
    static async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported by this browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude:  position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy:  position.coords.accuracy
                    });
                },
                (error) => {
                    let msg = 'Location access denied';
                    if (error.code === 1) msg = 'Please allow location access';
                    if (error.code === 2) msg = 'Location unavailable';
                    if (error.code === 3) msg = 'Location request timed out';
                    reject(new Error(msg));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 min cache
                }
            );
        });
    }

    // ── Haversine distance formula (returns km) ───────────────
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R    = 6371;
        const dLat = this._toRad(lat2 - lat1);
        const dLon = this._toRad(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    static _toRad(deg) { return deg * (Math.PI / 180); }

    // ── Estimate delivery time (minutes) ─────────────────────
    // ~15 min prep + travel at 20 km/h
    static estimateDeliveryTime(distanceKm) {
        const prep   = 15; // minutes
        const speed  = 20; // km/h
        const travel = (distanceKm / speed) * 60;
        return Math.ceil(prep + travel);
    }

    // ── Format distance for display ───────────────────────────
    static formatDistance(km) {
        if (km < 1) return `${Math.round(km * 1000)} m`;
        return `${km.toFixed(1)} km`;
    }

    // ── Get nearby stores from Supabase ───────────────────────
    static async getNearbyStores(userLat, userLon, radiusKm = 10) {
        const sb = getSupabase();
        if (!sb) return [];

        const { data: stores, error } = await sb
            .from('users')
            .select('id, name, latitude, longitude, service_radius_km, is_accepting_orders')
            .eq('is_accepting_orders', true)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null);

        if (error) {
            console.error('getNearbyStores:', error);
            return [];
        }

        return stores
            .map(store => {
                const dist = this.calculateDistance(
                    userLat, userLon,
                    store.latitude, store.longitude
                );
                return {
                    ...store,
                    distance_km:                 dist,
                    distance_formatted:          this.formatDistance(dist),
                    estimated_delivery_minutes:  this.estimateDeliveryTime(dist),
                    is_serviceable:              dist <= (store.service_radius_km || radiusKm)
                };
            })
            .filter(s => s.is_serviceable)
            .sort((a, b) => a.distance_km - b.distance_km);
    }

    // ── Check if a specific store services a location ─────────
    static async checkServiceability(userLat, userLon, merchantId) {
        const sb = getSupabase();
        if (!sb) return { serviceable: false };

        const { data: merchant } = await sb
            .from('users')
            .select('latitude, longitude, service_radius_km, is_accepting_orders')
            .eq('id', merchantId)
            .single();

        if (!merchant || !merchant.latitude) {
            return { serviceable: false, reason: 'Merchant location not set' };
        }

        if (!merchant.is_accepting_orders) {
            return { serviceable: false, reason: 'Store is currently closed' };
        }

        const dist = this.calculateDistance(
            userLat, userLon,
            merchant.latitude, merchant.longitude
        );

        const radius = merchant.service_radius_km || 10;

        return {
            serviceable:                dist <= radius,
            distance_km:                dist,
            distance_formatted:         this.formatDistance(dist),
            estimated_delivery_minutes: this.estimateDeliveryTime(dist),
            reason:                     dist > radius ? `Outside ${radius} km delivery zone` : null
        };
    }

    // ── Save merchant location to database ───────────────────
    static async saveMerchantLocation(latitude, longitude, serviceRadiusKm = 10) {
        const sb = getSupabase();
        if (!sb) return { ok: false };

        const { data: { user } } = await sb.auth.getUser();
        if (!user) return { ok: false };

        const { error } = await sb
            .from('users')
            .update({
                latitude,
                longitude,
                service_radius_km: serviceRadiusKm
            })
            .eq('id', user.id);

        if (error) {
            console.error('saveMerchantLocation:', error);
            return { ok: false, error };
        }

        return { ok: true };
    }

    // ── Delivery fee based on distance ────────────────────────
    static calculateDeliveryFee(distanceKm) {
        // Tiered pricing
        if (distanceKm <= 1)  return 20;
        if (distanceKm <= 3)  return 30;
        if (distanceKm <= 5)  return 40;
        if (distanceKm <= 10) return 50 + (distanceKm - 5) * 5;
        return 75 + (distanceKm - 10) * 8; // beyond 10 km
    }
}

console.log('📍 LocationService loaded');
