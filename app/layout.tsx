import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Trinova",
  description: "Business Management Suite",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="top-right"
          expand={false}
          closeButton
          duration={5000}
          toastOptions={{
            style: {
              fontFamily: "Georgia, Cambria, 'Times New Roman', serif",
              background: "#0d1b2a",
              color: "#d9c98a",
              border: "1px solid #1e3a5f",
              borderRadius: "12px",
              padding: "14px 18px",
              minWidth: "300px",
              maxWidth: "420px",
              boxShadow: "0 8px 32px rgba(13,27,42,0.45)",
              fontSize: "13px",
            },
            classNames: {
              closeButton:
                "!bg-navy-800 !text-gold-400 !border-navy-700 hover:!bg-navy-700",
            },
          }}
        />
      </body>
    </html>
  );
}
