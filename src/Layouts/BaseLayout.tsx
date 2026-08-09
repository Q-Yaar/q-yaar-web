import { JSX } from "react";
import PushNotificationManager from "../components/PushNotificationManager";

export default function BaseLayout({
  children,
}: {
  children: JSX.Element;
}) {
  return (
    <div>
      <PushNotificationManager />
      {children}
    </div>
  );
}
