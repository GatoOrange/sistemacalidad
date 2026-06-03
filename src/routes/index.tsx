import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Beaker,
  Droplets,
  FlaskConical,
  Gauge,
  Moon,
  Sun,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Factory,
  Activity,
  LogOut,
  Thermometer,
  Atom,
  Settings2,
  TrendingUp,
  Zap,
  CloudSun,
  MapPin,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import jsPDF from "jspdf";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard QC — Biodisolvente Dieléctrico" },
      {
        name: "description",
        content:
          "Sistema de Control de Calidad y Optimización para Biodisolvente Dieléctrico. Desempeño dieléctrico, estabilidad operativa y seguridad industrial.",
      },
    ],
  }),
  component: Dashboard,
});

type Inputs = {
  // Física
  densidad: string;
  viscosidad: string;
  humedad: string;
  color: string;   // id del color de materia prima
  aspecto: string; // 'limpio' | 'turbio'
  // Química
  acidez: string;
  rigidez: string;        // kV / 2.5 mm
  conductividad: string;  // pS/m
  inflamacion: string;    // °C
  oxidacion: string;      // h (estabilidad oxidativa)
  // Control
  tempOperativa: string;  // °C
  compatibilidad: string; // % compatibilidad dieléctrica
  pureza: string;         // %
  contaminacion: string;  // ppm
};

const LIMITS = {
  acidez: 0.06,        // mg KOH/g — ASTM D6871
  humedad: 0.05,       // % — crítico
  densidadMin: 860,    // kg/m³
  densidadMax: 900,
  viscosidadMin: 3.5,  // cSt
  viscosidadMax: 12,   // cSt
  rigidezMin: 30,      // kV / 2.5 mm (ASTM D877)
  conductividadMax: 50,// pS/m (IEC 60247)
  inflamacionMin: 130, // °C (ASTM D92)
  oxidacionMin: 48,    // h
  tempOpMin: 40,       // °C
  tempOpMax: 90,       // °C
  compatibilidadMin: 95, // %
  purezaMin: 99,       // %
  contaminacionMax: 100, // ppm
};

const initialInputs: Inputs = {
  densidad: "",
  viscosidad: "",
  humedad: "",
  color: "",
  aspecto: "",
  acidez: "",
  rigidez: "",
  conductividad: "",
  inflamacion: "",
  oxidacion: "",
  tempOperativa: "",
  compatibilidad: "",
  pureza: "",
  contaminacion: "",
};

type ColorOpt = { id: string; label: string; hex: string; warn?: boolean };
const COLOR_OPTIONS: ColorOpt[] = [
  { id: "amarillo", label: "Amarillo Claro (Refinado dieléctrico)", hex: "#F4E27A" },
  { id: "ambar", label: "Ámbar/Dorado (Estable, baja oxidación)", hex: "#C98A2B" },
  { id: "marron", label: "Marrón Oscuro (Oxidado/Contaminado)", hex: "#3E2410", warn: true },
  { id: "rojizo", label: "Rojizo (Compuestos polares/Sobrecalentado)", hex: "#8A2A1E" },
];

