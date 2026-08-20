import { api } from '@/utils/api'
import jsQR from 'jsqr'
import { useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'

export const Scanner = () => {
  const [scanResult, setScanResult] = useState(null)
  const [scanResultInfo, setScanResultInfo] = useState(null)
  const videoRef = useRef(null)

  useEffect(() => {
    initializeScanner()
    return () => {
      stopCamera()
    }
  }, [])

  const initializeScanner = () => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.addEventListener('loadedmetadata', () => {
            videoRef.current.play()
            scanQRCode()
          })
        }
      })
      .catch((err) => {
        console.error('Error accessing camera:', err)
      })
  }

  const scanQRCode = () => {
    const checkQRCode = () => {
      if (!videoRef.current || videoRef.current.videoWidth === 0) {
        requestAnimationFrame(checkQRCode)
        return
      }

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight

      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code) {
        setScanResult(code.data)
        sendApiRequest(code.data)
        storeScannedData(code.data)
        stopCamera()
      } else {
        requestAnimationFrame(checkQRCode)
      }
    }
    checkQRCode()
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject
      const tracks = stream.getTracks()

      tracks.forEach((track) => {
        track.stop()
      })
      videoRef.current.srcObject = null
    }
  }

  //storing data in local storage
  const storeScannedData = (data) => {
    const timestamp = Date.now();
    localStorage.setItem('lastQR', JSON.stringify({ data, timestamp }));

    setTimeout(() => {
      const storedData = JSON.parse(localStorage.getItem('lastQR'));
      if (storedData && storedData.timestamp === timestamp) {
        localStorage.removeItem('lastQR');
      }
    }, 60000); // Delete after 1 minute
  };

  const sendApiRequest = async (result,reprinted=false) => {
    try {
      const response = await api.post(`/QR/check`, {
        qrData: result
      })
      if (response.status !== 200) {
        throw new Error('Failed to fetch data')
      }
      const data = await response.data
      setScanResultInfo(data)
      if (data && data.exists && !data.used && !data.validityPassed) {
        return printTicket(data,reprinted)
      }
      if (data && data.exists && data.used) {
        Swal.fire({
          title: 'Error',
          text: 'QR code already used',
          icon: 'error'
        })
        return
      }
      if (data && data.exists && data.validityPassed) {
        Swal.fire({
          title: 'Error',
          text: 'Validity of this QR has expired',
          icon: 'error'
        })
        return
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const printTicket = (data,reprinted) => {
    const printContent = `
    <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Document</title>
            <style>
                @page {
                    size: 58mm 85mm;
                    margin: 0;
                }
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    justify-content: start;
                    align-items: center;
                }
                .container {
                    width: 48mm; /* 44mm - (5mm * 2) */
                    height: 75mm; /* 72mm - (5mm * 2) */
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: space-between;
                    padding: 4mm;
                    border: 1mm solid #000;
                }
                .header {
                    text-align: center; 
                }
                .logo {
                    width: 10mm; 
                    margin: auto;
                    display: block;
                }
                .title {
                    font-weight: bold;
                    font-size: 4.5mm; /* Reduced font size */
                    margin-top: 1mm; /* Reduced spacing */
                    margin-bottom: 0.5mm; /* Reduced spacing */
                }
                .subtitle {
                    font-size: 4mm; /* Reduced font size */
                    margin-top: 0.5mm; /* Reduced spacing */
                    margin-bottom: 1mm; /* Reduced spacing */
                }
                .seat-number {
                    padding: 0.5mm; /* Reduced padding */
                    text-align: center;
                    font-weight: bold;
                    font-size: 4mm; /* Reduced font size */
                    margin-top: 1mm; /* Reduced spacing */
                    margin-bottom: 1mm;
                }
                .footer {
                    text-align: center;
                    font-size: 4mm; /* Reduced font size */
                }
                .name {
                    font-weight: bold;
                    color: #333;
                    font-size: 4.5mm; /* Reduced font size */
                }
                .line-between {
                    border-bottom: 1px solid #000; /* Add line between "Movie Name" and "IIT Mandi" */
                    margin-left: 1mm; /* Add margin from the left border */
                    margin-right: 1mm; /* Add margin from the right border */
                }
            </style>
        </head>
        <body>
            <div class="container ticket w-54 h-72">
                        <div class="header">
                        <img alt="Film Screening Logo" class="logo"  src="data:image/png;base64,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" />
                            <h2 class="title">IIT Mandi</h2> 
                            <p class="line-between"></p>
                            <p class="subtitle">${data.movie}</p>
                            <p class="subtitle">${new Date(
      data.show
    ).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    })}</p>
                        ${reprinted ? `<p class="subtitle">(REPRINTED)</p>` : ''}
                        </div>
                        <div class="seat-number">Seat Number: ${data.seat}</div>
                        <div class="footer">
                            <p class="subtitle">Thanks for being a Valuable Member!</p>
                            <p class="subtitle">${data.name}</p>
                        </div>
                    </ticket>
                </body>
                </html>        
        `
    window.frames['print_frame'].document.body.innerHTML = printContent
    window.frames['print_frame'].window.focus()
    window.frames['print_frame'].window.print()
  }

  const getInfo = () => {
    if (!scanResultInfo) return 'Scanning...'
    if (!scanResultInfo.exists) return 'QR code not found'
    if (scanResultInfo.used) return 'QR code already used'
    if (scanResultInfo.validityPassed) return 'Validity of this QR has expired'
    const membershipType =
      scanResultInfo.membershipType === 'filmFest' ? ' [Film Fest Pass]' : ''
    return `Ticket for ${scanResultInfo.name} (${scanResultInfo.email}) for ${scanResultInfo.movie} on ${new Date(scanResultInfo.show).toLocaleDateString('en-IN')}${membershipType}`
  }

  //print last scanned qr
  const printLastScannedQR = async () => {
    try {
      const lastQR = JSON.parse(localStorage.getItem('lastQR'));
      
      if (!lastQR) {
        Swal.fire({ title: 'Error', text: 'No QR code has been scanned yet', icon: 'error' });
        return;
      }
      
      if (Date.now() - lastQR.timestamp >= 60000) {
        localStorage.removeItem('lastQR');
        Swal.fire({ title: 'Error', text: 'The last scanned QR code has expired', icon: 'error' });
        return;
      }
      
      await sendApiRequest(lastQR.data,true);
      localStorage.removeItem('lastQR');
      
    } catch (error) {
      console.error('Error printing last QR:', error);
      Swal.fire({ title: 'Error', text: 'Failed to print last QR code', icon: 'error' });
    }
  };

  return (
    <div className='h-full w-full'>
      <div className=" w-full flex justify-end">
        <button
          className="px-4 py-2 mr-6 bg-red-700 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
          onClick={printLastScannedQR}
        >
          Print Last Scanned QR
        </button>
      </div>
      <div className="mt-4 flex h-full w-full justify-center font-monts">
        <div style={{ maxWidth: '100%', height: 'auto' }}>
          {scanResult ? (
            <div>{getInfo()}</div>
          ) : (
            <video ref={videoRef} width="100%" height="auto"></video>
          )}
        </div>

        <iframe
          name="print_frame"
          width="0"
          height="0"
          frameBorder="0"
          src="about:blank"
        ></iframe>
      </div>
    </div>
  )
}

export default Scanner
