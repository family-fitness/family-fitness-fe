import { ChatDock } from "@/components/domain/chat-dock";

/** 홈 밖의 화면들. 코치 창은 여기서 한 번만 단다. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="has-dock">{children}</div>
      <ChatDock />
    </>
  );
}
