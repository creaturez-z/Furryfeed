import { useRef } from 'react';
import { X, Download, FileImage } from 'lucide-react';

interface InvoiceViewerProps {
  invoice: {
    invoice_number: string;
    order_date: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    items: any[];
    customer?: { name: string; email?: string; phone: string };
  };
  settings: {
    company_name: string;
    company_address: string;
    phone: string;
    gst_number: string;
    terms_and_conditions: string;
  };
  onClose: () => void;
}

export function InvoiceViewer({ invoice, settings, onClose }: InvoiceViewerProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    if (!invoiceRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const invoiceElement = invoiceRef.current;
      const rect = invoiceElement.getBoundingClientRect();

      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const data = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              ${invoiceElement.innerHTML}
            </div>
          </foreignObject>
        </svg>
      `;

      const blob = new Blob([data], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice.invoice_number}.svg`;
      link.click();
      URL.revokeObjectURL(url);

      alert('Invoice image downloaded successfully');
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Failed to download invoice image');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between print:hidden">
          <h2 className="text-2xl font-bold text-gray-900">Invoice Preview</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={handleDownloadImage}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <FileImage className="w-4 h-4" />
              <span>Image</span>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div ref={invoiceRef} className="p-8 bg-white">
          <div className="border-2 border-gray-300 rounded-lg p-8">
            <div className="border-b-2 border-gray-300 pb-6 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{settings.company_name}</h1>
                  {settings.company_address && (
                    <p className="text-sm text-gray-600 whitespace-pre-line">{settings.company_address}</p>
                  )}
                  {settings.phone && (
                    <p className="text-sm text-gray-600 mt-1">Phone: {settings.phone}</p>
                  )}
                  {settings.gst_number && (
                    <p className="text-sm text-gray-600">GST: {settings.gst_number}</p>
                  )}
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h2>
                  <p className="text-sm text-gray-600">#{invoice.invoice_number}</p>
                  <p className="text-sm text-gray-600">
                    Date: {new Date(invoice.order_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Bill To:</h3>
              <div className="text-gray-900">
                <p className="font-semibold">{invoice.customer?.name}</p>
                {invoice.customer?.email && <p className="text-sm text-gray-600">{invoice.customer.email}</p>}
                {invoice.customer?.phone && <p className="text-sm text-gray-600">{invoice.customer.phone}</p>}
              </div>
            </div>

            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Item</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Qty</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Price</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-3 px-2 text-sm text-gray-900">
                        {item.name}
                        {item.pet_name && <span className="text-gray-500"> (for {item.pet_name})</span>}
                      </td>
                      <td className="text-right py-3 px-2 text-sm text-gray-700">{item.quantity}g</td>
                      <td className="text-right py-3 px-2 text-sm text-gray-700">₹{item.price.toFixed(2)}</td>
                      <td className="text-right py-3 px-2 text-sm text-gray-900 font-medium">
                        ₹{item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="text-gray-900 font-medium">₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-700">Tax:</span>
                  <span className="text-gray-900 font-medium">₹{invoice.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 text-base border-t-2 border-gray-300">
                  <span className="text-gray-900 font-bold">Total:</span>
                  <span className="text-gray-900 font-bold">₹{invoice.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {settings.terms_and_conditions && (
              <div className="border-t-2 border-gray-300 pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Terms & Conditions</h3>
                <p className="text-xs text-gray-600 whitespace-pre-line">{settings.terms_and_conditions}</p>
              </div>
            )}

            <div className="mt-8 text-center text-xs text-gray-500">
              Thank you for your business!
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .print\\:hidden {
              display: none !important;
            }
            ${invoiceRef.current ? `
              #${invoiceRef.current.id}, #${invoiceRef.current.id} * {
                visibility: visible;
              }
              #${invoiceRef.current.id} {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
            ` : ''}
          }
        `}
      </style>
    </div>
  );
}
