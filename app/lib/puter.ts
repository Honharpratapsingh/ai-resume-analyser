import { create } from "zustand";

// ---------------------------------------------------------------------------
// Puter.js global type augmentation
// ---------------------------------------------------------------------------
interface PuterUser {
  uuid: string;
  username: string;
  email?: string;
  email_confirmed?: boolean;
}

interface PuterAuth {
  signIn: () => Promise<{ username: string }>;
  signOut: () => Promise<void>;
  isSignedIn: () => Promise<boolean>;
  getUser: () => Promise<PuterUser>;
}

interface PuterFS {
  upload: (file: File, options?: Record<string, unknown>) => Promise<unknown>;
  read: (path: string) => Promise<Blob>;
}

interface PuterAI {
  chat: (
    prompt: string,
    options?: Record<string, unknown>,
  ) => Promise<{ message: { content: string } } | string>;
  img2txt: (
    image: File | Blob | string,
    options?: Record<string, unknown>,
  ) => Promise<string>;
}

interface PuterKV {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
  del: (key: string) => Promise<void>;
  list: () => Promise<string[]>;
}

interface PuterSDK {
  auth: PuterAuth;
  fs: PuterFS;
  ai: PuterAI;
  kv: PuterKV;
}

declare global {
  interface Window {
    puter: PuterSDK;
  }
}

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------
interface PuterStoreAuth {
  isAuthenticated: boolean;
  user: PuterUser | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getUser: () => PuterUser | null;
}

interface PuterStore {
  auth: PuterStoreAuth;
  isLoading: boolean;
  error: string | null;

  // SDK wrappers
  fs: {
    upload: (file: File, options?: Record<string, unknown>) => Promise<unknown>;
    read: (path: string) => Promise<Blob>;
  };
  ai: {
    feedback: (
      prompt: string,
      options?: Record<string, unknown>,
    ) => Promise<string>;
    chat: (
      prompt: string,
      options?: Record<string, unknown>,
    ) => Promise<string>;
    img2txt: (
      image: File | Blob | string,
      options?: Record<string, unknown>,
    ) => Promise<string>;
  };
  kv: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
    delete: (key: string) => Promise<void>;
    list: () => Promise<string[]>;
  };

  // Lifecycle
  init: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getPuter(): PuterSDK {
  if (typeof window === "undefined" || !window.puter) {
    throw new Error("Puter SDK is not loaded yet.");
  }
  return window.puter;
}

// ---------------------------------------------------------------------------
// Zustand store
// ---------------------------------------------------------------------------
export const usePuterStore = create<PuterStore>((set, get) => ({
  // -- Auth slice -----------------------------------------------------------
  auth: {
    isAuthenticated: false,
    user: null,

    signIn: async () => {
      try {
        set({ error: null });
        const puter = getPuter();
        await puter.auth.signIn();

        const user = await puter.auth.getUser();
        set({
          auth: { ...get().auth, isAuthenticated: true, user },
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Sign-in failed.";
        set({ error: message });
        throw err;
      }
    },

    signOut: async () => {
      try {
        set({ error: null });
        const puter = getPuter();
        await puter.auth.signOut();
        set({
          auth: { ...get().auth, isAuthenticated: false, user: null },
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Sign-out failed.";
        set({ error: message });
      }
    },

    getUser: () => get().auth.user,
  },

  isLoading: true,
  error: null,

  // -- FS slice -------------------------------------------------------------
  fs: {
    upload: async (file, options) => {
      const puter = getPuter();
      return puter.fs.upload(file, options);
    },
    read: async (path) => {
      const puter = getPuter();
      return puter.fs.read(path);
    },
  },

  // -- AI slice -------------------------------------------------------------
  ai: {
    feedback: async (prompt, options) => {
      const puter = getPuter();
      const response = await puter.ai.chat(prompt, options);
      return typeof response === "string"
        ? response
        : response.message.content;
    },
    chat: async (prompt, options) => {
      const puter = getPuter();
      const response = await puter.ai.chat(prompt, options);
      return typeof response === "string"
        ? response
        : response.message.content;
    },
    img2txt: async (image, options) => {
      const puter = getPuter();
      return puter.ai.img2txt(image, options);
    },
  },

  // -- KV slice -------------------------------------------------------------
  kv: {
    get: async (key) => {
      const puter = getPuter();
      return puter.kv.get(key);
    },
    set: async (key, value) => {
      const puter = getPuter();
      return puter.kv.set(key, value);
    },
    delete: async (key) => {
      const puter = getPuter();
      return puter.kv.del(key);
    },
    list: async () => {
      const puter = getPuter();
      return puter.kv.list();
    },
  },

  // -- Lifecycle ------------------------------------------------------------
  init: () => {
    // Poll for window.puter — it loads async via the <script> tag
    let attempts = 0;
    const maxAttempts = 50; // 50 × 100ms = 5 s timeout

    const interval = setInterval(async () => {
      attempts++;

      if (typeof window !== "undefined" && window.puter) {
        clearInterval(interval);

        try {
          const puter = window.puter;
          const signedIn = await puter.auth.isSignedIn();

          if (signedIn) {
            const user = await puter.auth.getUser();
            set({
              auth: { ...get().auth, isAuthenticated: true, user },
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to check auth status.";
          set({ error: message, isLoading: false });
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        set({
          error: "Puter SDK failed to load. Please refresh the page.",
          isLoading: false,
        });
      }
    }, 100);
  },
}));
