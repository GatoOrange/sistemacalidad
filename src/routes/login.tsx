import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Factory, Lock, User as UserIcon, AlertCircle, Moon, Sun } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar Sesión — QC Biodiesel" },
      {
        name: "description",
        content: "Acceso al Dashboard de Control de Calidad de Éster Etílico (Biodiesel).",
      },
    ],
  }),
  component: LoginPage,
});

// Credenciales (ofuscadas con codificación base64 para no aparecer en texto plano)
// Usuario: admin / Contraseña: grupo 3
const _A = "YWRtaW4="; // admin
const _B = "Z3J1cG8gMw=="; // grupo 3

function decode(v: string): string {
  if (typeof atob !== "undefined") return atob(v);
  // SSR fallback
  return Buffer.from(v, "base64").toString("utf-8");
}

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [dark, setDark] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Si ya está autenticado, redirigir al dashboard
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("isLoggedIn") === "true") {
      navigate({ to: "/" });
    } else {
      setReady(true);
    }
  }, [navigate]);

  if (!ready) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (username === decode(_A) && password === decode(_B)) {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("authUser", username);
      navigate({ to: "/" });
    } else {
      setError("Credenciales inválidas, intente de nuevo.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 relative">
      <button
        onClick={() => setDark((d) => !d)}
        className="absolute top-4 right-4 p-2 rounded-md border border-border hover:bg-accent transition-colors"
        aria-label="Cambiar tema"
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mb-3">
              <Factory className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-center">
              QC Biodiesel — Éster Etílico
            </h1>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Sistema de Control de Calidad · Acceso Restringido
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Usuario
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              Iniciar Sesión
            </button>
          </form>

          <p className="mt-6 text-[10px] text-center text-muted-foreground uppercase tracking-wider">
            Planta de Producción · Grupo 3
          </p>
        </div>
      </div>
    </div>
  );
}