function Dashboard() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [dark, setDark] = useState(true);
  const [inputs, setInputs] = useState<Inputs>(initialInputs);
  const [submitted, setSubmitted] = useState(false);
  const [tab, setTab] = useState("fisica");
  const [error, setError] = useState<string | null>(null);

  // ===== Integración en tiempo real: condiciones ambientales (Open-Meteo) =====
  type Ambient = {
    temp: number;
    humidity: number;
    wind: number;
    pressure: number;
    code: number;
    time: string;
    place: string;
  };
  const [ambient, setAmbient] = useState<Ambient | null>(null);
  const [ambientLoading, setAmbientLoading] = useState(false);
  const [ambientError, setAmbientError] = useState<string | null>(null);

  const fetchAmbient = async () => {
    setAmbientLoading(true);
    setAmbientError(null);
    try {
      // Bogotá, Colombia — planta de referencia. Sin API key.
      const url =
        "https://api.open-meteo.com/v1/forecast?latitude=4.7110&longitude=-74.0721" +
        "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,weather_code" +
        "&timezone=America%2FBogota";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const c = json.current ?? {};
      setAmbient({
        temp: Number(c.temperature_2m),
        humidity: Number(c.relative_humidity_2m),
        wind: Number(c.wind_speed_10m),
        pressure: Number(c.surface_pressure),
        code: Number(c.weather_code),
        time: String(c.time ?? ""),
        place: "Bogotá, CO",
      });
    } catch (e) {
      setAmbientError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setAmbientLoading(false);
    }
  };

  useEffect(() => {
    fetchAmbient();
    const id = setInterval(fetchAmbient, 5 * 60 * 1000); // refresco cada 5 min
    return () => clearInterval(id);
  }, []);

  // Recomendación operativa basada en clima en vivo
  const ambientRecommendation = useMemo(() => {
    if (!ambient) return null;
    // T ambiente alta ⇒ subir T operativa para mantener viscosidad estable
    // Humedad ambiente alta ⇒ activar secado al vacío preventivo
    const tSugerida = Math.round(
      Math.max(LIMITS.tempOpMin, Math.min(LIMITS.tempOpMax, ambient.temp + 35)),
    );
    const riesgoHumedad = ambient.humidity >= 75;
    return { tSugerida, riesgoHumedad };
  }, [ambient]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("isLoggedIn") !== "true") {
      navigate({ to: "/login" });
    } else {
      setAuthChecked(true);
    }
  }, [navigate]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", dark);
    }
  }, [dark]);

  const parsed = useMemo(
    () => ({
      densidad: parseFloat(inputs.densidad),
      viscosidad: parseFloat(inputs.viscosidad),
      humedad: parseFloat(inputs.humedad),
      acidez: parseFloat(inputs.acidez),
      rigidez: parseFloat(inputs.rigidez),
      conductividad: parseFloat(inputs.conductividad),
      inflamacion: parseFloat(inputs.inflamacion),
      oxidacion: parseFloat(inputs.oxidacion),
      tempOperativa: parseFloat(inputs.tempOperativa),
      compatibilidad: parseFloat(inputs.compatibilidad),
      pureza: parseFloat(inputs.pureza),
      contaminacion: parseFloat(inputs.contaminacion),
    }),
    [inputs],
  );

  const numericsValid = Object.values(parsed).every((v) => !isNaN(v));
  const visualValid = inputs.color !== "" && inputs.aspecto !== "";
  const allValid = numericsValid && visualValid;
  const colorObj = COLOR_OPTIONS.find((c) => c.id === inputs.color);

  if (!authChecked) return null;

  // Lógica de viabilidad
  const criticoAcidez = numericsValid && parsed.acidez > LIMITS.acidez;
  const criticoHumedad = numericsValid && parsed.humedad > LIMITS.humedad;
  const alertaVisual =
    visualValid && (inputs.color === "marron" || inputs.aspecto === "turbio");
  const criticoRigidez =
    allValid && parsed.rigidez < LIMITS.rigidezMin;
  const tempFueraRango =
    allValid && (parsed.tempOperativa < LIMITS.tempOpMin || parsed.tempOperativa > LIMITS.tempOpMax);
  const contaminacionAlta =
    allValid && parsed.contaminacion > LIMITS.contaminacionMax;
  const criticoConductividad =
    allValid && parsed.conductividad > LIMITS.conductividadMax;
  const oxidacionBaja =
    allValid && parsed.oxidacion < LIMITS.oxidacionMin;

  // NO VIABLE si: humedad alta, conductividad elevada, baja rigidez o contaminación excesiva
  const noViable =
    criticoHumedad || criticoConductividad || criticoRigidez || contaminacionAlta;
  const viable = allValid && !criticoAcidez && !noViable;

  // Indicador global: Óptimo / Precaución / Crítico
  const precauciones =
    (tempFueraRango ? 1 : 0) +
    (oxidacionBaja ? 1 : 0) +
    (alertaVisual ? 1 : 0);
  const estadoGlobal: "optimo" | "precaucion" | "critico" = !allValid
    ? "precaucion"
    : !viable
      ? "critico"
      : precauciones > 0
        ? "precaucion"
        : "optimo";

  // ===== Indicadores dieléctricos (tiempo real) =====
  const dielectric = useMemo(() => {
    if (!allValid) return null;
    const c = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
    const idxRigidez = c((parsed.rigidez / LIMITS.rigidezMin) * 80);
    const idxConduct = c(100 - (parsed.conductividad / LIMITS.conductividadMax) * 80);
    const eficienciaDielectrica = c(idxRigidez * 0.6 + idxConduct * 0.4);
    const tMid = (LIMITS.tempOpMin + LIMITS.tempOpMax) / 2;
    const tSpan = (LIMITS.tempOpMax - LIMITS.tempOpMin) / 2;
    const idxTemp = c(100 - (Math.abs(parsed.tempOperativa - tMid) / tSpan) * 100);
    const idxOxid = c((parsed.oxidacion / LIMITS.oxidacionMin) * 90);
    const estabilidadTermica = c(idxTemp * 0.55 + idxOxid * 0.45);
    const idxHumedad = c(100 - (parsed.humedad / LIMITS.humedad) * 100);
    const viscOk =
      parsed.viscosidad >= LIMITS.viscosidadMin && parsed.viscosidad <= LIMITS.viscosidadMax
        ? 100
        : 60;
    const capacidadAislante = c(idxRigidez * 0.5 + idxHumedad * 0.35 + viscOk * 0.15);
    // Riesgo operativo (mayor = peor)
    const riesgoOperativo = c(
      (parsed.humedad / LIMITS.humedad) * 30 +
        (parsed.conductividad / LIMITS.conductividadMax) * 30 +
        Math.max(0, (LIMITS.rigidezMin - parsed.rigidez) / LIMITS.rigidezMin) * 25 +
        (parsed.contaminacion / LIMITS.contaminacionMax) * 15,
    );
    // Estabilidad del fluido (oxidación + pureza + ausencia de turbiedad)
    const idxPureza = c((parsed.pureza / LIMITS.purezaMin) * 90);
    const estabilidadFluido = c(
      idxOxid * 0.45 +
        idxPureza * 0.35 +
        (inputs.aspecto === "limpio" ? 100 : 50) * 0.1 +
        (inputs.color === "marron" ? 40 : 100) * 0.1,
    );
    const desempeno = c(
      eficienciaDielectrica * 0.3 +
        estabilidadTermica * 0.25 +
        capacidadAislante * 0.25 +
        estabilidadFluido * 0.1 +
        (100 - riesgoOperativo) * 0.1,
    );
    return {
      eficienciaDielectrica,
      estabilidadTermica,
      capacidadAislante,
      riesgoOperativo,
      estabilidadFluido,
      desempeno,
    };
  }, [allValid, parsed, inputs.aspecto, inputs.color]);

  const handleChange =
    (key: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputs((p) => ({ ...p, [key]: e.target.value }));
    };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) {
      setError("Completa todos los campos (incluye color y aspecto visual).");
      // Saltar a la primera pestaña que tenga campo vacío
      const fisicaIncompleta =
        ["densidad", "viscosidad", "humedad"].some(
          (k) => isNaN(parseFloat(inputs[k as keyof Inputs])),
        ) || !inputs.color || !inputs.aspecto;
      const quimicaIncompleta = ["acidez", "rigidez", "conductividad", "inflamacion", "oxidacion"].some(
        (k) => isNaN(parseFloat(inputs[k as keyof Inputs])),
      );
      if (fisicaIncompleta) setTab("fisica");
      else if (quimicaIncompleta) setTab("quimica");
      else setTab("control");
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  const handleDownload = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleString("es-CO");
    let y = 20;
    doc.setFontSize(16);
    doc.text("Reporte de Calidad — Biodisolvente Dieléctrico", 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Fecha: ${date}`, 14, y);
    y += 12;

    doc.setFontSize(12);
    doc.text("1. Caracterización Física", 14, y); y += 7;
    doc.setFontSize(10);
    doc.text(`• Densidad: ${parsed.densidad} kg/m³ (rango ${LIMITS.densidadMin}-${LIMITS.densidadMax})`, 18, y); y += 6;
    doc.text(`• Viscosidad cinemática: ${parsed.viscosidad} cSt (rango ${LIMITS.viscosidadMin}-${LIMITS.viscosidadMax})`, 18, y); y += 6;
    doc.text(`• Humedad: ${parsed.humedad} % (límite ≤ ${LIMITS.humedad})`, 18, y); y += 10;
    doc.text(`• Color del biodisolvente: ${colorObj?.label ?? "—"}`, 18, y); y += 6;
    doc.text(`• Aspecto visual: ${inputs.aspecto === "limpio" ? "Limpio/Transparente" : "Turbio/Sedimentos"}`, 18, y); y += 10;

    doc.setFontSize(12);
    doc.text("2. Caracterización Química", 14, y); y += 7;
    doc.setFontSize(10);
    doc.text(`• Índice de Acidez: ${parsed.acidez} mg KOH/g (límite ≤ ${LIMITS.acidez})`, 18, y); y += 6;
    doc.text(`• Rigidez Dieléctrica: ${parsed.rigidez} kV/2.5mm (mínimo ≥ ${LIMITS.rigidezMin})`, 18, y); y += 6;
    doc.text(`• Conductividad Eléctrica: ${parsed.conductividad} pS/m (límite ≤ ${LIMITS.conductividadMax})`, 18, y); y += 6;
    doc.text(`• Punto de Inflamación: ${parsed.inflamacion} °C (mínimo ≥ ${LIMITS.inflamacionMin})`, 18, y); y += 6;
    doc.text(`• Estabilidad Oxidativa: ${parsed.oxidacion} h (mínimo ≥ ${LIMITS.oxidacionMin})`, 18, y); y += 10;

    doc.setFontSize(12);
    doc.text("3. Variables de Control Operativo", 14, y); y += 7;
    doc.setFontSize(10);
    doc.text(`• Temperatura operativa: ${parsed.tempOperativa} °C (rango ${LIMITS.tempOpMin}-${LIMITS.tempOpMax})`, 18, y); y += 6;
    doc.text(`• Compatibilidad dieléctrica: ${parsed.compatibilidad} % (mínimo ≥ ${LIMITS.compatibilidadMin})`, 18, y); y += 6;
    doc.text(`• Pureza del biodisolvente: ${parsed.pureza} % (mínimo ≥ ${LIMITS.purezaMin})`, 18, y); y += 6;
    doc.text(`• Nivel de contaminación: ${parsed.contaminacion} ppm (límite ≤ ${LIMITS.contaminacionMax})`, 18, y); y += 12;

    doc.setFontSize(12);
    doc.text(`Resultado: ${viable ? "APTO" : "NO APTO"}`, 14, y); y += 8;
    doc.setFontSize(10);
    if (!viable) {
      doc.text("Recomendaciones (ASTM D6871 / IEC 60296):", 14, y); y += 6;
      if (criticoAcidez) { doc.text("- Neutralización alcalina y refinado con tierras activadas.", 18, y); y += 6; }
      if (criticoHumedad) { doc.text("- Deshidratacion al vacio (<1 kPa) hasta humedad < 0.05%.", 18, y); y += 6; }
    } else {
      doc.text("Cumple parametros de calidad para uso como biodisolvente dielectrico.", 14, y); y += 6;
    }
    if (tempFueraRango) {
      doc.text(`! Estabilidad termica comprometida: T fuera de ${LIMITS.tempOpMin}-${LIMITS.tempOpMax} C.`, 14, y); y += 6;
    }
    if (criticoRigidez) {
      doc.text(`! Rigidez dielectrica ${parsed.rigidez} kV por debajo del minimo (${LIMITS.rigidezMin}).`, 14, y); y += 6;
    }
    if (contaminacionAlta) {
      doc.text(`! Contaminacion ${parsed.contaminacion} ppm excede limite (${LIMITS.contaminacionMax}).`, 14, y); y += 6;
    }
    if (alertaVisual) {
      doc.text("! Pre-tratamiento recomendado: filtracion/refinacion por aspecto o color.", 14, y); y += 6;
    }
    doc.save(`reporte-biodisolvente-${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Factory className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                QC Biodisolvente Dieléctrico
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Control de Calidad y Optimización · Aislantes Líquidos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark((d) => !d)}
              className="p-2 rounded-md border border-border hover:bg-accent transition-colors"
              aria-label="Cambiar tema"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("isLoggedIn");
                localStorage.removeItem("authUser");
                navigate({ to: "/login" });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border hover:bg-accent transition-colors text-xs font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Activity className="h-4 w-4" />} label="Estado planta" value="Operativa" tone="ok" />
          <StatCard
            icon={<Thermometer className="h-4 w-4" />}
            label="T. ambiente (vivo)"
            value={ambient ? `${ambient.temp.toFixed(1)} °C` : ambientLoading ? "…" : "—"}
            tone={ambient ? "ok" : "muted"}
          />
          <StatCard icon={<Beaker className="h-4 w-4" />} label="Norma" value="ASTM D6871 / IEC 60296" tone="muted" />
          <StatCard
            icon={submitted && viable ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            label="Último análisis"
            value={!submitted ? "Pendiente" : viable ? "Apto" : "No apto"}
            tone={!submitted ? "muted" : viable ? "ok" : "danger"}
          />
        </div>

        {/* Telemetría ambiental en tiempo real (Open-Meteo) */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CloudSun className="h-4 w-4" /> Condiciones ambientales en vivo
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-normal normal-case">
                <MapPin className="h-3 w-3" /> {ambient?.place ?? "Bogotá, CO"}
              </span>
              {ambient && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-normal normal-case">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE · Open-Meteo
                </span>
              )}
            </h2>
            <button
              onClick={fetchAmbient}
              disabled={ambientLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border hover:bg-accent transition-colors text-xs font-medium disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${ambientLoading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>

          {ambientError && (
            <p className="text-xs text-destructive mb-3">No se pudo obtener telemetría: {ambientError}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricBox
              label="Temperatura"
              value={ambient ? `${ambient.temp.toFixed(1)} °C` : "—"}
              sub="Aire externo"
            />
            <MetricBox
              label="Humedad relativa"
              value={ambient ? `${ambient.humidity.toFixed(0)} %` : "—"}
              sub={ambient && ambient.humidity >= 75 ? "Alta · riesgo de absorción" : "Dentro de tolerancia"}
            />
            <MetricBox
              label="Viento"
              value={ambient ? `${ambient.wind.toFixed(1)} km/h` : "—"}
              sub="Ventilación de planta"
            />
            <MetricBox
              label="Presión"
              value={ambient ? `${ambient.pressure.toFixed(0)} hPa` : "—"}
              sub="Superficie"
            />
          </div>

          {ambientRecommendation && (
            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-foreground">
                <p className="font-semibold flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  Recomendación operativa en tiempo real
                </p>
                <p className="text-muted-foreground mt-1">
                  Con T. ambiente de <span className="font-mono text-foreground">{ambient!.temp.toFixed(1)} °C</span>,
                  la temperatura operativa sugerida es{" "}
                  <span className="font-mono text-primary">{ambientRecommendation.tSugerida} °C</span>.
                  {ambientRecommendation.riesgoHumedad &&
                    " Humedad ambiental alta: activar deshidratación al vacío preventiva."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInputs((p) => ({
                    ...p,
                    tempOperativa: String(ambientRecommendation.tSugerida),
                  }));
                  setTab("control");
                }}
                className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
              >
                Aplicar a Control
              </button>
            </div>
          )}
        </section>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Form con tabs */}
          <section className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <FlaskConical className="h-4 w-4" /> Parámetros de Entrada
            </h2>
            <form onSubmit={handleAnalyze} className="space-y-4">
              <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="fisica" className="text-xs gap-1">
                    <Thermometer className="h-3.5 w-3.5" /> Física
                  </TabsTrigger>
                  <TabsTrigger value="quimica" className="text-xs gap-1">
                    <Atom className="h-3.5 w-3.5" /> Química
                  </TabsTrigger>
                  <TabsTrigger value="control" className="text-xs gap-1">
                    <Settings2 className="h-3.5 w-3.5" /> Control
                  </TabsTrigger>
                  <TabsTrigger value="optimizacion" className="text-xs gap-1">
                    <TrendingUp className="h-3.5 w-3.5" /> Optim.
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="fisica" className="space-y-4 mt-4">
                  <FieldInput icon={<Gauge className="h-4 w-4" />} label="Densidad" unit="kg/m³"
                    value={inputs.densidad} onChange={handleChange("densidad")}
                    hint={`Rango ${LIMITS.densidadMin}–${LIMITS.densidadMax}`} />
                  <FieldInput icon={<Droplets className="h-4 w-4" />} label="Viscosidad cinemática" unit="cSt"
                    value={inputs.viscosidad} onChange={handleChange("viscosidad")}
                    hint={`Rango ${LIMITS.viscosidadMin}–${LIMITS.viscosidadMax}`} />
                  <FieldInput icon={<Droplets className="h-4 w-4" />} label="Contenido de Humedad" unit="%"
                    value={inputs.humedad} onChange={handleChange("humedad")}
                    hint={`Crítico ≤ ${LIMITS.humedad}`} />

                  {/* Color de la materia prima */}
                  <div>
                    <label className="flex items-center justify-between text-xs font-medium mb-1.5">
                      <span className="text-foreground">Color del Biodisolvente</span>
                      <span className="text-muted-foreground font-normal">Aceite base vegetal</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {COLOR_OPTIONS.map((c) => {
                        const active = inputs.color === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setInputs((p) => ({ ...p, color: c.id }))}
                            className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs text-left transition-colors ${
                              active
                                ? "border-primary bg-primary/10"
                                : "border-border bg-background hover:bg-accent"
                            }`}
                          >
                            <span
                              className="h-5 w-5 rounded-full border border-border shrink-0"
                              style={{ backgroundColor: c.hex }}
                            />
                            <span className="leading-tight">{c.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Aspecto visual */}
                  <div>
                    <label className="flex items-center justify-between text-xs font-medium mb-1.5">
                      <span className="text-foreground">Aspecto Visual</span>
                      <span className="text-muted-foreground font-normal">Inspección directa</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "limpio", label: "Limpio / Transparente" },
                        { id: "turbio", label: "Turbio / Con Sedimentos" },
                      ].map((a) => {
                        const active = inputs.aspecto === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setInputs((p) => ({ ...p, aspecto: a.id }))}
                            className={`rounded-md border px-2.5 py-2 text-xs transition-colors ${
                              active
                                ? "border-primary bg-primary/10"
                                : "border-border bg-background hover:bg-accent"
                            }`}
                          >
                            {a.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                    Nota técnica: un color marrón oscuro suele asociarse a alto contenido de
                    compuestos polares y oxidación avanzada, lo que reduce la rigidez dieléctrica
                    y la estabilidad aislante del biodisolvente.
                  </p>
                </TabsContent>

                <TabsContent value="quimica" className="space-y-4 mt-4">
                  <FieldInput icon={<Beaker className="h-4 w-4" />} label="Índice de Acidez" unit="mg KOH/g"
                    value={inputs.acidez} onChange={handleChange("acidez")}
                    hint={`Crítico ≤ ${LIMITS.acidez}`} />
                  <FieldInput icon={<Zap className="h-4 w-4" />} label="Rigidez Dieléctrica" unit="kV"
                    value={inputs.rigidez} onChange={handleChange("rigidez")}
                    hint={`Mínimo ≥ ${LIMITS.rigidezMin} (ASTM D877)`} />
                  <FieldInput icon={<Activity className="h-4 w-4" />} label="Conductividad Eléctrica" unit="pS/m"
                    value={inputs.conductividad} onChange={handleChange("conductividad")}
                    hint={`Límite ≤ ${LIMITS.conductividadMax} (IEC 60247)`} />
                  <FieldInput icon={<Thermometer className="h-4 w-4" />} label="Punto de Inflamación" unit="°C"
                    value={inputs.inflamacion} onChange={handleChange("inflamacion")}
                    hint={`Mínimo ≥ ${LIMITS.inflamacionMin} (ASTM D92)`} />
                  <FieldInput icon={<FlaskConical className="h-4 w-4" />} label="Estabilidad Oxidativa" unit="h"
                    value={inputs.oxidacion} onChange={handleChange("oxidacion")}
                    hint={`Mínimo ≥ ${LIMITS.oxidacionMin} h`} />
                </TabsContent>

                <TabsContent value="control" className="space-y-4 mt-4">
                  <FieldInput icon={<Thermometer className="h-4 w-4" />} label="Temperatura Operativa" unit="°C"
                    value={inputs.tempOperativa} onChange={handleChange("tempOperativa")}
                    hint={`Rango ${LIMITS.tempOpMin}–${LIMITS.tempOpMax}`} />
                  <FieldInput icon={<Zap className="h-4 w-4" />} label="Compatibilidad Dieléctrica" unit="%"
                    value={inputs.compatibilidad} onChange={handleChange("compatibilidad")}
                    hint={`Mínimo ≥ ${LIMITS.compatibilidadMin}`} />
                  <FieldInput icon={<Droplets className="h-4 w-4" />} label="Pureza del Biodisolvente" unit="%"
                    value={inputs.pureza} onChange={handleChange("pureza")}
                    hint={`Mínimo ≥ ${LIMITS.purezaMin}`} />
                  <FieldInput icon={<AlertTriangle className="h-4 w-4" />} label="Nivel de Contaminación" unit="ppm"
                    value={inputs.contaminacion} onChange={handleChange("contaminacion")}
                    hint={`Límite ≤ ${LIMITS.contaminacionMax}`} />
                </TabsContent>

                <TabsContent value="optimizacion" className="space-y-3 mt-4">
                  <DielectricOptimization
                    parsed={parsed}
                    numericsValid={numericsValid}
                    allValid={allValid}
                    aspectoTurbio={inputs.aspecto === "turbio"}
                    colorOscuro={inputs.color === "marron"}
                  />
                </TabsContent>
              </Tabs>

              {error && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Generar Reporte
              </button>
            </form>
          </section>

          {/* Report */}
          <section className="lg:col-span-3 space-y-6">
            {!submitted ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Completa los parámetros físicos, químicos y de control y presiona <strong>Generar Reporte</strong>.
                </p>
              </div>
            ) : (
              <>
                {/* Verdict */}
                <div
                  className={`rounded-xl border p-5 ${
                    viable
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-destructive/50 bg-destructive/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {viable ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">
                          {viable ? "Lote VIABLE como Biodisolvente Dieléctrico" : "Lote NO VIABLE"}
                        </h3>
                        <StatusBadge level={estadoGlobal} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {viable
                          ? precauciones > 0
                            ? "Cumple los límites críticos pero presenta condiciones a vigilar."
                            : "Cumple todos los límites críticos. Apto para uso como aislante líquido."
                          : "Uno o más parámetros críticos están fuera de tolerancia (humedad, conductividad, rigidez o contaminación)."}
                      </p>
                    </div>
                  </div>

                  {!viable && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
                      <p className="font-medium">Cumplimiento Normativo · ASTM D6871 / IEC 60296</p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        {criticoAcidez && (
                          <li>
                            Acidez {parsed.acidez} &gt; {LIMITS.acidez} mg KOH/g → <strong>Neutralización alcalina</strong> y refinado con tierras activadas.
                          </li>
                        )}
                        {criticoHumedad && (
                          <li>
                            Humedad {parsed.humedad}% &gt; {LIMITS.humedad}% → <strong>Deshidratación al vacío</strong> (105°C, &lt;1 kPa) para preservar rigidez dieléctrica.
                          </li>
                        )}
                        {criticoConductividad && (
                          <li>
                            Conductividad {parsed.conductividad} &gt; {LIMITS.conductividadMax} pS/m → <strong>Refinado adicional</strong> para reducir compuestos polares conductivos.
                          </li>
                        )}
                        {criticoRigidez && (
                          <li>
                            Rigidez {parsed.rigidez} &lt; {LIMITS.rigidezMin} kV → <strong>Reproceso/secado</strong>; lote no apto como aislante.
                          </li>
                        )}
                        {contaminacionAlta && (
                          <li>
                            Contaminación {parsed.contaminacion} &gt; {LIMITS.contaminacionMax} ppm → <strong>Filtración fina</strong> y control de fuentes de contaminación.
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Advertencias automáticas */}
                {criticoHumedad && (
                  <AlertCard
                    level="critico"
                    title="Riesgo de pérdida de capacidad aislante"
                    body={`Humedad ${parsed.humedad}% excede el límite (${LIMITS.humedad}%). El agua libre reduce drásticamente la rigidez dieléctrica del biodisolvente.`}
                  />
                )}
                {criticoConductividad && (
                  <AlertCard
                    level="critico"
                    title="Riesgo operativo eléctrico"
                    body={`Conductividad ${parsed.conductividad} pS/m supera el máximo (${LIMITS.conductividadMax} pS/m). Posibles fugas y calentamiento en servicio.`}
                  />
                )}
                {oxidacionBaja && (
                  <AlertCard
                    level="precaucion"
                    title="Posible degradación del biodisolvente"
                    body={`Estabilidad oxidativa ${parsed.oxidacion} h por debajo de ${LIMITS.oxidacionMin} h. Vida útil reducida y formación de sedimentos a mediano plazo.`}
                  />
                )}
                {alertaVisual && (
                  <AlertCard
                    level="precaucion"
                    title="Filtración o refinación recomendada"
                    body={`${inputs.color === "marron" ? "Color oscuro detectado. " : ""}${inputs.aspecto === "turbio" ? "Aspecto turbio o con sedimentos. " : ""}Realizar filtración fina y/o refinación con tierras activadas antes de uso.`}
                  />
                )}

                {tempFueraRango && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold">Estabilidad Térmica Comprometida</p>
                      <p className="text-muted-foreground mt-1">
                        Temperatura {parsed.tempOperativa}°C fuera del rango operativo seguro ({LIMITS.tempOpMin}–{LIMITS.tempOpMax}°C).
                        Ajustar para preservar el desempeño aislante y la seguridad industrial.
                      </p>
                    </div>
                  </div>
                )}

                {alertaVisual && (
                  <AlertCard
                    level="precaucion"
                    title="Pre-tratamiento sugerido por inspección visual"
                    body="El color oscuro está asociado a compuestos polares y oxidación que reducen la rigidez dieléctrica."
                  />
                )}

                {/* Reporte agrupado */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Reporte Final por Categoría
                  </h3>

                  <ReportGroup title="Caracterización Física" icon={<Thermometer className="h-4 w-4" />}>
                    <ReportRow label="Densidad" value={`${parsed.densidad} kg/m³`}
                      ok={parsed.densidad >= LIMITS.densidadMin && parsed.densidad <= LIMITS.densidadMax} />
                    <ReportRow label="Viscosidad cinemática" value={`${parsed.viscosidad} cSt`}
                      ok={parsed.viscosidad >= LIMITS.viscosidadMin && parsed.viscosidad <= LIMITS.viscosidadMax} />
                    <ReportRow label="Humedad" value={`${parsed.humedad} %`} ok={!criticoHumedad} critical />
                    <div className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Color materia prima</span>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-4 w-4 rounded-full border border-border shrink-0"
                          style={{ backgroundColor: colorObj?.hex ?? "transparent" }}
                          aria-label={colorObj?.label}
                        />
                        <span className="font-mono text-xs">{colorObj?.label ?? "—"}</span>
                        {colorObj?.warn ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                      </span>
                    </div>
                    <ReportRow
                      label="Aspecto visual"
                      value={inputs.aspecto === "limpio" ? "Limpio / Transparente" : "Turbio / Sedimentos"}
                      ok={inputs.aspecto === "limpio"}
                    />
                  </ReportGroup>

                  <ReportGroup title="Caracterización Química" icon={<Atom className="h-4 w-4" />}>
                    <ReportRow label="Índice de Acidez" value={`${parsed.acidez} mg KOH/g`} ok={!criticoAcidez} critical />
                    <ReportRow label="Rigidez Dieléctrica" value={`${parsed.rigidez} kV`}
                      ok={parsed.rigidez >= LIMITS.rigidezMin} critical />
                    <ReportRow label="Conductividad Eléctrica" value={`${parsed.conductividad} pS/m`}
                      ok={parsed.conductividad <= LIMITS.conductividadMax} />
                    <ReportRow label="Punto de Inflamación" value={`${parsed.inflamacion} °C`}
                      ok={parsed.inflamacion >= LIMITS.inflamacionMin} />
                    <ReportRow label="Estabilidad Oxidativa" value={`${parsed.oxidacion} h`}
                      ok={parsed.oxidacion >= LIMITS.oxidacionMin} />
                  </ReportGroup>

                  <ReportGroup title="Variables de Control Operativo" icon={<Settings2 className="h-4 w-4" />}>
                    <ReportRow label="Temperatura Operativa" value={`${parsed.tempOperativa} °C`} ok={!tempFueraRango} />
                    <ReportRow label="Compatibilidad Dieléctrica" value={`${parsed.compatibilidad} %`}
                      ok={parsed.compatibilidad >= LIMITS.compatibilidadMin} />
                    <ReportRow label="Pureza del Biodisolvente" value={`${parsed.pureza} %`}
                      ok={parsed.pureza >= LIMITS.purezaMin} />
                    <ReportRow label="Nivel de Contaminación" value={`${parsed.contaminacion} ppm`}
                      ok={!contaminacionAlta} critical />
                  </ReportGroup>
                </div>

                {/* Chart */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Comparativo: Permitido vs. Real
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                        <Tooltip contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Permitido" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Real" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Indicadores Dieléctricos */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Indicadores Dieléctricos de Referencia
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <MetricBox label="Rigidez dieléctrica mínima" value={`${LIMITS.rigidezMin} kV`}
                      sub="ASTM D877 · 2.5 mm" />
                    <MetricBox label="Conductividad máxima" value={`${LIMITS.conductividadMax} pS/m`}
                      sub="IEC 60247 · aislante" />
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full rounded-md bg-primary text-primary-foreground py-3 text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar Reporte (PDF)
                </button>
              </>
            )}
          </section>
        </div>

        <footer className="text-center text-xs text-muted-foreground pt-6 pb-2 border-t border-border">
          QC Biodisolvente Dieléctrico · ASTM D6871 · IEC 60296 · ASTM D877
        </footer>
      </main>
    </div>
  );
}

function StatCard({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: string; tone: "ok" | "danger" | "muted" }) {
  const toneCls =
    tone === "ok" ? "text-emerald-500" : tone === "danger" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className={`flex items-center gap-2 text-xs ${toneCls}`}>
        {icon}
        <span className="uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 text-base font-semibold truncate">{value}</p>
    </div>
  );
}

function FieldInput({
  icon, label, unit, value, onChange, hint,
}: {
  icon: React.ReactNode; label: string; unit: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; hint: string;
}) {
  return (
    <div>
      <label className="flex items-center justify-between text-xs font-medium mb-1.5">
        <span className="flex items-center gap-1.5 text-foreground">{icon}{label}</span>
        <span className="text-muted-foreground font-normal">{hint}</span>
      </label>
      <div className="relative">
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={onChange}
          placeholder="0.00"
          className="w-full rounded-md border border-input bg-background px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function MetricBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1 font-mono">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function ReportGroup({
  title, icon, children,
}: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground mb-2">
        {icon}{title}
      </h4>
      <div className="rounded-lg border border-border divide-y divide-border">{children}</div>
    </div>
  );
}

function ReportRow({
  label, value, ok, critical,
}: { label: string; value: string; ok: boolean; critical?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-sm">
      <span className="text-muted-foreground">
        {label}{critical && <span className="ml-1 text-[10px] uppercase text-destructive">crítico</span>}
      </span>
      <span className="flex items-center gap-2 font-mono">
        {value}
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <AlertTriangle className={`h-4 w-4 ${critical ? "text-destructive" : "text-amber-500"}`} />
        )}
      </span>
    </div>
  );
}

function OptRow({ label, target, actual }: { label: string; target: string; actual: string }) {
  return (
    <div className="rounded border border-border bg-card px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-baseline justify-between gap-2 mt-0.5">
        <span className="font-mono text-[11px] text-primary">{target}</span>
        <span className="font-mono text-[11px] text-foreground">{actual}</span>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "danger" }) {
  const v = Math.max(0, Math.min(100, value));
  const color =
    tone === "ok" ? "bg-emerald-500" : tone === "warn" ? "bg-amber-500" : "bg-destructive";
  return (
    <div>
      <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
        <span className="uppercase tracking-wider">{label}</span>
        <span className="font-mono">{v.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ level }: { level: "optimo" | "precaucion" | "critico" }) {
  const map = {
    optimo: { label: "Óptimo", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500" },
    precaucion: { label: "Precaución", cls: "border-amber-500/40 bg-amber-500/10 text-amber-500" },
    critico: { label: "Crítico", cls: "border-destructive/50 bg-destructive/10 text-destructive" },
  } as const;
  const m = map[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${m.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
}

function AlertCard({
  level, title, body,
}: { level: "optimo" | "precaucion" | "critico"; title: string; body: string }) {
  const cls =
    level === "critico"
      ? "border-destructive/50 bg-destructive/5 text-destructive"
      : level === "precaucion"
        ? "border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400"
        : "border-emerald-500/40 bg-emerald-500/5 text-emerald-500";
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${cls}`}>
      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="text-sm flex-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-semibold text-foreground">{title}</p>
          <StatusBadge level={level} />
        </div>
        <p className="text-muted-foreground mt-1">{body}</p>
      </div>
    </div>
  );
}

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function DielectricOptimization({
  parsed,
  numericsValid,
  allValid,
  aspectoTurbio,
  colorOscuro,
}: {
  parsed: Record<string, number>;
  numericsValid: boolean;
  allValid: boolean;
  aspectoTurbio: boolean;
  colorOscuro: boolean;
}) {
  if (!numericsValid) {
    return (
      <div className="rounded-md border border-dashed border-border bg-background p-6 text-center text-xs text-muted-foreground">
        Ingresa los parámetros físicos, químicos y de control para calcular en tiempo real
        la optimización dieléctrica del biodisolvente.
      </div>
    );
  }

  const { humedad, viscosidad, rigidez, conductividad, oxidacion, tempOperativa } = parsed;

  // ===== Indicadores 0–100 =====
  // Eficiencia dieléctrica: depende de rigidez (≥30 kV) y conductividad (≤50 pS/m)
  const idxRigidez = clamp((rigidez / LIMITS.rigidezMin) * 80);
  const idxConduct = clamp(100 - (conductividad / LIMITS.conductividadMax) * 80);
  const eficienciaDielectrica = clamp(idxRigidez * 0.6 + idxConduct * 0.4);

  // Estabilidad térmica: cercanía al centro del rango y oxidación
  const tMid = (LIMITS.tempOpMin + LIMITS.tempOpMax) / 2;
  const tSpan = (LIMITS.tempOpMax - LIMITS.tempOpMin) / 2;
  const idxTemp = clamp(100 - (Math.abs(tempOperativa - tMid) / tSpan) * 100);
  const idxOxid = clamp((oxidacion / LIMITS.oxidacionMin) * 90);
  const estabilidadTermica = clamp(idxTemp * 0.55 + idxOxid * 0.45);

  // Capacidad aislante: rigidez, humedad inversa, viscosidad en rango
  const idxHumedad = clamp(100 - (humedad / LIMITS.humedad) * 100);
  const viscOk =
    viscosidad >= LIMITS.viscosidadMin && viscosidad <= LIMITS.viscosidadMax ? 100 : 60;
  const capacidadAislante = clamp(idxRigidez * 0.5 + idxHumedad * 0.35 + viscOk * 0.15);

  // Riesgo de degradación (mayor = peor): humedad, oxidación baja, aspecto/color
  const riesgoDegradacion = clamp(
    (humedad / LIMITS.humedad) * 35 +
      Math.max(0, (LIMITS.oxidacionMin - oxidacion) / LIMITS.oxidacionMin) * 35 +
      (aspectoTurbio ? 15 : 0) +
      (colorOscuro ? 15 : 0),
  );

  // Desempeño operativo: promedio ponderado − penalización por riesgo
  const desempenoOperativo = clamp(
    eficienciaDielectrica * 0.35 +
      estabilidadTermica * 0.25 +
      capacidadAislante * 0.3 +
      (100 - riesgoDegradacion) * 0.1,
  );

  const indicadores = [
    { key: "Eficiencia dieléctrica", value: eficienciaDielectrica, unit: "%", invert: false },
    { key: "Estabilidad térmica", value: estabilidadTermica, unit: "%", invert: false },
    { key: "Capacidad aislante", value: capacidadAislante, unit: "%", invert: false },
    { key: "Riesgo de degradación", value: riesgoDegradacion, unit: "%", invert: true },
    { key: "Desempeño operativo", value: desempenoOperativo, unit: "%", invert: false },
  ];

  const levelOf = (value: number, invert: boolean): "optimo" | "precaucion" | "critico" => {
    const v = invert ? 100 - value : value;
    if (v >= 80) return "optimo";
    if (v >= 55) return "precaucion";
    return "critico";
  };

  const estadoTecnico = levelOf(desempenoOperativo, false);

  const barData = indicadores.map((i) => ({
    name: i.key.replace(" dieléctrica", "").replace(" de degradación", ""),
    Valor: Math.round(i.value),
    Óptimo: i.invert ? 20 : 80,
  }));

  return (
    <div className="space-y-3">
      {/* Encabezado de estado técnico */}
      <div className="rounded-md border border-border bg-background p-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground">
              <Gauge className="h-3.5 w-3.5" /> Estado técnico del biodisolvente
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1">
              Cálculo automático en tiempo real a partir de humedad, viscosidad, rigidez,
              conductividad, estabilidad oxidativa y temperatura operativa.
            </p>
          </div>
          <StatusBadge level={estadoTecnico} />
        </div>
        <div className="mt-3">
          <ProgressBar
            label="Desempeño operativo esperado"
            value={desempenoOperativo}
            tone={estadoTecnico === "optimo" ? "ok" : estadoTecnico === "precaucion" ? "warn" : "danger"}
          />
        </div>
      </div>

      {/* Indicadores industriales */}
      <div className="rounded-md border border-border bg-background p-3 space-y-2">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground">
          <TrendingUp className="h-3.5 w-3.5" /> Indicadores industriales
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {indicadores.map((i) => {
            const lvl = levelOf(i.value, i.invert);
            return (
              <div key={i.key} className="rounded border border-border bg-card px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {i.key}
                  </p>
                  <StatusBadge level={lvl} />
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-mono text-lg font-semibold text-foreground">
                    {i.value.toFixed(0)}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">{i.unit}</span>
                </div>
                <ProgressBar
                  label=""
                  value={i.invert ? 100 - i.value : i.value}
                  tone={lvl === "optimo" ? "ok" : lvl === "precaucion" ? "warn" : "danger"}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráfica dinámica */}
      <div className="rounded-md border border-border bg-background p-3">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground mb-2">
          <TrendingUp className="h-3.5 w-3.5" /> Comparativa de indicadores
        </h4>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontSize: 11,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Óptimo" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Nivel de riesgo */}
      <div className="rounded-md border border-border bg-background p-3 space-y-2">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground">
          <AlertTriangle className="h-3.5 w-3.5" /> Niveles de riesgo
        </h4>
        {humedad > LIMITS.humedad && (
          <AlertCard level="critico" title="Humedad excesiva" body="Riesgo de pérdida de capacidad aislante." />
        )}
        {conductividad > LIMITS.conductividadMax && (
          <AlertCard level="critico" title="Conductividad elevada" body="Riesgo operativo eléctrico inminente." />
        )}
        {rigidez < LIMITS.rigidezMin && (
          <AlertCard level="critico" title="Rigidez dieléctrica baja" body="No alcanza el mínimo ASTM D877 (≥ 30 kV)." />
        )}
        {oxidacion < LIMITS.oxidacionMin && (
          <AlertCard level="precaucion" title="Estabilidad oxidativa baja" body="Posible degradación del biodisolvente." />
        )}
        {(tempOperativa < LIMITS.tempOpMin || tempOperativa > LIMITS.tempOpMax) && (
          <AlertCard level="precaucion" title="Temperatura fuera de rango" body={`Operar entre ${LIMITS.tempOpMin}–${LIMITS.tempOpMax} °C para preservar la estabilidad térmica.`} />
        )}
        {humedad <= LIMITS.humedad &&
          conductividad <= LIMITS.conductividadMax &&
          rigidez >= LIMITS.rigidezMin &&
          oxidacion >= LIMITS.oxidacionMin &&
          tempOperativa >= LIMITS.tempOpMin &&
          tempOperativa <= LIMITS.tempOpMax && (
            <AlertCard level="optimo" title="Sin riesgos detectados" body="Todos los parámetros se encuentran dentro de los rangos óptimos de operación." />
          )}
      </div>

      {/* Eficiencia operativa textual */}
      <div className="rounded-md border border-border bg-background p-3">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground mb-2">
          <Zap className="h-3.5 w-3.5" /> Eficiencia operativa
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Eficiencia dieléctrica estimada{" "}
          <span className="font-mono text-foreground">{eficienciaDielectrica.toFixed(0)}%</span>,
          estabilidad térmica{" "}
          <span className="font-mono text-foreground">{estabilidadTermica.toFixed(0)}%</span>,
          capacidad aislante{" "}
          <span className="font-mono text-foreground">{capacidadAislante.toFixed(0)}%</span>.
          Riesgo de degradación{" "}
          <span className="font-mono text-foreground">{riesgoDegradacion.toFixed(0)}%</span>.
          {allValid ? "" : " Completa todos los parámetros para una evaluación normativa completa."}
        </p>
      </div>
    </div>
  );
}
