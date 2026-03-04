import type { PaymentMethod } from "@/types/payment";

interface PaymentMethodSelectorProps {
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  setSubmitError: (error: string | null) => void;
  cardIcon: string;
  qrIcon: string;
  cashIcon: string;
}

export function PaymentMethodSelector({
  paymentMethod,
  setPaymentMethod,
  setSubmitError,
  cardIcon,
  qrIcon,
  cashIcon,
}: PaymentMethodSelectorProps) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 className="text-2xl font-black text-[#4A2600] mb-3">
        Payment Method
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => {
            setPaymentMethod("card");
            setSubmitError(null);
          }}
          className={`rounded-lg border p-3 flex flex-col items-center gap-1 transition-colors ${
            paymentMethod === "card"
              ? "bg-[#FCE7D8] border-[#D9B39A]"
              : "bg-white border-gray-200 hover:bg-gray-50"
          }`}
        >
          <img
            src={cardIcon}
            alt="Card"
            className="w-12 h-12 object-contain"
          />
          <span className="text-xs text-gray-700">Card</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setPaymentMethod("qr");
            setSubmitError(null);
          }}
          className={`rounded-lg border p-3 flex flex-col items-center gap-1 transition-colors ${
            paymentMethod === "qr"
              ? "bg-[#FCE7D8] border-[#D9B39A]"
              : "bg-white border-gray-200 hover:bg-gray-50"
          }`}
        >
          <img
            src={qrIcon}
            alt="Qr code"
            className="w-12 h-12 object-contain"
          />
          <span className="text-xs text-gray-700">Qr code</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setPaymentMethod("cash");
            setSubmitError(null);
          }}
          className={`rounded-lg border p-3 flex flex-col items-center gap-1 transition-colors ${
            paymentMethod === "cash"
              ? "bg-[#FCE7D8] border-[#D9B39A]"
              : "bg-white border-gray-200 hover:bg-gray-50"
          }`}
        >
          <img
            src={cashIcon}
            alt="Cash"
            className="w-12 h-12 object-contain"
          />
          <span className="text-xs text-gray-700">Cash</span>
        </button>
      </div>
    </section>
  );
}
