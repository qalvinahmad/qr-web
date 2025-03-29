import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import "@/styles/globals.css";
import JsBarcode from 'jsbarcode';
import { Barcode, Copy, Download, QrCode, Upload } from 'lucide-react';
import QRCode from 'qrcode.react';
import React, { useEffect, useRef, useState } from 'react';

type CodeType = 'qr' | 'barcode';
type BarcodeFormat = 'CODE128' | 'EAN13' | 'UPC' | 'CODE39';
type CornerType = 'square' | 'round';

function App() {
  const [codeType, setCodeType] = useState<CodeType>('qr');
  const [text, setText] = useState('https://example.com');
  const [qrColor, setQrColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#dbdbdb');
  const [size, setSize] = useState(200);
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('CODE128');
  const [includeImage, setIncludeImage] = useState(false);
  const [imageUrl, setImageUrl] = useState('https://cdn.dribbble.com/userupload/42711073/file/original-6706d98dad1996e93e1a65d7ee785458.png?resize=752x&vertical=center');
  const [imageSize, setImageSize] = useState(20); // percentage of QR code size
  const [cornerType, setCornerType] = useState<CornerType>('square');
  const [localImage, setLocalImage] = useState<string | null>(null);
  
  const barcodeRef = useRef<SVGSVGElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getDefaultValue = (format: BarcodeFormat): string => {
    switch (format) {
      case 'EAN13':
        return '5901234123457';
      case 'UPC':
        return '123456789012';
      default:
        return text;
    }
  };

  // Update the format change handler in the Select component
  const handleFormatChange = (value: BarcodeFormat) => {
    setBarcodeFormat(value);
    setText(getDefaultValue(value));
  };

  useEffect(() => {
    if (codeType === 'barcode' && barcodeRef.current) {
      try {
        // Clear previous barcode
        while (barcodeRef.current.firstChild) {
          barcodeRef.current.removeChild(barcodeRef.current.firstChild);
        }

        // Validate input based on format
        let validInput = text;
        switch (barcodeFormat) {
          case 'EAN13':
            // Pad with zeros if less than 13 digits
            validInput = text.replace(/[^\d]/g, '').slice(0, 13).padEnd(13, '0');
            if (validInput.length !== 13) {
              validInput = '5901234123457'; // Default valid EAN-13
            }
            break;
          case 'UPC':
            // Pad with zeros if less than 12 digits
            validInput = text.replace(/[^\d]/g, '').slice(0, 12).padEnd(12, '0');
            if (validInput.length !== 12) {
              validInput = '123456789012'; // Default valid UPC
            }
            break;
          case 'CODE39':
            validInput = text.replace(/[^0-9A-Z\-\.\ \$\/\+\%]/gi, '');
            break;
          // CODE128 can handle all characters, so no validation needed
        }

        JsBarcode(barcodeRef.current, validInput, {
          format: barcodeFormat,
          width: 2,
          height: 100,
          displayValue: true,
          background: bgColor,
          lineColor: qrColor,
          valid: (valid) => {
            if (!valid) {
              console.error('Invalid barcode input for format:', barcodeFormat);
            }
          }
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [text, barcodeFormat, qrColor, bgColor, codeType]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLocalImage(result);
        setIncludeImage(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const getDataUrl = (element: SVGSVGElement | HTMLCanvasElement): string => {
    if (element instanceof HTMLCanvasElement) {
      return element.toDataURL('image/png');
    } else {
      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(element);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      return URL.createObjectURL(svgBlob);
    }
  };

  const downloadCode = () => {
    const element = codeType === 'qr' ? qrRef.current?.querySelector('canvas') : barcodeRef.current;
    if (!element) return;

    const dataUrl = getDataUrl(element);
    const link = document.createElement('a');
    link.download = `${codeType}-code.png`;
    link.href = dataUrl;
    link.click();
    
    // Cleanup if using object URL
    if (codeType === 'barcode') {
      URL.revokeObjectURL(dataUrl);
    }
  };

  const copyToClipboard = async () => {
    const element = codeType === 'qr' ? qrRef.current?.querySelector('canvas') : barcodeRef.current;
    if (!element) return;

    const dataUrl = getDataUrl(element);
    
    if (codeType === 'barcode') {
      // For SVG, we need to create a canvas first
      const img = new window.Image();
      img.width = (element instanceof SVGSVGElement ? element.width.baseVal.value : element.width) || 0;
      img.height = (element instanceof SVGSVGElement ? element.height.baseVal.value : element.height) || 0;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        const pngDataUrl = canvas.toDataURL('image/png');
        const blob = await (await fetch(pngDataUrl)).blob();
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              [blob.type]: blob
            })
          ]);
        } catch (err) {
          console.error('Failed to copy to clipboard:', err);
        }
        URL.revokeObjectURL(dataUrl);
      };
      img.src = dataUrl;
    } else {
      const blob = await (await fetch(dataUrl)).blob();
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  return (
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <div className="container mx-auto py-8 px-4">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Code Generator</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={codeType === 'qr' ? 'default' : 'secondary'}
                  onClick={() => setCodeType('qr')}
                  className="flex items-center gap-2"
                >
                  <QrCode className="h-4 w-4" /> QR Code
                </Button>
                <Button
                  variant={codeType === 'barcode' ? 'default' : 'secondary'}
                  onClick={() => setCodeType('barcode')}
                  className="flex items-center gap-2"
                >
                  <Barcode className="h-4 w-4" /> Barcode
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Text or URL</Label>
                  <Input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter text or URL"
                  />
                </div>

                {codeType === 'barcode' && (
                  <div className="space-y-2">
                    <Label>Barcode Format</Label>
                    <Select value={barcodeFormat} onValueChange={handleFormatChange}>
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="CODE128">Code 128</SelectItem>
                        <SelectItem value="EAN13">EAN-13</SelectItem>
                        <SelectItem value="UPC">UPC</SelectItem>
                        <SelectItem value="CODE39">Code 39</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {codeType === 'qr' && (
                  <div className="space-y-2">
                    <Label>Corner Style</Label>
                    <div className="flex gap-4">
                      <Button
                        variant={cornerType === 'square' ? 'default' : 'outline'}
                        onClick={() => setCornerType('square')}
                        className="flex-1"
                      >
                        Square
                      </Button>
                      <Button
                        variant={cornerType === 'round' ? 'default' : 'outline'}
                        onClick={() => setCornerType('round')}
                        className="flex-1"
                      >
                        Round
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Code Color</Label>
                    <div className="rounded-md border border-input overflow-hidden">
                      <Input
                        type="color"
                        value={qrColor}
                        onChange={(e) => setQrColor(e.target.value)}
                        className="w-full h-10 cursor-pointer border-0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Background</Label>
                    <div className="rounded-md border border-input overflow-hidden">
                      <Input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-full h-10 cursor-pointer border-0"
                      />
                    </div>
                  </div>
                </div>

                {codeType === 'qr' && (
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="size">QR Code Size</Label>
                        <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                          {size}px
                        </span>
                      </div>
                      <Slider
                        id="size"
                        max={400}
                        min={100}
                        step={1}
                        value={[size]}
                        onValueChange={(value) => setSize(value[0])}
                        className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                      />
                    </div>
                  </div>
                )}

                {codeType === 'qr' && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-logo"
                        checked={includeImage}
                        onCheckedChange={(checked) => setIncludeImage(checked as boolean)}
                      />
                      <Label htmlFor="include-logo">Include Logo</Label>
                    </div>

                    {includeImage && (
                      <div className="space-y-4">
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" /> Upload Image
                        </Button>
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        
                        {!localImage && (
                          <Input
                            type="text"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="Or enter image URL"
                          />
                        )}
                        
                        {localImage && (
                          <div className="flex items-center gap-2">
                            <img src={localImage} alt="Uploaded logo" className="w-10 h-10 object-cover rounded" />
                            <Button
                              variant="destructive"
                              onClick={() => setLocalImage(null)}
                              size="sm"
                            >
                              Remove
                            </Button>
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="logo-size">Logo Size</Label>
                            <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                              {imageSize}%
                            </span>
                          </div>
                          <Slider
                            id="logo-size"
                            max={30}
                            min={10}
                            step={1}
                            value={[imageSize]}
                            onValueChange={(value) => setImageSize(value[0])}
                            className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Card className="flex flex-col items-center justify-center p-6">
                <div 
                  ref={qrRef} 
                  className="flex items-center justify-center rounded-lg p-4"
                  style={{ backgroundColor: bgColor }}
                >
                  {codeType === 'qr' ? (
                    <QRCode
                      value={text}
                      size={size}
                      fgColor={qrColor}
                      bgColor={bgColor}
                      level="H"
                      imageSettings={includeImage ? {
                        src: localImage || imageUrl,
                        width: size * (imageSize / 100),
                        height: size * (imageSize / 100),
                        excavate: true,
                      } : undefined}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: cornerType === 'round' ? '10px' : '0px',
                      }}
                    />
                  ) : (
                    <svg ref={barcodeRef}></svg>
                  )}
                </div>

                <div className="flex gap-2 mt-6">
                  <Button
                    variant="default"
                    onClick={downloadCode}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" /> Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={copyToClipboard}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" /> Copy
                  </Button>
                </div>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </ThemeProvider>
  );
}

export default App;