import type {Metadata, Viewport} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EDC Media J.A.R.V.I.S. Executive OS',
  description:
    'Full-duplex Gemini Live 3.8 voice operating system with real-time VAD, instant barge-in, premium human voice personas, and autonomous business command for EDC Media.',
  openGraph: {
    title: 'EDC Media J.A.R.V.I.S. Executive OS',
    description:
      'Full-duplex Gemini Live 3.8 voice operating system with real-time VAD, instant barge-in, premium human voice personas, and autonomous business command for EDC Media.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EDC Media J.A.R.V.I.S. Executive OS',
    description:
      'Full-duplex Gemini Live 3.8 voice operating system with real-time VAD, instant barge-in, premium human voice personas, and autonomous business command for EDC Media.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#060911',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="bg-[#060911] text-slate-100 antialiased selection:bg-sky-500/30 selection:text-sky-200 font-sans overflow-x-hidden"
      >
        {children}
      </body>
    </html>
  );
}
