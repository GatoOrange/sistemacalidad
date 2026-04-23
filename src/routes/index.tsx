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
      { title: "Dashboard QC — Éster Etílico (Biodiesel)" },
      {
        name: "description",
        content:
          "Dashboard de Control de Calidad para producción de Éster Etílico (Biodiesel). Análisis físico, químico y de proceso.",
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
  saponificacion: string;
  peroxidos: string;
  // Proceso
  relacionMolar: string;
  catalizador: string;
  temperatura: string;
};

const LIMITS = {
  acidez: 2,         // mg KOH/g — crítico
  humedad: 0.05,     // % — crítico
  tempMin: 60,       // °C
  tempMax: 80,       // °C
  densidadMin: 860,  // kg/m³
  densidadMax: 900,
  viscosidadMin: 3.5,// cSt
  viscosidadMax: 5.0,
  saponificacionMin: 188,
  saponificacionMax: 200,
  peroxidosMax: 10,  // meq/kg
  catalizadorMin: 0.5,
  catalizadorMax: 1.5,
};

const initialInputs: Inputs = {
  densidad: "",
  viscosidad: "",
  humedad: "",
  color: "",
  aspecto: "",
  acidez: "",
  saponificacion: "",
  peroxidos: "",
  relacionMolar: "",
  catalizador: "",
  temperatura: "",
};

type ColorOpt = { id: string; label: string; hex: string; warn?: boolean };
const COLOR_OPTIONS: ColorOpt[] = [
  { id: "amarillo", label: "Amarillo Claro (Refinado)", hex: "#F4E27A" },
  { id: "ambar", label: "Ámbar/Dorado (Crudo buena calidad)", hex: "#C98A2B" },
  { id: "marron", label: "Marrón Oscuro (Usado/Degradado)", hex: "#3E2410", warn: true },
  { id: "rojizo", label: "Rojizo (Pigmentos/Sobrecalentado)", hex: "#8A2A1E" },
];

