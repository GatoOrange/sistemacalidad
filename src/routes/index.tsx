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

  // Módulo de optimización
  const [optCantidad, setOptCantidad] = useState("");
  const [optAlcohol, setOptAlcohol] = useState<"etanol" | "metanol">("etanol");
  const [optRatio, setOptRatio] = useState("6");
  const [optCat, setOptCat] = useState("1");

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
      saponificacion: parseFloat(inputs.saponificacion),
      peroxidos: parseFloat(inputs.peroxidos),
      relacionMolar: parseFloat(inputs.relacionMolar),
      catalizador: parseFloat(inputs.catalizador),
      temperatura: parseFloat(inputs.temperatura),
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
  const viable = allValid && !criticoAcidez && !criticoHumedad;

  const tempFueraRango =
    allValid && (parsed.temperatura < LIMITS.tempMin || parsed.temperatura > LIMITS.tempMax);

  // Estequiometría sugerida
  const ratioSugerido = 6;
  const masaEtanolPorKg = ((6 * 46) / 880 * 1000).toFixed(1);

  // ===== Cálculos de optimización (tiempo real) =====
  const MW = { etanol: 46, metanol: 32, aceite: 880 };
  const optKg = parseFloat(optCantidad);
  const optR = parseFloat(optRatio);
  const optC = parseFloat(optCat);
  const optValid = !isNaN(optKg) && optKg > 0 && !isNaN(optR) && !isNaN(optC);

  const molesAceite = optValid ? (optKg * 1000) / MW.aceite : 0;
  const molesAlcohol = molesAceite * (optR || 0);
  const masaAlcoholKg = (molesAlcohol * MW[optAlcohol]) / 1000;
  const masaCatKg = optValid ? optKg * ((optC || 0) / 100) : 0;

  // Rendimiento: base 97% (metanol) / 95% (etanol), penalizaciones por calidad MP
  let rendimiento = optAlcohol === "metanol" ? 97 : 95;
  const penal: string[] = [];
  if (!isNaN(parsed.humedad) && parsed.humedad > LIMITS.humedad) { rendimiento -= 10; penal.push("Humedad alta −10%"); }
  if (!isNaN(parsed.acidez) && parsed.acidez > LIMITS.acidez) { rendimiento -= 15; penal.push("Acidez crítica −15%"); }
  if (!isNaN(parsed.temperatura) && (parsed.temperatura < LIMITS.tempMin || parsed.temperatura > LIMITS.tempMax)) {
    rendimiento -= 8; penal.push("T fuera de rango −8%");
  }
  if (inputs.color === "marron") { rendimiento -= 5; penal.push("Color oscuro −5%"); }
  if (inputs.aspecto === "turbio") { rendimiento -= 3; penal.push("Aspecto turbio −3%"); }
  if (optValid && optR < 5) { rendimiento -= 5; penal.push("Relación molar baja −5%"); }
  if (optValid && optR > 9) { rendimiento -= 2; penal.push("Exceso de alcohol −2%"); }
  rendimiento = Math.max(0, Math.min(100, rendimiento));

  const masaBiodisolvente = optValid ? optKg * (rendimiento / 100) : 0;
  const conversion = Math.max(0, Math.min(99, rendimiento - 2));

  // Riesgo de saponificación
  const sapScore =
    (!isNaN(parsed.humedad) && parsed.humedad > LIMITS.humedad ? 2 : 0) +
    (!isNaN(parsed.acidez) && parsed.acidez > LIMITS.acidez ? 2 : 0) +
    (optValid && optC > LIMITS.catalizadorMax ? 2 : 0) +
    (inputs.aspecto === "turbio" ? 1 : 0);
  const sapNivel = sapScore >= 3 ? "Alto" : sapScore >= 1 ? "Medio" : "Bajo";

  // Eficiencia de reacción (combinada)
  const eficiencia = optValid
    ? Math.round(rendimiento * 0.6 + conversion * 0.4 - (sapScore * 3))
    : 0;

  const chartData = allValid
    ? [
        { name: "Acidez", Permitido: LIMITS.acidez, Real: parsed.acidez },
        { name: "Humedad", Permitido: LIMITS.humedad, Real: parsed.humedad },
        { name: "Viscosidad", Permitido: LIMITS.viscosidadMax, Real: parsed.viscosidad },
        { name: "Peróxidos", Permitido: LIMITS.peroxidosMax, Real: parsed.peroxidos },
        { name: "Temp. (°C)", Permitido: LIMITS.tempMax, Real: parsed.temperatura },
      ]
    : [];

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
      const quimicaIncompleta = ["acidez", "saponificacion", "peroxidos"].some(
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
    doc.text(`• Índice de Saponificación: ${parsed.saponificacion} (rango ${LIMITS.saponificacionMin}-${LIMITS.saponificacionMax})`, 18, y); y += 6;
    doc.text(`• Índice de Peróxidos: ${parsed.peroxidos} meq/kg (límite ≤ ${LIMITS.peroxidosMax})`, 18, y); y += 10;

    doc.setFontSize(12);
    doc.text("3. Variables de Control Operativo", 14, y); y += 7;
    doc.setFontSize(10);
    doc.text(`• Relación molar esterificante/aceite: ${parsed.relacionMolar} (sugerido ${ratioSugerido}:1)`, 18, y); y += 6;
    doc.text(`• Concentración de catalizador: ${parsed.catalizador} % (rango ${LIMITS.catalizadorMin}-${LIMITS.catalizadorMax})`, 18, y); y += 6;
    doc.text(`• Temperatura de proceso: ${parsed.temperatura} °C (rango ${LIMITS.tempMin}-${LIMITS.tempMax})`, 18, y); y += 12;

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
      doc.text(`! Estabilidad termica comprometida: T fuera de ${LIMITS.tempMin}-${LIMITS.tempMax} C.`, 14, y); y += 6;
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
          <StatCard icon={<Gauge className="h-4 w-4" />} label="Lotes hoy" value="—" tone="muted" />
          <StatCard icon={<Beaker className="h-4 w-4" />} label="Norma" value="ASTM D6871 / IEC 60296" tone="muted" />
          <StatCard
            icon={submitted && viable ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            label="Último análisis"
            value={!submitted ? "Pendiente" : viable ? "Apto" : "No apto"}
            tone={!submitted ? "muted" : viable ? "ok" : "danger"}
          />
        </div>

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
                  <FieldInput icon={<Beaker className="h-4 w-4" />} label="Índice de Saponificación" unit="mg KOH/g"
                    value={inputs.saponificacion} onChange={handleChange("saponificacion")}
                    hint={`Rango ${LIMITS.saponificacionMin}–${LIMITS.saponificacionMax}`} />
                  <FieldInput icon={<FlaskConical className="h-4 w-4" />} label="Índice de Peróxidos" unit="meq/kg"
                    value={inputs.peroxidos} onChange={handleChange("peroxidos")}
                    hint={`Límite ≤ ${LIMITS.peroxidosMax}`} />
                </TabsContent>

                <TabsContent value="control" className="space-y-4 mt-4">
                  <FieldInput icon={<Atom className="h-4 w-4" />} label="Relación Molar Esterificante/Aceite" unit=":1"
                    value={inputs.relacionMolar} onChange={handleChange("relacionMolar")}
                    hint={`Sugerido ${ratioSugerido}:1`} />
                  <FieldInput icon={<FlaskConical className="h-4 w-4" />} label="Concentración Catalizador" unit="%"
                    value={inputs.catalizador} onChange={handleChange("catalizador")}
                    hint={`Rango ${LIMITS.catalizadorMin}–${LIMITS.catalizadorMax}`} />
                  <FieldInput icon={<Thermometer className="h-4 w-4" />} label="Temperatura de Proceso" unit="°C"
                    value={inputs.temperatura} onChange={handleChange("temperatura")}
                    hint={`Óptimo ${LIMITS.tempMin}–${LIMITS.tempMax}`} />
                </TabsContent>

                <TabsContent value="optimizacion" className="space-y-3 mt-4">
                  {/* Módulo de cálculo */}
                  <div className="rounded-md border border-border bg-background p-3 space-y-3">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground">
                      <Zap className="h-3.5 w-3.5" /> Formulación del Biodisolvente
                    </h4>

                    <FieldInput
                      icon={<Beaker className="h-4 w-4" />}
                      label="Cantidad de Aceite Base"
                      unit="kg"
                      value={optCantidad}
                      onChange={(e) => setOptCantidad(e.target.value)}
                      hint="Aceite vegetal a procesar"
                    />

                    <div>
                      <label className="text-xs font-medium mb-1.5 block">Tipo de Esterificante</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["etanol", "metanol"] as const).map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => setOptAlcohol(a)}
                            className={`rounded-md border px-2.5 py-2 text-xs capitalize transition-colors ${
                              optAlcohol === a
                                ? "border-primary bg-primary/10"
                                : "border-border bg-background hover:bg-accent"
                            }`}
                          >
                            {a} <span className="text-muted-foreground font-mono">({MW[a]} g/mol)</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <FieldInput
                        icon={<Atom className="h-4 w-4" />}
                        label="Relación molar"
                        unit=":1"
                        value={optRatio}
                        onChange={(e) => setOptRatio(e.target.value)}
                        hint="Sugerido 6:1"
                      />
                      <FieldInput
                        icon={<FlaskConical className="h-4 w-4" />}
                        label="Catalizador"
                        unit="%"
                        value={optCat}
                        onChange={(e) => setOptCat(e.target.value)}
                        hint="Sugerido 1%"
                      />
                    </div>
                  </div>

                  {/* Resultados tiempo real */}
                  {optValid ? (
                    <div className="rounded-md border border-border bg-background p-3 space-y-2">
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground">
                        <TrendingUp className="h-3.5 w-3.5" /> Resultados (tiempo real)
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <OptRow label={`${optAlcohol} requerido`} target={`${masaAlcoholKg.toFixed(2)} kg`} actual={`${molesAlcohol.toFixed(1)} mol`} />
                        <OptRow label="Catalizador req." target={`${(masaCatKg * 1000).toFixed(1)} g`} actual={`${optC}%`} />
                        <OptRow label="Biodisolvente estimado" target={`${masaBiodisolvente.toFixed(2)} kg`} actual={`${rendimiento.toFixed(0)}%`} />
                        <OptRow label="Conversión estimada" target={`${conversion.toFixed(0)}%`} actual={`η ${eficiencia}%`} />
                      </div>

                      {/* Barras */}
                      <div className="space-y-1.5 pt-1">
                        <ProgressBar label="Rendimiento" value={rendimiento} tone={rendimiento >= 90 ? "ok" : rendimiento >= 75 ? "warn" : "danger"} />
                        <ProgressBar label="Conversión" value={conversion} tone={conversion >= 85 ? "ok" : conversion >= 70 ? "warn" : "danger"} />
                        <ProgressBar label="Eficiencia" value={Math.max(0, eficiencia)} tone={eficiencia >= 85 ? "ok" : eficiencia >= 65 ? "warn" : "danger"} />
                      </div>

                      {/* Saponificación */}
                      <div className={`flex items-center justify-between rounded border px-2.5 py-1.5 text-xs ${
                        sapNivel === "Alto" ? "border-destructive/50 bg-destructive/5 text-destructive"
                        : sapNivel === "Medio" ? "border-amber-500/40 bg-amber-500/5 text-amber-500"
                        : "border-emerald-500/40 bg-emerald-500/5 text-emerald-500"
                      }`}>
                        <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Riesgo de degradación / saponificación</span>
                        <span className="font-mono font-semibold">{sapNivel}</span>
                      </div>

                      {penal.length > 0 && (
                        <div className="text-[11px] text-muted-foreground pt-1">
                          <span className="font-semibold text-foreground">Penalizaciones detectadas: </span>
                          {penal.join(" · ")}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border bg-background p-4 text-center text-[11px] text-muted-foreground">
                      Ingresa la cantidad de aceite para calcular el rendimiento.
                    </div>
                  )}

                  <div className="rounded-md border border-border bg-background p-3">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground mb-2">
                      <Zap className="h-3.5 w-3.5" /> Parámetros Óptimos
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <OptRow label="Relación molar" target={`1 : ${ratioSugerido}`} actual={inputs.relacionMolar || "—"} />
                      <OptRow label="Catalizador" target={`${LIMITS.catalizadorMin}–${LIMITS.catalizadorMax}%`} actual={inputs.catalizador ? `${inputs.catalizador}%` : "—"} />
                      <OptRow label="Temperatura" target={`${LIMITS.tempMin}–${LIMITS.tempMax}°C`} actual={inputs.temperatura ? `${inputs.temperatura}°C` : "—"} />
                      <OptRow label="Esterificante/kg" target={`${masaEtanolPorKg} g`} actual="Estequio." />
                    </div>
                  </div>

                  <div className="rounded-md border border-border bg-background p-3 space-y-2">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground">
                      <TrendingUp className="h-3.5 w-3.5" /> Recomendaciones de Proceso
                    </h4>
                    <ul className="text-[11px] text-muted-foreground space-y-1.5 leading-relaxed">
                      <li className="flex gap-1.5"><span className="text-primary">▸</span>Mantener T entre {LIMITS.tempMin}–{LIMITS.tempMax}°C para evitar evaporación del esterificante y preservar la estabilidad térmica del aislante.</li>
                      <li className="flex gap-1.5"><span className="text-primary">▸</span>Exceso de esterificante (1:6) desplaza el equilibrio hacia ésteres de alta rigidez dieléctrica.</li>
                      <li className="flex gap-1.5"><span className="text-primary">▸</span>Catalizador (NaOH/KOH) por encima de 1.5% promueve saponificación y reduce la resistividad volumétrica.</li>
                      <li className="flex gap-1.5"><span className="text-primary">▸</span>Agitación constante a 300–600 rpm durante 60–90 min para uniformidad del biodisolvente.</li>
                      <li className="flex gap-1.5"><span className="text-primary">▸</span>Decantación mínima 8 h para separar glicerina y trazas conductivas del biodisolvente.</li>
                    </ul>
                  </div>

                  <div className="rounded-md border border-border bg-background p-3">
                    <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground mb-2">
                      <Gauge className="h-3.5 w-3.5" /> Eficiencia Aislante Estimada
                    </h4>
                    {numericsValid ? (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tempFueraRango ? (
                          <>Temperatura <span className="font-mono text-destructive">{parsed.temperatura}°C</span> fuera del óptimo: pérdida estimada de rigidez dieléctrica ≈ <span className="font-mono">8–15%</span>.</>
                        ) : (
                          <>Temperatura dentro del rango óptimo. Rigidez dieléctrica esperada ≥ <span className="font-mono text-emerald-500">30 kV / 2.5 mm</span> (ASTM D877).</>
                        )}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">
                        Ingresa los parámetros de Control para estimar la eficiencia.
                      </p>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                    Nota: la optimización combina caracterización del aceite base con las condiciones
                    de proceso para maximizar el desempeño dieléctrico y la estabilidad operativa
                    del biodisolvente.
                  </p>
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
                      <h3 className="font-semibold">
                        {viable ? "Lote APTO como Biodisolvente Dieléctrico" : "Lote NO APTO — Estado crítico"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {viable
                          ? "Cumple los límites críticos de calidad. Apto para uso como aislante líquido."
                          : "Acidez o humedad exceden los límites críticos. Se compromete la rigidez dieléctrica."}
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
                      </ul>
                    </div>
                  )}
                </div>

                {tempFueraRango && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold">Estabilidad Térmica Comprometida</p>
                      <p className="text-muted-foreground mt-1">
                        Temperatura {parsed.temperatura}°C fuera del rango operativo seguro ({LIMITS.tempMin}–{LIMITS.tempMax}°C).
                        Ajustar para preservar el desempeño aislante y la seguridad industrial.
                      </p>
                    </div>
                  </div>
                )}

                {alertaVisual && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold">Pre-tratamiento Recomendado</p>
                      <p className="text-muted-foreground mt-1">
                        {inputs.color === "marron" && "Color marrón oscuro detectado. "}
                        {inputs.aspecto === "turbio" && "Aspecto turbio o con sedimentos. "}
                        Se recomienda <strong>filtración</strong> y/o <strong>refinación adicional</strong>
                        antes del proceso de formulación del biodisolvente.
                      </p>
                      <p className="text-xs text-muted-foreground italic mt-2">
                        El color oscuro está asociado a compuestos polares y oxidación que reducen la rigidez dieléctrica.
                      </p>
                    </div>
                  </div>
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
                    <ReportRow label="Índice de Saponificación" value={`${parsed.saponificacion}`}
                      ok={parsed.saponificacion >= LIMITS.saponificacionMin && parsed.saponificacion <= LIMITS.saponificacionMax} />
                    <ReportRow label="Índice de Peróxidos" value={`${parsed.peroxidos} meq/kg`}
                      ok={parsed.peroxidos <= LIMITS.peroxidosMax} />
                  </ReportGroup>

                  <ReportGroup title="Variables de Control Operativo" icon={<Settings2 className="h-4 w-4" />}>
                    <ReportRow label="Relación Molar Esterificante/Aceite" value={`${parsed.relacionMolar} : 1`}
                      ok={parsed.relacionMolar >= 5 && parsed.relacionMolar <= 9} />
                    <ReportRow label="Concentración Catalizador" value={`${parsed.catalizador} %`}
                      ok={parsed.catalizador >= LIMITS.catalizadorMin && parsed.catalizador <= LIMITS.catalizadorMax} />
                    <ReportRow label="Temperatura de Proceso" value={`${parsed.temperatura} °C`} ok={!tempFueraRango} />
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

                {/* Estequiometría */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Formulación Estequiométrica de Referencia
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <MetricBox label="Relación molar sugerida" value={`1 : ${ratioSugerido}`}
                      sub="Maximiza rendimiento del biodisolvente" />
                    <MetricBox label="Esterificante requerido" value={`${masaEtanolPorKg} g/kg`}
                      sub="Por kg de aceite base procesado" />
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
