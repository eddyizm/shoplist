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
