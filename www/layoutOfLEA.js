
const STORAGE = {
    contacts: "lea_contacts_v1",
    history: "lea_history_v1",
    profile: "lea_profile_v1"
};

function readData(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

function saveData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

let contacts = readData(STORAGE.contacts, []);
let activities = readData(STORAGE.history, []);
let profile = readData(STORAGE.profile, {
    name: "",
    phone: "",
    email: ""
});

let currentLocation = null;
let locationWatchId = null;

// Navigation
function showScreen(screenName) {
    const target = document.getElementById(screenName);
    if (!target) return;

    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.add("hidden");
    });

    target.classList.remove("hidden");

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.screen === screenName
        );
    });

    if (screenName === "contacts") {
        renderContacts();
        loadPhoneContacts();
    }
    const keypadFab = document.getElementById("keypadFab");
    if (keypadFab) keypadFab.classList.toggle("hidden", screenName !== "contacts");
    if (screenName === "history") renderHistory();
    if (screenName === "profile") renderProfile();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Activity history
function logActivity(title, description, type = "general") {
    activities.unshift({
        id: Date.now() + Math.random(),
        title,
        description,
        type,
        time: new Date().toLocaleString()
    });

    activities = activities.slice(0, 100);
    saveData(STORAGE.history, activities);
}

function renderHistory() {
    const list = document.getElementById("historyList");

    document.getElementById("historyCount").textContent =
        activities.length;

    document.getElementById("locationCount").textContent =
        activities.filter(item => item.type === "location").length;

    if (activities.length === 0) {
        list.innerHTML =
            '<div class="empty-state">No activities yet. Your app actions will appear here.</div>';
        return;
    }

    list.innerHTML = activities.map(item => {
        const icon = item.type === "location" ? "📍"
            : item.type === "call" ? "📞" : "🛡️";

        return `
            <div class="history-item">
                <div class="history-icon">${icon}</div>
                <div class="history-details">
                    <strong>${escapeHTML(item.title)}</strong>
                    <small>${escapeHTML(item.description)}<br>${escapeHTML(item.time)}</small>
                </div>
            </div>
        `;
    }).join("");
}

function clearHistory() {
    if (!confirm("Clear all recorded activity from this device?")) return;

    activities = [];
    saveData(STORAGE.history, activities);
    renderHistory();
}



async function triggerSOS() {
    // Replace with your friend's number, including country code.
    const friendNumber = "112";

    try {
        const bridge = window.Capacitor?.Plugins?.DirectCall;

        if (bridge && typeof bridge.callNumber === "function") {
            await bridge.callNumber({ number: friendNumber });
        } else {
            // Fallback: opens the phone dialer.
            window.location.href = `tel:${friendNumber}`;
        }
    } catch (error) {
        alert("Calling failed. Please use the phone dialer.");
        window.location.href = `tel:${friendNumber}`;
    }
}


// Contacts

let phoneContacts = [];
let phoneContactsLoaded = false;
let phoneContactsLoading = false;

function renderContacts() {
    const list = document.getElementById("contactList");
    const status = document.getElementById("phoneContactsStatus");
    if (!list || !status) return;

    const combined = [];
    const seen = new Set();
    [...phoneContacts, ...contacts].forEach(contact => {
        const name = String(contact.name || "Unknown contact").trim();
        const phone = String(contact.phone || "").trim();
        if (!phone) return;
        const key = phone.replace(/\D/g, "") + "|" + name.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        combined.push({ name, phone, source: contact.source || "saved" });
    });
    combined.sort((a, b) => a.name.localeCompare(b.name));

    if (phoneContactsLoading) status.textContent = "Loading phone contacts…";
    else if (phoneContactsLoaded && phoneContacts.length) status.textContent = `${phoneContacts.length} contact${phoneContacts.length === 1 ? "" : "s"} from your phone`;
    else if (!phoneContactsLoaded) status.textContent = "Allow contact access in the Android permission prompt to show your phone contacts.";
    else status.textContent = "No phone contacts found. Your saved LEA contacts are shown below if available.";

    if (!combined.length) {
        list.innerHTML = '<div class="empty-state">No contacts to show yet. Allow LEA to access your phone contacts.</div>';
        return;
    }

    list.innerHTML = combined.map(contact => `
        <div class="contact-item">
            <div class="contact-avatar">${escapeHTML(contact.name.charAt(0).toUpperCase())}</div>
            <div class="contact-details"><strong>${escapeHTML(contact.name)}</strong><small>${escapeHTML(contact.phone)}</small></div>
            <button class="contact-call-icon" type="button" aria-label="Call ${escapeHTML(contact.name)}" onclick='callContact(${JSON.stringify(contact.phone)}, ${JSON.stringify(contact.name)})'>☎</button>
        </div>
    `).join("");
}

