import { redirect } from "next/navigation";

export default function ThinkingMachine() {
  // Keep old URL working, but show the UI on the home page.
  redirect("/");
}

