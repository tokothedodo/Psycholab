import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
    value: string;
    size?: number;
}

export function QRCode({ value, size = 160 }: QRCodeProps) {
    return (
        <QRCodeSVG
            value={value}
            size={size}
            level="M"
            includeMargin={false}
        />
    );
}