/// <reference types="vite/client" />

interface FileSystemFileHandle {
  getFile(): Promise<File>;
}

interface LaunchParams {
  files?: FileSystemFileHandle[];
}

interface LaunchQueue {
  setConsumer(consumer: (launchParams: LaunchParams) => void): void;
}

interface Window {
  launchQueue?: LaunchQueue;
  google?: {
    accounts?: {
      id?: {
        initialize(options: GoogleIdentityInitializeOptions): void;
        renderButton(parent: HTMLElement, options: GoogleIdentityButtonOptions): void;
      };
    };
  };
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityInitializeOptions {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
}

interface GoogleIdentityButtonOptions {
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  type?: "standard" | "icon";
  shape?: "rectangular" | "pill" | "circle" | "square";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  width?: number;
}
