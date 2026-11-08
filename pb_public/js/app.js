// PWA install/update handlers — registered at top-level window scope
// to avoid race conditions with Alpine's init callback.
(function() {
  let deferredInstallPrompt = null;

  const setInstallButtonVisible = (visible) => {
    const button = document.getElementById('pwa-install');
    if (button) button.hidden = !visible;
  };

  // Store the browser's install prompt so the app can trigger it from a
  // user gesture later. The event only fires when the app is installable.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    setInstallButtonVisible(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    setInstallButtonVisible(false);
  });

  // Called by the install button in index.html.
  window.promptPwaInstall = async () => {
    if (!deferredInstallPrompt) return false;

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    setInstallButtonVisible(false);
    return true;
  };

  if ('serviceWorker' in navigator) {
    // Remember whether a worker was already controlling the page so the
    // first install does not trigger an unnecessary reload.
    const hadController = Boolean(navigator.serviceWorker.controller);

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('[PWA] Service Worker registered with scope:', reg.scope);

        // Prompt when a new version has finished installing and is waiting.
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state !== 'installed' || !navigator.serviceWorker.controller) {
              return;
            }

            if (window.confirm('A new version is available. Refresh now?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      }).catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
    });

    // The new worker takes over after SKIP_WAITING; reload once to pick it up.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return;
      window.location.reload();
    });
  }
})();

document.addEventListener("alpine:init", () => {
  // Initialize PocketBase client (single instance)
  const pb = new PocketBase();

  Alpine.data("pbData", () => ({
    isLoading: true,

    // Auth state
    showLogin: true,
    email: "",
    password: "",
    loginMessage: "",
    authData: null,

    // items
    items: [],
    itemCount: 0,
    newItem: "",
    isInputFocused: false,

    errors: {},
    config: {},

    // Initialize component
    async init() {
      // Check existing auth
      try {
        if (pb.authStore.isValid) {
          try {
            // Refresh auth if token exists
            await pb.collection("users").authRefresh();
            this.showLogin = false;
            this.authData = pb.authStore;
            await this.getItems();
          } catch (err) {
            this.handleAuthError(err);
          }
        }
        this.fetchConfig();
      } catch (error) {
        console.error("Failed to load config:", error);
      } finally {
        this.isLoading = false;
      }
    },

    // Login method
    async login() {
      try {
        pb.autoCancellation(false);
        await pb
          .collection("users")
          .authWithPassword(this.email, this.password);

        this.showLogin = false;
        this.email = "";
        this.password = "";
        await this.getItems();
      } catch (err) {
        this.handleAuthError(err);
        this.loginMessage = err.message || "Login failed";
      }
    },

    // Logout method
    logout() {
      pb.authStore.clear();
      this.showLogin = true;
      this.items = [];
    },

    // Fetch items from PocketBase
    async getItems() {
      try {
        this.items = await pb.collection("items").getFullList({
          sort: "-created", // Newest first
        });
        this.itemCount = this.items.length;
      } catch (err) {
        console.error("Failed to load lists:", err);
      }
    },

    // Create new item
    async addItem() {
      console.log("adding Items");
      this.validateItemField();

      if (Object.keys(this.errors).length !== 0) {
        this.newItem = "";
        return;
      }
      try {
        await pb.collection("items").create({
          item: this.newItem,
          createdBy: pb.authStore.record.name, // Link to logged-in user
        });
        this.newItem = "";
        this.$refs.itemInput.blur();
        await this.getItems();
      } catch (err) {
        console.error("Failed to create item:", err);
      }
    },

    // remove item
    async removeItem(id) {
      console.log("removing item");
      console.log(id);

      try {
        let response = await pb.collection("items").delete(id);
        console.log(`delete response: ${response}`);
        if (response === true) {
          await this.getItems();
        }
      } catch (err) {
        console.error("Failed to delete item:", err);
      }
    },

    validateItemField() {
      this.errors = {};
      if (!this.newItem.trim()) {
        this.errors.empty =
          "Please enter somethings besides an empty spaces puff";
      }
    },

    // edit item
    async editItem() {
      // TODO this should probably just be a checkbox to mark
      // as complete.
      console.log("edit item");
    },

    // Handle auth errors
    handleAuthError(err) {
      console.error("Auth error:", err);
      pb.authStore.clear();
      this.showLogin = true;
      this.loginMessage = err.message || "Authentication error";
    },

    async fetchConfig() {
      try {
        const res = await fetch("/api/_/config");
        this.config = await res.json();
      } catch (err) {
        console.log("Config load failed:");
        console.log(err);
        this.config = {}; // Fallback empty
      } finally {
        this.loading = false;
      }
    },
  }));
});