async function loadPhoneContacts() {
    if (phoneContactsLoading) return;
    const status = document.getElementById("phoneContactsStatus");
    if (!status) return;
    const plugin = window.Capacitor?.Plugins?.PhoneContacts;
    if (!plugin || typeof plugin.getContacts !== "function") {
        phoneContactsLoaded = false;
        status.textContent = "Phone contact import is not connected yet. The Android plugin must be added to the APK build.";
        renderContacts();
        return;
    }

    phoneContactsLoading = true;
    renderContacts();
    try {
        const result = await plugin.getContacts();
        phoneContacts = (result.contacts || []).map(item => ({
            name: String(item.name || "Unknown contact"),
            phone: String(item.phone || ""),
            source: "phone"
        })).filter(item => item.phone);
        phoneContactsLoaded = true;
    } catch (error) {
        console.error("Could not load phone contacts:", error);
        status.textContent = "Contact permission was not granted or contacts could not be loaded.";
    } finally {
        phoneContactsLoading = false;
        renderContacts();
    }
}

function toggleDialer() {
    const panel = document.getElementById("dialerPanel");
    const button = document.getElementById("keypadFab");

    if (!panel || !button) return;

    const opening = panel.classList.contains("hidden");

    panel.classList.toggle("hidden", !opening);
    button.classList.toggle("is-open", opening);

    button.setAttribute(
        "aria-label",
        opening ? "Close keypad" : "Open keypad"
    );

    button.title = opening ? "Close keypad" : "Open keypad";

    // Do not focus the number field or automatically scroll.
}

// Profile
function renderProfile() {
    document.getElementById("profileName").value = profile.name || "";
    document.getElementById("profilePhone").value = profile.phone || "";
    document.getElementById("profileEmail").value = profile.email || "";

    document.getElementById("profileDisplayName").textContent =
        profile.name || "Your name";

    document.getElementById("avatarInitial").textContent =
        profile.name ? profile.name.charAt(0).toUpperCase() : "U";

    const profilePanel = document.getElementById("profilePanel");

    if (profile.name) {
        profilePanel.classList.add("hidden");
    } else {
        profilePanel.classList.remove("hidden");
    }
}

document.getElementById("profileForm").addEventListener("submit", function(event) {
    event.preventDefault();

    profile = {
        name: document.getElementById("profileName").value.trim(),
        phone: document.getElementById("profilePhone").value.trim(),
        email: document.getElementById("profileEmail").value.trim()
    };

    if (saveData(STORAGE.profile, profile)) {
        logActivity("Profile updated", profile.name || "Profile information");
        renderProfile();
        document.getElementById("profilePanel").classList.add("hidden");
    }
});

// Location

function getLocation() {
    const output = document.getElementById("locationText");

    if (!navigator.geolocation) {
        output.textContent =
            "Location is not supported on this device.";
        return;
    }

    output.textContent = "Starting live location...";

    // Prevent multiple location watchers
    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
    }

    locationWatchId = navigator.geolocation.watchPosition(
        position => {
            currentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };

            output.textContent =
                `Live coordinates:\n` +
                `Latitude: ${currentLocation.latitude.toFixed(6)}\n` +
                `Longitude: ${currentLocation.longitude.toFixed(6)}`;

            logActivity(
                "Live location updated",
                "New device coordinates received",
                "location"
            );
        },
        error => {
            const messages = {
                1: "Location permission denied. Check app settings.",
                2: "Location is unavailable. Check GPS.",
                3: "Location request timed out. Try again."
            };

            output.textContent =
                messages[error.code] || "Unable to update location.";
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 20000
        }
    );
}



async function shareLocation() {
    const output = document.getElementById("locationText");

    if (!currentLocation) {
        output.textContent = "Getting your location first...";
        getLocation();
        return;
    }

    const url =
        `https://maps.google.com/?q=${currentLocation.latitude},${currentLocation.longitude}`;

    const message =
        `My location from LEA: ${url}`;

    const whatsappUrl =
        `https://wa.me/?text=${encodeURIComponent(message)}`;

    output.textContent = "Opening WhatsApp...";

    logActivity(
        "Location sharing requested",
        "Opened WhatsApp with a location link",
        "location"
    );

    window.location.href = whatsappUrl;
}

// Safe text rendering for user-entered values
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


async function callContact(phone, name) {
    const number = String(phone || "").trim();

    if (!number) {
        alert("This contact has no phone number.");
        return;
    }

    try {
        const bridge = window.Capacitor?.Plugins?.DirectCall;

        if (bridge && typeof bridge.callNumber === "function") {
            await bridge.callNumber({ number: number });
        } else {
            window.location.href = `tel:${number}`;
        }

        logActivity(
            "Contact call requested",
            "Calling " + name,
            "call"
        );
    } catch (error) {
        console.error("Contact call failed:", error);
        window.location.href = `tel:${number}`;
    }
}


function dialerPress(value) {
    const input = document.getElementById("dialerNumber");
    if (!input) return;
    input.value += value;
}

function dialerBackspace() {
    const input = document.getElementById("dialerNumber");
    if (!input) return;
    input.value = input.value.slice(0, -1);
}

async function callDialerNumber() {
    const input = document.getElementById("dialerNumber");
    const number = input.value.trim();

    if (!number) {
        alert("Enter a phone number first.");
        return;
    }

    await callContact(number, "Dialed number");
}


// Initial display
renderContacts();
renderHistory();
renderProfile();
