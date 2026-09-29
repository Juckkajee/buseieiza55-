import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Ask = (title: string, description: string) => Promise<boolean>;
const ConfirmationContext = createContext<Ask>(async () => false);
export const useConfirm = () => useContext(ConfirmationContext);

export default function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<{ title: string; description: string; resolve: (value: boolean) => void } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const finish = (value: boolean) => {
    request?.resolve(value);
    dialog.current?.close();
    setRequest(null);
    previousFocus.current?.focus();
  };
  useEffect(() => { if (request) dialog.current?.showModal(); }, [request]);
  const ask: Ask = (title, description) => new Promise(resolve => {
    previousFocus.current = document.activeElement as HTMLElement;
    setRequest({ title, description, resolve });
  });
  return <ConfirmationContext.Provider value={ask}>
    {children}
    <dialog ref={dialog} aria-labelledby="confirmation-title" aria-describedby="confirmation-description" onCancel={event => { event.preventDefault(); finish(false); }} className="fixed inset-0 m-auto w-[calc(100%-32px)] max-w-md border border-[#665334] bg-[#202222] text-[#eee] p-6 shadow-2xl backdrop:bg-black/70">
      <h2 id="confirmation-title" className="text-lg font-bold text-[#f5a623]">{request?.title}</h2>
      <p id="confirmation-description" className="text-sm text-[#bbb] my-5 leading-relaxed">{request?.description}</p>
      <div className="flex justify-end gap-3">
        <button autoFocus onClick={() => finish(false)} className="border border-[#666] px-5 py-2 text-sm">ยกเลิก</button>
        <button onClick={() => finish(true)} className="bg-[#f5a623] text-[#111] font-bold px-5 py-2 text-sm">ยืนยัน</button>
      </div>
    </dialog>
  </ConfirmationContext.Provider>;
}
