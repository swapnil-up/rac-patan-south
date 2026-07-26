import { useState } from "react";

type SubmitFn = (body: { name: string; email: string; message: string }) => Promise<Response>;

export function useContactForm(endpoint: string | undefined | null) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function submit(submitter?: SubmitFn) {
    if (!endpoint) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const send = submitter ?? fetch;
      const res = await send(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      setStatus("success");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  return { name, setName, email, setEmail, message, setMessage, status, submit };
}
