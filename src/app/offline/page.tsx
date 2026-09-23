import { PlainScreen } from "@/components/app-shell/screen";
import { Illustration } from "@/components/ui/illustration";

/** 인터넷이 끊겼을 때. */
export default function OfflinePage() {
  return (
    <PlainScreen className="flex min-h-dvh flex-col items-center justify-center gap-3 text-center">
      <Illustration name="scene/kiumi-rest" size={150} />
      <h1 className="page-title">인터넷이 끊겼어요</h1>
      <p className="text-ink-soft max-w-xs text-sm leading-relaxed">
        연결되면 보던 화면으로 돌아와요
      </p>
    </PlainScreen>
  );
}
