import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getMyProfile } from "../api/profile";
import { getEventById } from "../api/events";

export default function Certificate() {
  const [params] = useSearchParams();
  const eventId = params.get("eventId");
  const [me, setMe] = useState(null);
  const [ev, setEv] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, e] = await Promise.all([
          getMyProfile(),
          eventId ? getEventById(eventId) : Promise.resolve(null),
        ]);
        setMe(p); setEv(e);
      } catch {}
    })();
  }, [eventId]);

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-white text-black">
      <div className="border-4 border-black p-10 max-w-3xl w-full text-center">
        <h1 className="text-3xl font-bold tracking-wide">CERTIFICADO DE CONCLUSÃO</h1>
        <p className="mt-6">Conferimos a</p>
        <p className="mt-2 text-2xl font-semibold">{me?.displayName || "Autor(a)"}</p>
        <p className="mt-2">o título de</p>
        <p className="mt-2 text-2xl font-semibold">WINNER</p>
        <p className="mt-4">
          por atingir a meta de palavras no evento {ev?.name || "—"}.
        </p>
        <p className="mt-8 text-sm">
          {new Date().toLocaleDateString("pt-BR")}
        </p>
      </div>
    </div>
  );
}
