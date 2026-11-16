
import "./globals.css";

export const metadata = {
  title: "Gridline | Online Tic-Tac-Toe",
  description: "Find a rival and play a quick, real-time game of tic-tac-toe.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
