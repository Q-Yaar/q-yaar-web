import { JSX } from "react";

export default function BaseLayout({
  children,
}: {
  children: JSX.Element;
}) {
  return <div>{children}</div>;
}
