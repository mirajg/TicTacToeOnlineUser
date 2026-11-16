
import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Gridline | Online Tic-Tac-Toe",
  description: "Find a rival and play a quick, real-time game of tic-tac-toe.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          type="module"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token":"002eb3130b424f4b89c0c3219eed9a76"}'
        />
      </body>
    </html>
  );
}