function Dashboard() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [dark, setDark] = useState(true);
  const [inputs, setInputs] = useState<Inputs>(initialInputs);
  const [submitted, setSubmitted] = useState(false);
  const [tab, setTab] = useState("fisica");
  const [error, setError] = useState<string | null>(null);

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

  const allValid = Object.values(parsed).every((v) => !isNaN(v));

  if (!authChecked) return null;

  // Lógica de viabilidad
  const criticoAcidez = allValid && parsed.acidez > LIMITS.acidez;
  const criticoHumedad = allValid && parsed.humedad > LIMITS.humedad;
  const viable = allValid && !criticoAcidez && !criticoHumedad;

  const tempFueraRango =
    allValid && (parsed.temperatura < LIMITS.tempMin || parsed.temperatura > LIMITS.tempMax);

  // Estequiometría sugerida
  const ratioSugerido = 6;
  const masaEtanolPorKg = ((6 * 46) / 880 * 1000).toFixed(1);

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
      setError("Todos los campos críticos deben contener datos numéricos válidos.");
      // Saltar a la primera pestaña que tenga campo vacío
      const fisicaIncompleta = ["densidad", "viscosidad", "humedad"].some(
        (k) => isNaN(parseFloat(inputs[k as keyof Inputs])),
      );
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
    doc.text("Reporte de Viabilidad — Biodiesel (Éster Etílico)", 14, y);
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

    doc.setFontSize(12);
    doc.text("2. Caracterización Química", 14, y); y += 7;
    doc.setFontSize(10);
    doc.text(`• Índice de Acidez: ${parsed.acidez} mg KOH/g (límite ≤ ${LIMITS.acidez})`, 18, y); y += 6;
    doc.text(`• Índice de Saponificación: ${parsed.saponificacion} (rango ${LIMITS.saponificacionMin}-${LIMITS.saponificacionMax})`, 18, y); y += 6;
    doc.text(`• Índice de Peróxidos: ${parsed.peroxidos} meq/kg (límite ≤ ${LIMITS.peroxidosMax})`, 18, y); y += 10;

    doc.setFontSize(12);
    doc.text("3. Variables de Control de Proceso", 14, y); y += 7;
    doc.setFontSize(10);
    doc.text(`• Relación molar alcohol/aceite: ${parsed.relacionMolar} (sugerido ${ratioSugerido}:1)`, 18, y); y += 6;
    doc.text(`• Concentración de catalizador: ${parsed.catalizador} % (rango ${LIMITS.catalizadorMin}-${LIMITS.catalizadorMax})`, 18, y); y += 6;
    doc.text(`• Temperatura de reacción: ${parsed.temperatura} °C (rango ${LIMITS.tempMin}-${LIMITS.tempMax})`, 18, y); y += 12;

    doc.setFontSize(12);
    doc.text(`Resultado: ${viable ? "VIABLE" : "NO VIABLE"}`, 14, y); y += 8;
    doc.setFontSize(10);
    if (!viable) {
      doc.text("Recomendaciones (Res. 182142 de 2007 / NTC):", 14, y); y += 6;
      if (criticoAcidez) { doc.text("- Esterificación ácida con H2SO4 (1% v/v).", 18, y); y += 6; }
      if (criticoHumedad) { doc.text("- Secado al vacío hasta humedad < 0.05%.", 18, y); y += 6; }
    } else {
      doc.text("Cumple normativa colombiana para producción de biodiesel.", 14, y); y += 6;
    }
    if (tempFueraRango) {
      doc.text(`⚠ Eficiencia energética no óptima: T fuera de ${LIMITS.tempMin}-${LIMITS.tempMax}°C.`, 14, y); y += 6;
    }
    doc.save(`reporte-biodiesel-${Date.now()}.pdf`);
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
                QC Biodiesel — Éster Etílico
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Sistema de Control de Calidad · Planta de Producción
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
          <StatCard icon={<Beaker className="h-4 w-4" />} label="Norma" value="Res. 182142/07" tone="muted" />
          <StatCard
            icon={submitted && viable ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            label="Último análisis"
            value={!submitted ? "Pendiente" : viable ? "Viable" : "No viable"}
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
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="fisica" className="text-xs gap-1">
                    <Thermometer className="h-3.5 w-3.5" /> Física
                  </TabsTrigger>
                  <TabsTrigger value="quimica" className="text-xs gap-1">
                    <Atom className="h-3.5 w-3.5" /> Química
                  </TabsTrigger>
                  <TabsTrigger value="control" className="text-xs gap-1">
                    <Settings2 className="h-3.5 w-3.5" /> Control
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
                  <FieldInput icon={<Atom className="h-4 w-4" />} label="Relación Molar Alcohol/Aceite" unit=":1"
                    value={inputs.relacionMolar} onChange={handleChange("relacionMolar")}
                    hint={`Sugerido ${ratioSugerido}:1`} />
                  <FieldInput icon={<FlaskConical className="h-4 w-4" />} label="Concentración Catalizador" unit="%"
                    value={inputs.catalizador} onChange={handleChange("catalizador")}
                    hint={`Rango ${LIMITS.catalizadorMin}–${LIMITS.catalizadorMax}`} />
                  <FieldInput icon={<Thermometer className="h-4 w-4" />} label="Temperatura de Reacción" unit="°C"
                    value={inputs.temperatura} onChange={handleChange("temperatura")}
                    hint={`Óptimo ${LIMITS.tempMin}–${LIMITS.tempMax}`} />
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
                        {viable ? "Lote VIABLE para transesterificación" : "Lote NO VIABLE — Estado crítico"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {viable
                          ? "Cumple los límites técnicos críticos. Apto para iniciar reacción con etanol."
                          : "Acidez o humedad exceden los límites críticos. Se requiere pre-tratamiento."}
                      </p>
                    </div>
                  </div>

                  {!viable && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
                      <p className="font-medium">Cumplimiento Normativo · Resolución 182142 de 2007 / NTC</p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        {criticoAcidez && (
                          <li>
                            Acidez {parsed.acidez} &gt; {LIMITS.acidez} mg KOH/g → <strong>Esterificación ácida</strong> con H₂SO₄ (1% v/v).
                          </li>
                        )}
                        {criticoHumedad && (
                          <li>
                            Humedad {parsed.humedad}% &gt; {LIMITS.humedad}% → <strong>Secado al vacío</strong> a 105°C.
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
                      <p className="font-semibold">Eficiencia Energética No Óptima</p>
                      <p className="text-muted-foreground mt-1">
                        Temperatura {parsed.temperatura}°C fuera del rango óptimo para etanol ({LIMITS.tempMin}–{LIMITS.tempMax}°C).
                        Ajustar para maximizar conversión.
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
                  </ReportGroup>

                  <ReportGroup title="Caracterización Química" icon={<Atom className="h-4 w-4" />}>
                    <ReportRow label="Índice de Acidez" value={`${parsed.acidez} mg KOH/g`} ok={!criticoAcidez} critical />
                    <ReportRow label="Índice de Saponificación" value={`${parsed.saponificacion}`}
                      ok={parsed.saponificacion >= LIMITS.saponificacionMin && parsed.saponificacion <= LIMITS.saponificacionMax} />
                    <ReportRow label="Índice de Peróxidos" value={`${parsed.peroxidos} meq/kg`}
                      ok={parsed.peroxidos <= LIMITS.peroxidosMax} />
                  </ReportGroup>

                  <ReportGroup title="Variables de Control de Proceso" icon={<Settings2 className="h-4 w-4" />}>
                    <ReportRow label="Relación Molar Alcohol/Aceite" value={`${parsed.relacionMolar} : 1`}
                      ok={parsed.relacionMolar >= 5 && parsed.relacionMolar <= 9} />
                    <ReportRow label="Concentración Catalizador" value={`${parsed.catalizador} %`}
                      ok={parsed.catalizador >= LIMITS.catalizadorMin && parsed.catalizador <= LIMITS.catalizadorMax} />
                    <ReportRow label="Temperatura de Reacción" value={`${parsed.temperatura} °C`} ok={!tempFueraRango} />
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
                    Optimización Estequiométrica
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <MetricBox label="Relación molar sugerida" value={`1 : ${ratioSugerido}`}
                      sub="Maximiza conversión a éster etílico" />
                    <MetricBox label="Etanol requerido" value={`${masaEtanolPorKg} g/kg`}
                      sub="Por kg de aceite procesado" />
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
          QC Biodiesel · Cumplimiento Resolución 182142 de 2007 · NTC 5444
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
