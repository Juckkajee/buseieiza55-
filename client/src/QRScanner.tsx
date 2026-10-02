import { useEffect, useRef, useState } from "react"
import { outline } from "./ui"
type Detector = { detect: (source: HTMLVideoElement) => Promise<Array<{rawValue:string}>> }
type DetectorConstructor = new (options:{formats:string[]}) => Detector

export default function QRScanner({disabled,onScan}:{disabled:boolean;onScan:(value:string)=>void}) {
  const video = useRef<HTMLVideoElement>(null)
  const [active,setActive] = useState(false)
  const [error,setError] = useState("")
  const callback = useRef(onScan)
  callback.current = onScan
  useEffect(() => {if(disabled) setActive(false)},[disabled])
  useEffect(() => {
    if(!active) return
    let stopped=false, stream:MediaStream|undefined, timer:ReturnType<typeof setTimeout>|undefined
    const stop = () => {stopped=true; clearTimeout(timer); stream?.getTracks().forEach(t=>t.stop())}
    void (async()=>{
      try {
        const Constructor = (window as unknown as {BarcodeDetector?:DetectorConstructor}).BarcodeDetector
        if(!Constructor) throw Error("เบราว์เซอร์นี้ไม่รองรับสแกนกล้อง กรุณาใช้ Chrome/Edge หรือเครื่องอ่าน QR ในช่องด้านล่าง")
        const detector = new Constructor({formats:["qr_code"]})
        stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false})
        if(stopped) {stream.getTracks().forEach(t=>t.stop());return}
        video.current!.srcObject=stream
        await video.current!.play()
        const scan=async()=>{
          if(stopped || !video.current) return
          try {
            const codes=await detector.detect(video.current)
            if(stopped) return
            if(codes[0]?.rawValue) {callback.current(codes[0].rawValue);setActive(false);stop();return}
            timer=setTimeout(()=>void scan(),250)
          } catch {setError("อ่านภาพจากกล้องไม่ได้ กรุณาลองใหม่หรือใช้เครื่องอ่าน QR");setActive(false);stop()}
        }
        void scan()
      } catch(e) {
        if(!stopped) {setError((e as Error).message);setActive(false)}
        stop()
      }
    })()
    return stop
  },[active])
  return <div className="mb-4">
    <button type="button" className={outline} disabled={disabled} onClick={()=>{setError("");setActive(v=>!v)}}>{active?"ปิดกล้อง":"สแกน QR ด้วยกล้อง"}</button>
    {active && <video ref={video} muted playsInline className="w-full max-w-md mt-3 border border-[#555]" aria-label="ภาพกล้องสำหรับสแกน QR" />}
    {error && <p role="alert" className="text-amber-300 text-sm mt-2">{error}</p>}
    <p className="text-xs text-[#999] mt-2">เมื่ออ่าน QR ได้ รหัสจะขึ้นในช่องด้านล่าง กดเช็กอินตั๋วเพื่อยืนยัน</p>
  </div>
}
