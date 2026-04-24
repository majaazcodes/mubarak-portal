"use client";

import { QRCodeSVG } from "qrcode.react";

interface QrImageProps {
  token: string;
  size?: number;
  className?: string;
}

/**
 * Renders a scannable QR for the given token client-side. The backend stores
 * the token as a string; it's the admin's job to turn it into a visual QR.
 * Using SVG so it stays sharp at any zoom level and is easy to print.
 */
export function QrImage({ token, size = 192, className }: QrImageProps) {
  return (
    <QRCodeSVG
      value={token}
      size={size}
      level="M"
      marginSize={2}
      className={className}
      role="img"
      aria-label="Pilgrim QR code"
    />
  );
}
