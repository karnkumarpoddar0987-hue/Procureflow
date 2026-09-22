import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface Props {
  value: string
  size?: number
}

export default function QRCodeComponent({ value, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      }).catch(console.error)
    }
  }, [value, size])

  return (
    <div className="flex justify-center">
      <div className="bg-white p-3 rounded-2xl inline-block">
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
