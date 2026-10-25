
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
        alert("Could not save data in this browser.");
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

    if (screenName === "contacts") renderContacts();
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

function triggerSOS() {
    const accepted = confirm(
        "Do you need emergency assistance? Press OK to open the emergency dialer."
    );

    if (!accepted) return;

    logActivity("SOS activated", "Emergency dialer requested", "call");
    window.location.href = "tel:112";
}

// Contacts
function renderContacts() {
    const list = document.getElementById("contactList");

    document.getElementById("contactCount").textContent = contacts.length;

    if (contacts.length === 0) {
        list.innerHTML =
            '<div class="empty-state">No contacts saved yet. Add someone you trust above.</div>';
        return;
    }

    list.innerHTML = contacts.map(contact => `
        <div class="contact-item">
            <div class="contact-avatar">${escapeHTML(contact.name.charAt(0).toUpperCase())}</div>
            <div class="contact-details">
                <strong>${escapeHTML(contact.name)}</strong>
                <small>${escapeHTML(contact.phone)}</small>
            </div>
            <a class="mini-button" href="tel:${encodeURIComponent(contact.phone)}"
               onclick="logActivity('Contact call requested', ${JSON.stringify("Dialer opened for " + contact.name)}, 'call')">Call</a>
            <button class="mini-button delete-button"
                onclick="deleteContact('${contact.id}')"
                aria-label="Delete ${escapeHTML(contact.name)}">✕</button>
        </div>
    `).join("");
}

document.getElementById("contactForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("contactName").value.trim();
    const phone = document.getElementById("contactPhone").value.trim();

    if (!name || !phone) return;

    contacts.push({
        id: String(Date.now()),
        name,
        phone
    });

    if (saveData(STORAGE.contacts, contacts)) {
        logActivity("Contact added", name);
        this.reset();
        renderContacts();
    }
});

function deleteContact(id) {
    const contact = contacts.find(item => item.id === id);
    if (!contact) return;

    if (!confirm(`Delete ${contact.name} from your contacts?`)) return;

    contacts = contacts.filter(item => item.id !== id);
    saveData(STORAGE.contacts, contacts);
    logActivity("Contact deleted", contact.name);
    renderContacts();
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
        alert("Profile saved on this device.");
    }
});

// Location
function getLocation() {
    const output = document.getElementById("locationText");

    if (!navigator.geolocation) {
        output.textContent = "Geolocation is not supported by this browser.";
        return;
    }

    output.textContent = "Requesting location permission...";

    navigator.geolocation.getCurrentPosition(
        position => {
            currentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };

            output.textContent =
                `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}`;

            logActivity("Location retrieved", "Location permission granted", "location");
        },
        error => {
            const messages = {
                1: "Location permission denied. Check browser settings.",
                2: "Location is currently unavailable.",
                3: "Location request timed out."
            };

            output.textContent = messages[error.code] || "Unable to get location.";
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}

async function shareLocation() {
    if (!currentLocation) {
        alert("First tap Locate and allow location access.");
        getLocation();
        return;
    }

    const url = `https://maps.google.com/?q=${currentLocation.latitude},${currentLocation.longitude}`;
    const message = `My current location: ${url}`;

    try {
        if (navigator.share) {
            await navigator.share({
                title: "My emergency location",
                text: message
            });
        } else if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(message);
            alert("Location link copied. You can now send it to a trusted contact.");
        } else {
            window.open(url, "_blank", "noopener,noreferrer");
            alert("Your map has opened. Copy its link to share your location.");
        }

        logActivity("Location sharing requested", "A location link was shared or opened", "location");
    } catch (error) {
        if (error.name !== "AbortError") {
            alert("Could not open the sharing interface. Try again.");
        }
    }
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

// Initial display
renderContacts();
renderHistory();
renderProfile();
