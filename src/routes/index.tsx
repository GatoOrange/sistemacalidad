import { createFileRoute } from "@tanstack/react-router";
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
import jsPDF from "jspdf";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard QC — Éster Etílico (Biodiesel)" },
      {
        name: "description",
        content:
          "Dashboard de Control de Calidad para producción de Éster Etílico (Biodiesel). Análisis de viabilidad, normativa y optimización estequiométrica.",
      },
    ],
  }),
  component: Dashboard,
});

type Inputs = {
  acidez: string;
  humedad: string;
  saponificacion: string;
  pureza: string;
};

const LIMITS = {
  acidez: 2,
  humedad: 0.5,
  saponificacionMin: 188,
  saponificacionMax: 200,
  purezaMin: 99.5,
};

function Dashboard() {
  const [dark, setDark] = useState(true);
  const [inputs, setInputs] = useState<Inputs>({
    acidez: "",
    humedad: "",
    saponificacion: "",
    pureza: "",
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", dark);
    }
  }, [dark]);

  const parsed = useMemo(
    () => ({
      acidez: parseFloat(inputs.acidez),
      humedad: parseFloat(inputs.humedad),
      saponificacion: parseFloat(inputs.saponificacion),
      pureza: parseFloat(inputs.pureza),
    }),
    [inputs],
  );

  const allValid =
    !isNaN(parsed.acidez) &&
    !isNaN(parsed.humedad) &&
    !isNaN(parsed.saponificacion) &&
    !isNaN(parsed.pureza);

  const viable = allValid && parsed.acidez <= LIMITS.acidez && parsed.humedad <= LIMITS.humedad;

  // Estequiometría: relación molar 1:6 (aceite:alcohol) recomendada para transesterificación
  // Masa molar promedio aceite ~ 880 g/mol, etanol 46 g/mol
  // Ajuste por pureza
  const ratioBase = 6;
  const ratioAjustado = allValid
    ? (ratioBase * (100 / Math.max(parsed.pureza, 1))).toFixed(2)
    : "—";
  const masaEtanolPorKg = allValid
    ? (((6 * 46) / 880) * (100 / Math.max(parsed.pureza, 1)) * 1000).toFixed(1)
    : "—";

  const chartData = allValid
    ? [
        {
          name: "Acidez",
          Permitido: LIMITS.acidez,
          Real: parsed.acidez,
        },
        {
          name: "Humedad",
          Permitido: LIMITS.humedad,
          Real: parsed.humedad,
        },
        {
          name: "Saponif.",
          Permitido: LIMITS.saponificacionMax,
          Real: parsed.saponificacion,
        },
        {
          name: "Pureza EtOH",
          Permitido: LIMITS.purezaMin,
          Real: parsed.pureza,
        },
      ]
    : [];

  const handleChange = (key: keyof Inputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputs((p) => ({ ...p, [key]: e.target.value }));
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (allValid) setSubmitted(true);
  };

  const handleDownload = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleString("es-CO");
    doc.setFontSize(16);
    doc.text("Reporte de Viabilidad — Biodiesel (Éster Etílico)", 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha: ${date}`, 14, 28);
    doc.setFontSize(12);
    doc.text("Parámetros medidos:", 14, 42);
    doc.setFontSize(10);
    doc.text(`• Índice de Acidez: ${parsed.acidez} mg KOH/g (límite ${LIMITS.acidez})`, 18, 50);
    doc.text(`• Humedad: ${parsed.humedad} % (límite ${LIMITS.humedad})`, 18, 58);
    doc.text(`• Índice de Saponificación: ${parsed.saponificacion}`, 18, 66);
    doc.text(`• Pureza del Etanol: ${parsed.pureza} %`, 18, 74);
    doc.setFontSize(12);
    doc.text(`Resultado: ${viable ? "VIABLE" : "NO VIABLE"}`, 14, 90);
    doc.setFontSize(10);
    if (!viable) {
      doc.text("Riesgo de saponificación elevado.", 14, 100);
      doc.text("Recomendaciones (Res. 182142 de 2007 / NTC):", 14, 110);
      doc.text("- Pre-tratamiento por esterificación ácida (H2SO4).", 18, 118);
      doc.text("- Secado al vacío para reducir humedad < 0.5%.", 18, 126);
      doc.text("- Neutralización con KOH si acidez > 2 mg KOH/g.", 18, 134);
    } else {
      doc.text("Cumple normativa colombiana para producción de biodiesel.", 14, 100);
    }
    doc.text("Optimización estequiométrica:", 14, 150);
    doc.text(`Relación molar aceite:alcohol sugerida = 1 : ${ratioAjustado}`, 18, 158);
    doc.text(`Etanol requerido ≈ ${masaEtanolPorKg} g por kg de aceite`, 18, 166);
    doc.save(`reporte-biodiesel-${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* Header */}
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
          <button
            onClick={() => setDark((d) => !d)}
            className="p-2 rounded-md border border-border hover:bg-accent transition-colors"
            aria-label="Cambiar tema"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {/* Status strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Activity className="h-4 w-4" />}
            label="Estado planta"
            value="Operativa"
            tone="ok"
          />
          <StatCard
            icon={<Gauge className="h-4 w-4" />}
            label="Lotes hoy"
            value="—"
            tone="muted"
          />
          <StatCard
            icon={<Beaker className="h-4 w-4" />}
            label="Norma"
            value="Res. 182142/07"
            tone="muted"
          />
          <StatCard
            icon={submitted && viable ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            label="Último análisis"
            value={!submitted ? "Pendiente" : viable ? "Viable" : "No viable"}
            tone={!submitted ? "muted" : viable ? "ok" : "danger"}
          />
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Form */}
          <section className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <FlaskConical className="h-4 w-4" /> Parámetros de Entrada
            </h2>
            <form onSubmit={handleAnalyze} className="space-y-4">
              <FieldInput
                icon={<Droplets className="h-4 w-4" />}
                label="Índice de Acidez"
                unit="mg KOH/g"
                value={inputs.acidez}
                onChange={handleChange("acidez")}
                hint={`Límite ≤ ${LIMITS.acidez}`}
              />
              <FieldInput
                icon={<Droplets className="h-4 w-4" />}
                label="Contenido de Humedad"
                unit="%"
                value={inputs.humedad}
                onChange={handleChange("humedad")}
                hint={`Límite ≤ ${LIMITS.humedad}`}
              />
              <FieldInput
                icon={<Beaker className="h-4 w-4" />}
                label="Índice de Saponificación"
                unit="mg KOH/g"
                value={inputs.saponificacion}
                onChange={handleChange("saponificacion")}
                hint={`Rango ${LIMITS.saponificacionMin}–${LIMITS.saponificacionMax}`}
              />
              <FieldInput
                icon={<FlaskConical className="h-4 w-4" />}
                label="Pureza del Etanol"
                unit="%"
                value={inputs.pureza}
                onChange={handleChange("pureza")}
                hint={`Recomendado ≥ ${LIMITS.purezaMin}`}
              />
              <button
                type="submit"
                disabled={!allValid}
                className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Analizar Lote
              </button>
            </form>
          </section>

          {/* Report */}
          <section className="lg:col-span-3 space-y-6">
            {!submitted ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Ingresa los parámetros del lote y presiona <strong>Analizar Lote</strong> para generar el reporte de viabilidad.
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
                        {viable ? "Lote VIABLE para transesterificación" : "Lote NO VIABLE — Riesgo de saponificación"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {viable
                          ? "Cumple los límites técnicos. Apto para iniciar reacción con etanol."
                          : "Los parámetros exceden los límites permitidos. Se requiere pre-tratamiento."}
                      </p>
                    </div>
                  </div>

                  {!viable && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
                      <p className="font-medium">
                        Cumplimiento Normativo · Resolución 182142 de 2007 (Colombia) / NTC
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        {parsed.acidez > LIMITS.acidez && (
                          <li>
                            Acidez {parsed.acidez} &gt; {LIMITS.acidez} mg KOH/g → <strong>Esterificación ácida</strong> con H₂SO₄ (1% v/v) previo a transesterificación.
                          </li>
                        )}
                        {parsed.humedad > LIMITS.humedad && (
                          <li>
                            Humedad {parsed.humedad}% &gt; {LIMITS.humedad}% → <strong>Secado al vacío</strong> a 105°C hasta &lt; 0.5%.
                          </li>
                        )}
                        <li>Neutralización adicional con KOH si persiste acidez residual.</li>
                      </ul>
                    </div>
                  )}
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Permitido" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Real" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Stoichiometry */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Optimización Estequiométrica
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <MetricBox
                      label="Relación molar aceite:alcohol"
                      value={`1 : ${ratioAjustado}`}
                      sub="Ajustada por pureza del etanol"
                    />
                    <MetricBox
                      label="Etanol requerido"
                      value={`${masaEtanolPorKg} g/kg`}
                      sub="Por kg de aceite procesado"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Exceso molar 6:1 maximiza conversión a éster etílico (&gt;97%) y reduce glicerol residual.
                  </p>
                </div>

                {/* Download */}
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
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "ok" | "danger" | "muted";
}) {
  const toneCls =
    tone === "ok"
      ? "text-emerald-500"
      : tone === "danger"
        ? "text-destructive"
        : "text-muted-foreground";
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
  icon,
  label,
  unit,
  value,
  onChange,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  unit: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint: string;
}) {
  return (
    <div>
      <label className="flex items-center justify-between text-xs font-medium mb-1.5">
        <span className="flex items-center gap-1.5 text-foreground">
          {icon}
          {label}
        </span>
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
          required
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {unit}
        </span>
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
