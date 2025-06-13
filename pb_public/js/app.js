document.addEventListener("alpine:init", () => {
  // Initialize PocketBase client (single instance)
  const pb = new PocketBase(); // Ensure port matches your PB server

  Alpine.data("pbData", () => ({
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

    // Initialize component
    async init() {
      // Check existing auth
      if (pb.authStore.isValid) {
        try {
          // Refresh auth if token exists
          await pb.collection("users").authRefresh();
          this.showLogin = false;
          this.authData = pb.authStore;
          await this.getItems(); // Load lists if authenticated
        } catch (err) {
          this.handleAuthError(err);
        }
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
        console.log("items returned", this.items.length);
        this.itemCount = this.items.length;
      } catch (err) {
        console.error("Failed to load lists:", err);
      }
    },

    // Create new item
    async addItem() {
      console.log("clicking addItem!");
      if (!this.newItem.trim()) return;
        try {
          await pb.collection("items").create({
            item: this.newItem,
            createdBy: pb.authStore.record.name // Link to logged-in user
          });
          this.newItem = "";
          this.$refs.itemInput.blur(); 
          await this.getItems(); // Refresh list
        } catch (err) {
          console.error("Failed to create item:", err);
        }
      },

      // remove item
      async removeItem(id) {
        console.log('removing item');
        console.log(id);
        
        try {
          let response = await pb.collection("items").delete(id);
          console.log(`delete response: ${response}`);
          if (response === true)
              { await this.getItems(); }
        } catch (err) {
          console.error("Failed to delete item:", err);
        }
      },

        // edit item
      async editItem() {
        // TODO this should probably just be a checkbox to mark
        // as complete.
        console.log('edit item');
      },

    // Handle auth errors
    handleAuthError(err) {
      console.error("Auth error:", err);
      pb.authStore.clear();
      this.showLogin = true;
      this.loginMessage = err.message || "Authentication error";
    },
  }));
});
