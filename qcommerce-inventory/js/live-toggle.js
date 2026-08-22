// ============================================================
//  live-toggle.js  –  Live/Offline Toggle for Merchants
//
//  Manages merchant availability status with:
//  - Real-time state persistence in Supabase
//  - Cross-tab synchronization
//  - Visual feedback
// ============================================================

let liveToggleInitialized = false;
let toggleRealtimeChannel = null;

// ── Initialize Live Toggle ──────────────────────────────────
async function initLiveToggle() {
    if (liveToggleInitialized) return;
    
    const toggleCheckbox = document.getElementById('liveToggle');
    const statusText = document.getElementById('toggleStatusText');
    const subtitle = document.getElementById('toggleSubtitle');
    const container = document.querySelector('.live-toggle-container');
    
    if (!toggleCheckbox) return; // Not on a page with the toggle
    
    console.log('🔄 Initializing Live/Offline Toggle...');
    
    // Load current state from Supabase
    await loadToggleState();
    
    // Handle toggle change
    toggleCheckbox.addEventListener('change', async (e) => {
        const isLive = e.target.checked;
        await updateToggleState(isLive);
    });
    
    // Setup realtime sync
    setupToggleRealtime();
    
    liveToggleInitialized = true;
    console.log('✅ Live/Offline Toggle initialized');
}

// ── Load Toggle State from Database ─────────────────────────
async function loadToggleState() {
    const sb = getSupabase();
    if (!sb) {
        console.warn('⚠️ Supabase not configured, toggle will use default state');
        return;
    }
    
    try {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) {
            console.warn('⚠️ No user logged in');
            return;
        }
        
        const { data, error } = await sb
            .from('users')
            .select('is_accepting_orders')
            .eq('id', user.id)
            .single();
        
        if (error) {
            console.error('❌ Error loading toggle state:', error);
            return;
        }
        
        const isAccepting = data?.is_accepting_orders !== false; // Default to true
        console.log('📥 Loaded toggle state:', isAccepting ? 'Live' : 'Offline');
        
        // Update UI
        updateToggleUI(isAccepting);
        
    } catch (err) {
        console.error('❌ Error in loadToggleState:', err);
    }
}

// ── Update Toggle State in Database ─────────────────────────
async function updateToggleState(isLive) {
    const sb = getSupabase();
    if (!sb) {
        console.warn('⚠️ Supabase not configured, toggle state not saved');
        updateToggleUI(isLive);
        return;
    }
    
    try {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) {
            console.warn('⚠️ No user logged in');
            return;
        }
        
        console.log('💾 Updating toggle state:', isLive ? 'Live' : 'Offline');
        
        const { error } = await sb
            .from('users')
            .update({ 
                is_accepting_orders: isLive,
                last_status_change: new Date().toISOString()
            })
            .eq('id', user.id);
        
        if (error) {
            console.error('❌ Error updating toggle state:', error);
            showToast('Failed to update status', 'error');
            // Revert UI
            const toggleCheckbox = document.getElementById('liveToggle');
            if (toggleCheckbox) toggleCheckbox.checked = !isLive;
            return;
        }
        
        console.log('✅ Toggle state updated successfully');
        
        // Update UI
        updateToggleUI(isLive);
        
        // Show toast notification
        showToast(
            isLive ? 'You are now Live - accepting orders' : 'You are now Offline - not accepting orders',
            isLive ? 'success' : 'info'
        );
        
    } catch (err) {
        console.error('❌ Error in updateToggleState:', err);
        showToast('Failed to update status', 'error');
    }
}

// ── Update Toggle UI ────────────────────────────────────────
function updateToggleUI(isLive) {
    const toggleCheckbox = document.getElementById('liveToggle');
    const statusText = document.getElementById('toggleStatusText');
    const subtitle = document.getElementById('toggleSubtitle');
    const container = document.querySelector('.live-toggle-container');

    if (!toggleCheckbox || !statusText || !subtitle || !container) return;

    // Update checkbox
    toggleCheckbox.checked = isLive;

    // Update text
    statusText.textContent = isLive ? 'Live' : 'Offline';
    statusText.classList.toggle('offline', !isLive);

    subtitle.textContent = isLive ? 'Accepting new orders' : 'Not accepting orders';

    // Update container style
    container.classList.toggle('live', isLive);
    container.classList.toggle('offline', !isLive);

    // Show/hide offline warning banner (Orders page)
    const banner = document.getElementById('offlineBanner');
    if (banner) banner.style.display = isLive ? 'none' : 'flex';

    console.log('🎨 UI updated:', isLive ? 'Live' : 'Offline');
}

// ── Setup Realtime Sync ─────────────────────────────────────
function setupToggleRealtime() {
    const sb = getSupabase();
    if (!sb) return;
    
    // Clean up existing channel
    if (toggleRealtimeChannel) {
        sb.removeChannel(toggleRealtimeChannel);
        toggleRealtimeChannel = null;
    }
    
    // Setup new channel for users table changes
    sb.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        
        toggleRealtimeChannel = sb
            .channel('toggle-sync')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                    filter: `id=eq.${user.id}`
                },
                (payload) => {
                    console.log('🔔 Realtime toggle update received:', payload);
                    const isAccepting = payload.new.is_accepting_orders;
                    updateToggleUI(isAccepting);
                }
            )
            .subscribe((status) => {
                console.log('🔗 Toggle realtime status:', status);
            });
    });
}

// ── Cleanup on Page Unload ──────────────────────────────────
window.addEventListener('beforeunload', () => {
    const sb = getSupabase();
    if (sb && toggleRealtimeChannel) {
        sb.removeChannel(toggleRealtimeChannel);
    }
});

// ── Auto-initialize when DOM is ready ───────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLiveToggle);
} else {
    initLiveToggle();
}
