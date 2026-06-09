import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Beaker,
  FlaskConical,
  Droplets,
  Atom,
  Factory,
  Moon,
  Sun,
  Download,
  LogOut,
  FileText,
  Settings2,
  TrendingUp,
  Target,
  ClipboardList,
  ScrollText,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import jsPDF from "jspdf";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Plataforma Oleoquímica — FAME/FAEE desde Aceite Residual" },
      {
        name: "description",
        content:
          "Reestructuración del proceso de producción de ésteres monoalquílicos de ácidos grasos (FAME/FAEE) a partir de aceite residual de cocina: caracterización, análisis comparativo vs biodiésel convencional y evaluación de nichos de mercado.",
      },
    ],
  }),
  component: PlataformaOleoquimica,
});

// ====================================================================
// FASE 1 — Variables del proceso (toda la información como variables)
// ====================================================================

type Proyecto = {
  // Materia prima
  tipoAceite: string;
  origenAceite: string;
  acidez: string;            // mg KOH/g
  densidadAceite: string;    // g/mL
  humedadAceite: string;     // %
  saponificacion: string;    // mg KOH/g
  yodo: string;              // g I2/100 g
  perfilAG: string;          // texto: %C16:0, %C18:1, etc.

  // Alcohol
  alcoholNombre: string;
  alcoholFormula: string;
  alcoholPureza: string;     // %
  relacionMolar: string;     // aceite:alcohol -> ej "1:6"
  funcionAlcohol: string;

  // Catalizador básico
  catBasicoNombre: string;
  catBasicoConcentracion: string; // %
  catBasicoCantidad: string;      // g o % p/p del aceite
  catBasicoJustificacion: string;

  // Catalizador ácido (esterificación previa)
  catAcidoNombre: string;
  catAcidoConcentracion: string;
  catAcidoCantidad: string;
  catAcidoJustificacion: string;

  // Metodología
  metCaracterizacion: string;
  metEsterificacion: string;
  metTransesterificacion: string;
  metLavado: string;
  metSecado: string;
  metPurificacion: string;
  metProductoFinal: string;

  // Condiciones operacionales
  temperatura: string;     // °C
  tiempoReaccion: string;  // min
  agitacion: string;       // rpm
  presion: string;         // atm o kPa
  rendimiento: string;     // %
  conversion: string;      // %
};

const initial: Proyecto = {
  tipoAceite: "",
  origenAceite: "",
  acidez: "",
  densidadAceite: "",
  humedadAceite: "",
  saponificacion: "",
  yodo: "",
  perfilAG: "",
  alcoholNombre: "",
  alcoholFormula: "",
  alcoholPureza: "",
  relacionMolar: "",
  funcionAlcohol: "",
  catBasicoNombre: "",
  catBasicoConcentracion: "",
  catBasicoCantidad: "",
  catBasicoJustificacion: "",
  catAcidoNombre: "",
  catAcidoConcentracion: "",
  catAcidoCantidad: "",
  catAcidoJustificacion: "",
  metCaracterizacion: "",
  metEsterificacion: "",
  metTransesterificacion: "",
  metLavado: "",
  metSecado: "",
  metPurificacion: "",
  metProductoFinal: "",
  temperatura: "",
  tiempoReaccion: "",
  agitacion: "",
  presion: "",
  rendimiento: "",
  conversion: "",
};

// ====================================================================
// FASE 2 — Inferencia química del éster obtenido
// ====================================================================

type EsterInfo = {
  tipo: string;
  abreviatura: string;
  familia: string;
  estructura: string;
  mecanismo: string;
  influenciaAlcohol: string;
  influenciaCatalizador: string;
  ventajas: string[];
  limitaciones: string[];
};

function normalizeAlcohol(name: string): { key: string; carbono: number } {
  const n = name.trim().toLowerCase();
  if (!n) return { key: "", carbono: 0 };
  if (n.includes("metanol") || n === "ch3oh") return { key: "metanol", carbono: 1 };
  if (n.includes("etanol") || n === "c2h5oh") return { key: "etanol", carbono: 2 };
  if (n.includes("isoprop")) return { key: "isopropanol", carbono: 3 };
  if (n.includes("propan")) return { key: "propanol", carbono: 3 };
  if (n.includes("butan")) return { key: "butanol", carbono: 4 };
  return { key: n, carbono: 0 };
}

function inferirEster(p: Proyecto): EsterInfo {
  const { key } = normalizeAlcohol(p.alcoholNombre);
  const tieneCatBasico = p.catBasicoNombre.trim().length > 0;
  const tieneCatAcido = p.catAcidoNombre.trim().length > 0;

  const map: Record<string, { tipo: string; abrev: string }> = {
    metanol: { tipo: "Ésteres metílicos de ácidos grasos", abrev: "FAME" },
    etanol: { tipo: "Ésteres etílicos de ácidos grasos", abrev: "FAEE" },
    isopropanol: { tipo: "Ésteres isopropílicos de ácidos grasos", abrev: "FAIPE" },
    propanol: { tipo: "Ésteres propílicos de ácidos grasos", abrev: "FAPE" },
    butanol: { tipo: "Ésteres butílicos de ácidos grasos", abrev: "FABE" },
  };
  const base = map[key] ?? {
    tipo: "Éster monoalquílico de ácidos grasos",
    abrev: "FAAE",
  };

  const mecPartes: string[] = [];
  if (tieneCatAcido)
    mecPartes.push(
      "Esterificación ácida previa (Fischer): protonación del grupo carboxilo, ataque nucleofílico del alcohol y eliminación de agua. Reduce el índice de acidez por debajo de 1 mg KOH/g antes de la transesterificación.",
    );
  if (tieneCatBasico)
    mecPartes.push(
      "Transesterificación básica: el alcóxido formado in situ ataca el carbono carbonílico del triglicérido, desplaza el glicerol mediante un intermediario tetraédrico y libera el éster alquílico correspondiente.",
    );

  return {
    tipo: base.tipo,
    abreviatura: base.abrev,
    familia: "Ésteres monoalquílicos de ácidos grasos de cadena larga (C14–C22)",
    estructura: `R–COO–R'  donde R proviene del perfil de ácidos grasos del aceite (${p.tipoAceite || "aceite residual"}) y R' corresponde al grupo alquilo aportado por ${p.alcoholNombre || "el alcohol empleado"}.`,
    mecanismo:
      mecPartes.join(" ") ||
      "Reacción de transesterificación clásica catalizada homogéneamente: ataque nucleofílico del alcóxido sobre el carbono carbonílico, formación de intermediario tetraédrico y liberación secuencial de tres moléculas de éster por molécula de triglicérido.",
    influenciaAlcohol: alcoholInfluence(key),
    influenciaCatalizador: catalizadorInfluence(tieneCatAcido, tieneCatBasico),
    ventajas: ventajasEster(key),
    limitaciones: limitacionesEster(key),
  };
}

function alcoholInfluence(key: string): string {
  switch (key) {
    case "metanol":
      return "Cadena más corta y mayor polaridad: alta reactividad, separación de fases rápida, viscosidad cinemática típica 3.5–5.0 cSt y excelente rendimiento; sin embargo, deriva de fuentes fósiles y es tóxico.";
    case "etanol":
      return "Cadena C2 ligeramente más larga: producto más biodegradable y de origen renovable (bioetanol), mejor poder solvente y punto de inflamación más alto, pero separación de fases más lenta por la mayor solubilidad del glicerol.";
    case "isopropanol":
      return "Alcohol secundario ramificado: ésteres con menor punto de fluidez, mejor desempeño en frío, mayor poder solvente y compatibilidad con formulaciones cosméticas/limpieza.";
    case "butanol":
      return "Cadena C4: ésteres más hidrofóbicos, mayor lubricidad y mayor punto de inflamación; útiles como solventes verdes y lubricantes biodegradables.";
    default:
      return "El alcohol determina la longitud y geometría del grupo R' del éster, afectando viscosidad, polaridad, volatilidad, solvencia y desempeño en frío del producto.";
  }
}

function catalizadorInfluence(acido: boolean, basico: boolean): string {
  if (acido && basico)
    return "Ruta combinada ácido-base: el catalizador ácido (típicamente H2SO4) reduce ácidos grasos libres por esterificación; posteriormente el catalizador básico (NaOH/KOH/CH3ONa) acelera la transesterificación hasta conversiones >95%. Recomendado para aceites residuales con alta acidez.";
  if (basico)
    return "Catálisis básica homogénea: alta velocidad y conversión, pero sensible a humedad y ácidos grasos libres; requiere materia prima con acidez <1 mg KOH/g para evitar saponificación.";
  if (acido)
    return "Catálisis ácida homogénea: tolera alta acidez y humedad pero es lenta (5–20× más que la básica) y exige mayor relación molar alcohol:aceite y temperaturas más altas.";
  return "La selección catalítica condiciona la cinética, la formación de jabones y el rendimiento final del éster monoalquílico.";
}

function ventajasEster(key: string): string[] {
  const base = [
    "Origen renovable a partir de residuos: economía circular.",
    "Biodegradabilidad >90% en 28 días (OECD 301).",
    "Baja toxicidad acuática y dérmica respecto a solventes petroquímicos.",
    "Excelente lubricidad intrínseca (mejora del HFRR).",
  ];
  if (key === "etanol") base.push("Producto 100% renovable cuando el bioetanol también lo es.");
  if (key === "isopropanol" || key === "butanol")
    base.push("Mayor poder solvente y mejor comportamiento en frío que el FAME convencional.");
  return base;
}

function limitacionesEster(key: string): string[] {
  const base = [
    "Estabilidad oxidativa limitada por insaturaciones del aceite original.",
    "Higroscopicidad moderada: requiere almacenamiento bajo atmósfera seca.",
    "Punto de nube/fluidez dependiente del perfil de ácidos grasos saturados.",
  ];
  if (key === "metanol") base.push("Producto trazable a metanol fósil; toxicidad del alcohol residual.");
  if (key === "etanol")
    base.push("Cinética más lenta y separación glicerol/éster más compleja por mayor mutua solubilidad.");
  return base;
}

// ====================================================================
// FASE 3 — Caracterización técnica estimada
// ====================================================================

type Caracterizacion = {
  fisicas: { propiedad: string; valor: string; metodo: string }[];
  quimicas: { propiedad: string; valor: string; metodo: string }[];
};

function estimarCaracterizacion(p: Proyecto, _e: EsterInfo): Caracterizacion {
  const { carbono } = normalizeAlcohol(p.alcoholNombre);
  // Estimaciones tipográficas según literatura (Knothe, Van Gerpen, Demirbas).
  const densidad = carbono <= 1 ? "875–890 kg/m³" : carbono === 2 ? "870–880 kg/m³" : "865–880 kg/m³";
  const viscosidad = carbono <= 1 ? "3.5–5.0 cSt @40 °C" : carbono === 2 ? "4.0–5.5 cSt @40 °C" : "4.5–6.5 cSt @40 °C";
  const inflamacion = carbono <= 1 ? "≥130 °C" : carbono === 2 ? "≥160 °C" : "≥170 °C";
  const calor = carbono <= 1 ? "37–40 MJ/kg" : carbono === 2 ? "38–41 MJ/kg" : "39–42 MJ/kg";

  return {
    fisicas: [
      { propiedad: "Apariencia", valor: "Líquido transparente, libre de partículas", metodo: "Visual / ISO 2049" },
      { propiedad: "Color", valor: "Amarillo claro a ámbar (escala ASTM 1.0–3.0)", metodo: "ASTM D1500" },
      { propiedad: "Olor", valor: "Característico, suave a éster graso", metodo: "Sensorial" },
      { propiedad: "Densidad (15 °C)", valor: densidad, metodo: "ASTM D4052 / EN ISO 12185" },
      { propiedad: "Viscosidad cinemática", valor: viscosidad, metodo: "ASTM D445 / EN ISO 3104" },
      { propiedad: "Punto de inflamación", valor: inflamacion, metodo: "ASTM D93 (PMcc)" },
      { propiedad: "Punto de nube", valor: "-3 a +12 °C (función del perfil saturado)", metodo: "ASTM D2500" },
      { propiedad: "Punto de fluidez", valor: "-10 a +6 °C", metodo: "ASTM D97" },
      { propiedad: "Conductividad eléctrica", valor: "<100 pS/m (alta resistividad)", metodo: "ASTM D2624" },
      { propiedad: "Solubilidad", valor: "Miscible en hidrocarburos, alcoholes; insoluble en agua", metodo: "Cualitativa" },
      { propiedad: "Volatilidad", valor: "Baja (presión de vapor <0.1 kPa @20 °C)", metodo: "ASTM D2879" },
      { propiedad: "Poder calorífico", valor: calor, metodo: "ASTM D240" },
    ],
    quimicas: [
      { propiedad: "Estabilidad oxidativa (Rancimat)", valor: "3–10 h @110 °C (mejorable con antioxidantes)", metodo: "EN 14112" },
      { propiedad: "Polaridad", valor: "Polaridad intermedia (logP 7–10)", metodo: "Estimación QSPR" },
      { propiedad: "Índice de acidez", valor: "<0.5 mg KOH/g (producto purificado)", metodo: "EN 14104" },
      { propiedad: "Compatibilidad con materiales", valor: "Acero inoxidable y aluminio: alta. Cobre/zinc: media. Elastómeros NBR: baja", metodo: "ASTM D471" },
      { propiedad: "Poder solvente (KB)", valor: "55–75 (similar a solventes oxigenados verdes)", metodo: "ASTM D1133" },
      { propiedad: "Reactividad química", valor: "Susceptible a hidrólisis básica y oxidación por radicales libres", metodo: "Cinética química" },
      { propiedad: "Biodegradabilidad", valor: ">90% en 28 días", metodo: "OECD 301B" },
      { propiedad: "Toxicidad potencial", valor: "Baja (LD50 oral rata >5000 mg/kg)", metodo: "OECD 423" },
      { propiedad: "Contenido energético estimado", valor: calor, metodo: "Bomba calorimétrica" },
    ],
  };
}

// ====================================================================
// FASE 4 — Comparación contra biodiésel convencional (FAME NaOH)
// ====================================================================

type Comparativo = {
  propiedad: string;
  productoValor: string;
  biodieselValor: string;
  juicio: "Mejor" | "Similar" | "Inferior";
  motivo: string;
};

function compararContraBiodiesel(p: Proyecto): Comparativo[] {
  const { key } = normalizeAlcohol(p.alcoholNombre);
  const esMetilico = key === "metanol";
  const esEtilico = key === "etanol";
  const esLargo = ["isopropanol", "propanol", "butanol"].includes(key);

  const mejorOSim: "Mejor" | "Similar" | "Inferior" = esLargo ? "Mejor" : esEtilico ? "Similar" : "Similar";

  return [
    {
      propiedad: "Conductividad eléctrica",
      productoValor: "<100 pS/m",
      biodieselValor: "<200 pS/m",
      juicio: esMetilico ? "Similar" : "Mejor",
      motivo: "Las cadenas alquílicas más largas reducen la movilidad iónica y aumentan la resistividad del fluido.",
    },
    {
      propiedad: "Densidad",
      productoValor: esLargo ? "865–880 kg/m³" : "870–890 kg/m³",
      biodieselValor: "880 kg/m³",
      juicio: "Similar",
      motivo: "Diferencias menores al 2% por la longitud del grupo alquilo.",
    },
    {
      propiedad: "Viscosidad",
      productoValor: esLargo ? "4.5–6.5 cSt" : "3.5–5.5 cSt",
      biodieselValor: "4.0–5.0 cSt",
      juicio: esLargo ? "Similar" : "Similar",
      motivo: "Aumenta linealmente con la longitud de cadena del alcohol.",
    },
    {
      propiedad: "Poder calorífico",
      productoValor: esLargo ? "39–42 MJ/kg" : "37–40 MJ/kg",
      biodieselValor: "37–40 MJ/kg",
      juicio: esLargo ? "Mejor" : "Similar",
      motivo: "Mayor proporción de carbonos no oxigenados eleva la entalpía de combustión.",
    },
    {
      propiedad: "Estabilidad oxidativa",
      productoValor: "3–10 h",
      biodieselValor: "6 h (mínimo EN 14112)",
      juicio: esLargo ? "Mejor" : "Similar",
      motivo: "Ramificaciones y cadenas largas reducen sitios susceptibles a peroxidación.",
    },
    {
      propiedad: "Solvencia (KB)",
      productoValor: esLargo ? "65–80" : "55–70",
      biodieselValor: "55–60",
      juicio: "Mejor",
      motivo: "Mayor polaridad y momento dipolar incrementan el poder solvente frente a residuos orgánicos.",
    },
    {
      propiedad: "Biodegradabilidad",
      productoValor: ">90% / 28 d",
      biodieselValor: ">90% / 28 d",
      juicio: "Similar",
      motivo: "Ambos pertenecen a la familia de ésteres grasos fácilmente metabolizables.",
    },
    {
      propiedad: "Toxicidad",
      productoValor: "Muy baja",
      biodieselValor: "Baja",
      juicio: mejorOSim,
      motivo: "Ésteres etílicos/superiores eliminan la trazabilidad del metanol residual.",
    },
    {
      propiedad: "Compatibilidad con motores",
      productoValor: esMetilico ? "Alta (B7–B20)" : "Media-Alta",
      biodieselValor: "Alta (B7–B20)",
      juicio: esMetilico ? "Similar" : "Inferior",
      motivo: "Especificaciones EN 14214 / ASTM D6751 están diseñadas para FAME.",
    },
    {
      propiedad: "Compatibilidad con materiales",
      productoValor: "Acero, Al: Alta",
      biodieselValor: "Acero, Al: Alta",
      juicio: "Similar",
      motivo: "Compatibilidad similar con metales; ambos atacan elastómeros NBR.",
    },
    {
      propiedad: "Facilidad de producción",
      productoValor: esMetilico ? "Alta" : "Media",
      biodieselValor: "Alta",
      juicio: esMetilico ? "Similar" : "Inferior",
      motivo: "Cinética y separación de fases más lentas con alcoholes superiores al metanol.",
    },
    {
      propiedad: "Costo potencial",
      productoValor: esMetilico ? "Bajo" : "Medio",
      biodieselValor: "Bajo",
      juicio: esMetilico ? "Similar" : "Inferior",
      motivo: "Alcoholes superiores tienen mayor costo que el metanol fósil.",
    },
    {
      propiedad: "Valor agregado",
      productoValor: esLargo ? "Alto (solvente/lubricante verde)" : esEtilico ? "Alto (100% renovable)" : "Medio",
      biodieselValor: "Medio (combustible)",
      juicio: esMetilico ? "Similar" : "Mejor",
      motivo: "Diversificación hacia nichos no combustibles con mayor margen.",
    },
  ];
}

// ====================================================================
// FASE 5 — Nichos de mercado
// ====================================================================

type Nicho = {
  nombre: string;
  justificacion: string;
  ventajas: string;
  limitaciones: string;
  potencial: "Alto" | "Medio" | "Bajo";
  score: number;
};

function evaluarNichos(p: Proyecto): { nichos: Nicho[]; recomendado: Nicho } {
  const { key } = normalizeAlcohol(p.alcoholNombre);
  const esLargo = ["isopropanol", "propanol", "butanol"].includes(key);
  const esEtilico = key === "etanol";
  const esMetilico = key === "metanol";

  const base: Nicho[] = [
    {
      nombre: "Biocombustibles (B7–B100)",
      justificacion: "Cumple parámetros generales de FAME/FAEE; reemplazo parcial del diésel fósil.",
      ventajas: "Mercado consolidado, marco normativo claro (EN 14214 / ASTM D6751).",
      limitaciones: "Margen ajustado y competencia con biodiésel industrial.",
      potencial: esMetilico ? "Alto" : "Medio",
      score: esMetilico ? 85 : 65,
    },
    {
      nombre: "Solventes industriales verdes",
      justificacion: "Polaridad intermedia y alto KB permiten reemplazar xileno, MEK y solventes clorados.",
      ventajas: "Baja toxicidad, biodegradable, bajo COV.",
      limitaciones: "Volatilidad menor que solventes tradicionales (secado más lento).",
      potencial: esLargo ? "Alto" : "Medio",
      score: esLargo ? 90 : 70,
    },
    {
      nombre: "Desengrasantes y limpieza industrial",
      justificacion: "Excelente afinidad por grasas y aceites, fácil enjuague con tensoactivos.",
      ventajas: "Reemplaza solventes derivados del petróleo en talleres y plantas alimenticias.",
      limitaciones: "Requiere formulación con coadyuvantes para optimizar el desempeño.",
      potencial: "Alto",
      score: 88,
    },
    {
      nombre: "Lubricantes biodegradables",
      justificacion: "Lubricidad intrínseca elevada (HFRR <460 µm) y baja toxicidad ambiental.",
      ventajas: "Aplicable a maquinaria agrícola, forestal y marina.",
      limitaciones: "Estabilidad oxidativa limitada; requiere antioxidantes.",
      potencial: esLargo ? "Alto" : "Medio",
      score: esLargo ? 87 : 72,
    },
    {
      nombre: "Fluidos hidráulicos biodegradables",
      justificacion: "Viscosidad y punto de inflamación adecuados para sistemas hidráulicos HEES.",
      ventajas: "Cumple ISO 15380 (HEES) con paquete de aditivos.",
      limitaciones: "Sensible a contaminación con agua.",
      potencial: esLargo ? "Alto" : "Medio",
      score: esLargo ? 82 : 65,
    },
    {
      nombre: "Aditivos químicos y plastificantes",
      justificacion: "Compatibilidad con polímeros PVC y mejoras de fluidez en formulaciones.",
      ventajas: "Reemplazo de ftalatos en aplicaciones no críticas.",
      limitaciones: "Migración polimérica a controlar.",
      potencial: "Medio",
      score: 65,
    },
    {
      nombre: "Cosmética e higiene personal",
      justificacion: "Ésteres grasos similares a emolientes comerciales (palmitato de isopropilo).",
      ventajas: "Sensorialidad agradable, no comedogénico, biodegradable.",
      limitaciones: "Requiere refinación adicional (color, olor) y grado cosmético.",
      potencial: key === "isopropanol" ? "Alto" : "Medio",
      score: key === "isopropanol" ? 86 : 60,
    },
    {
      nombre: "Farmacéutica (excipientes)",
      justificacion: "Vehículo lipofílico para formulaciones tópicas y veterinarias.",
      ventajas: "Baja toxicidad y compatibilidad con principios activos liposolubles.",
      limitaciones: "Exige certificaciones GMP y pureza farmacopea.",
      potencial: "Medio",
      score: 55,
    },
    {
      nombre: "Agroquímica (coadyuvantes)",
      justificacion: "Solvente y vehículo de plaguicidas y bioestimulantes.",
      ventajas: "Biodegradabilidad reduce impacto ambiental en cultivos.",
      limitaciones: "Compatibilidad con principio activo a verificar.",
      potencial: "Medio",
      score: 60,
    },
    {
      nombre: "Tratamiento de superficies",
      justificacion: "Solvente para limpieza, decapado y preparación previa a recubrimientos.",
      ventajas: "Reduce uso de solventes clorados, mejora seguridad ocupacional.",
      limitaciones: "Tiempo de evaporación mayor.",
      potencial: "Medio",
      score: 68,
    },
    {
      nombre: "Materia prima oleoquímica",
      justificacion: "Plataforma para alcoholes grasos, aminas grasas, amidas, sulfonatos y tensoactivos.",
      ventajas: "Alto valor agregado y entrada al mercado de especialidades químicas.",
      limitaciones: "Requiere integración con procesos de hidrogenación / amidación.",
      potencial: "Alto",
      score: 80,
    },
  ];

  const recomendado = [...base].sort((a, b) => b.score - a.score)[0];
  return { nichos: base, recomendado };
}

// ====================================================================
// UI — Componentes auxiliares
// ====================================================================

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  unit?: string;
  type?: "text" | "number" | "textarea";
};

function Field({ label, value, onChange, placeholder, unit, type = "text" }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-foreground">
        {label}
        {unit ? <span className="ml-1 text-muted-foreground">({unit})</span> : null}
      </span>
      {type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      )}
    </label>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Badge({ tone, children }: { tone: "ok" | "warn" | "bad" | "info"; children: React.ReactNode }) {
  const map = {
    ok: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    warn: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    bad: "bg-destructive/15 text-destructive border-destructive/30",
    info: "bg-primary/15 text-primary border-primary/30",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}

// ====================================================================
// Componente principal
// ====================================================================

function PlataformaOleoquimica() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState("materia");
  const [p, setP] = useState<Proyecto>(initial);

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

  const set = <K extends keyof Proyecto>(k: K) => (v: string) => setP((s) => ({ ...s, [k]: v }));

  const ester = useMemo(() => inferirEster(p), [p]);
  const carac = useMemo(() => estimarCaracterizacion(p, ester), [p, ester]);
  const comparativa = useMemo(() => compararContraBiodiesel(p), [p]);
  const { nichos, recomendado } = useMemo(() => evaluarNichos(p), [p]);

  const dataComparacion = useMemo(
    () =>
      comparativa.map((c) => ({
        propiedad: c.propiedad,
        score: c.juicio === "Mejor" ? 100 : c.juicio === "Similar" ? 70 : 40,
      })),
    [comparativa],
  );

  const dataRadar = useMemo(
    () => [
      { eje: "Solvencia", v: 85 },
      { eje: "Biodegradab.", v: 95 },
      { eje: "Lubricidad", v: 80 },
      { eje: "Estab. ox.", v: 60 },
      { eje: "Energía", v: 75 },
      { eje: "Seguridad", v: 90 },
    ],
    [],
  );

  const dataNichos = useMemo(
    () => nichos.map((n) => ({ nombre: n.nombre.split(" ")[0], score: n.score })),
    [nichos],
  );

  if (!authChecked) return null;

  // ============== Generador de PDF (FASE 6) ==============
  const generarPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const M = 50;
    const W = 612 - 2 * M;
    let y = M;

    const h1 = (t: string) => {
      if (y > 720) { doc.addPage(); y = M; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(t, M, y);
      y += 18;
    };
    const h2 = (t: string) => {
      if (y > 730) { doc.addPage(); y = M; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(t, M, y);
      y += 14;
    };
    const para = (t: string) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(t || "—", W);
      lines.forEach((ln: string) => {
        if (y > 750) { doc.addPage(); y = M; }
        doc.text(ln, M, y);
        y += 12;
      });
      y += 4;
    };
    const kv = (k: string, v: string) => para(`• ${k}: ${v || "—"}`);

    // Portada
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Informe Técnico — Ésteres Monoalquílicos", M, y); y += 22;
    doc.setFontSize(12);
    doc.text("de Ácidos Grasos a partir de Aceite Residual de Cocina", M, y); y += 24;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Producto inferido: ${ester.tipo} (${ester.abreviatura})`, M, y); y += 14;
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, M, y); y += 24;

    h1("1. Resumen ejecutivo");
    para(
      `Se documenta la obtención de ${ester.tipo} (${ester.abreviatura}) a partir de ${p.tipoAceite || "aceite residual de cocina"} mediante ${p.catAcidoNombre ? "esterificación ácida previa y " : ""}transesterificación catalizada por ${p.catBasicoNombre || "catalizador básico"} empleando ${p.alcoholNombre || "alcohol"} en relación molar ${p.relacionMolar || "no especificada"}. El producto presenta propiedades fisicoquímicas comparables o superiores al biodiésel convencional FAME-NaOH en parámetros clave de solvencia y biodegradabilidad, posicionándolo como candidato preferente para el nicho de ${recomendado.nombre}.`,
    );

    h1("2. Introducción");
    para(
      "El aprovechamiento de aceites residuales de cocina (ARC) reduce la carga ambiental por vertidos, valoriza un residuo abundante y suministra una materia prima económica para la producción de ésteres monoalquílicos de ácidos grasos. Estos ésteres, lejos de limitarse al biodiésel, constituyen una plataforma oleoquímica de aplicaciones múltiples.",
    );

    h1("3. Objetivos");
    para("• Caracterizar la materia prima y el producto obtenido.");
    para("• Determinar el tipo de éster, su mecanismo de formación y sus propiedades.");
    para("• Comparar el producto contra biodiésel convencional FAME-NaOH.");
    para("• Identificar el nicho de mercado más prometedor y proponer una aplicación comercial.");

    h1("4. Materias primas");
    h2("4.1 Aceite residual");
    kv("Tipo", p.tipoAceite);
    kv("Origen", p.origenAceite);
    kv("Índice de acidez (mg KOH/g)", p.acidez);
    kv("Densidad (g/mL)", p.densidadAceite);
    kv("Humedad (%)", p.humedadAceite);
    kv("Índice de saponificación (mg KOH/g)", p.saponificacion);
    kv("Índice de yodo (g I2/100 g)", p.yodo);
    kv("Perfil de ácidos grasos", p.perfilAG);
    h2("4.2 Alcohol");
    kv("Nombre", p.alcoholNombre);
    kv("Fórmula", p.alcoholFormula);
    kv("Pureza (%)", p.alcoholPureza);
    kv("Relación molar aceite:alcohol", p.relacionMolar);
    kv("Función", p.funcionAlcohol);
    h2("4.3 Catalizadores");
    kv("Básico — Nombre", p.catBasicoNombre);
    kv("Básico — Concentración", p.catBasicoConcentracion);
    kv("Básico — Cantidad", p.catBasicoCantidad);
    kv("Básico — Justificación", p.catBasicoJustificacion);
    kv("Ácido — Nombre", p.catAcidoNombre);
    kv("Ácido — Concentración", p.catAcidoConcentracion);
    kv("Ácido — Cantidad", p.catAcidoCantidad);
    kv("Ácido — Justificación", p.catAcidoJustificacion);

    h1("5. Metodología");
    kv("Caracterización de materia prima", p.metCaracterizacion);
    kv("Esterificación", p.metEsterificacion);
    kv("Transesterificación", p.metTransesterificacion);
    kv("Lavado", p.metLavado);
    kv("Secado", p.metSecado);
    kv("Purificación", p.metPurificacion);
    kv("Caracterización del producto", p.metProductoFinal);
    h2("Condiciones operacionales");
    kv("Temperatura (°C)", p.temperatura);
    kv("Tiempo (min)", p.tiempoReaccion);
    kv("Agitación (rpm)", p.agitacion);
    kv("Presión", p.presion);
    kv("Rendimiento (%)", p.rendimiento);
    kv("Conversión (%)", p.conversion);

    h1("6. Fundamento químico");
    kv("Tipo de éster", ester.tipo);
    kv("Familia", ester.familia);
    kv("Estructura", ester.estructura);
    kv("Mecanismo", ester.mecanismo);
    kv("Influencia del alcohol", ester.influenciaAlcohol);
    kv("Influencia del catalizador", ester.influenciaCatalizador);

    h1("7. Resultados de caracterización");
    h2("7.1 Propiedades físicas");
    carac.fisicas.forEach((f) => kv(f.propiedad, `${f.valor} [${f.metodo}]`));
    h2("7.2 Propiedades químicas");
    carac.quimicas.forEach((q) => kv(q.propiedad, `${q.valor} [${q.metodo}]`));

    h1("8. Comparación con biodiésel convencional (FAME-NaOH)");
    comparativa.forEach((c) =>
      para(`• ${c.propiedad} — Producto: ${c.productoValor} | Biodiésel: ${c.biodieselValor} → ${c.juicio}. ${c.motivo}`),
    );

    h1("9. Análisis de ventajas y desventajas");
    h2("Ventajas");
    ester.ventajas.forEach((v) => para(`• ${v}`));
    h2("Limitaciones");
    ester.limitaciones.forEach((v) => para(`• ${v}`));

    h1("10. Identificación de nichos de mercado");
    nichos.forEach((n) =>
      para(`• ${n.nombre} [Potencial: ${n.potencial}] — ${n.justificacion} Ventajas: ${n.ventajas} Limitaciones: ${n.limitaciones}`),
    );

    h1("11. Propuesta de aplicación comercial");
    para(
      `Se recomienda enfocar el producto en el nicho de ${recomendado.nombre} (score ${recomendado.score}/100). ${recomendado.justificacion} Ventajas competitivas: ${recomendado.ventajas} Limitaciones a gestionar: ${recomendado.limitaciones}`,
    );

    h1("12. Conclusiones");
    para(
      `El proceso evaluado permite obtener ${ester.tipo} con propiedades coherentes con la literatura oleoquímica. La combinación de ${p.alcoholNombre || "alcohol seleccionado"} y ${p.catBasicoNombre || "catalizador básico"} determina la estructura final del éster y orienta su aplicación más allá del biocombustible tradicional.`,
    );

    h1("13. Recomendaciones");
    para("• Reducir la acidez inicial por debajo de 1 mg KOH/g antes de la transesterificación básica.");
    para("• Controlar humedad <0.05% para evitar saponificación.");
    para("• Optimizar la relación molar alcohol:aceite por superficie de respuesta.");
    para("• Incorporar antioxidantes (TBHQ, pirogalol) para mejorar la estabilidad oxidativa.");
    para("• Evaluar refinación adicional según el nicho objetivo (cosmético, lubricante, solvente).");

    h1("14. Referencias bibliográficas");
    para("• Knothe, G., Van Gerpen, J., Krahl, J. (2010). The Biodiesel Handbook. AOCS Press.");
    para("• Demirbas, A. (2009). Biodiesel: A Realistic Fuel Alternative for Diesel Engines. Springer.");
    para("• Ma, F., Hanna, M. A. (1999). Biodiesel production: a review. Bioresource Technology 70(1), 1–15.");
    para("• Meher, L. C., Vidya Sagar, D., Naik, S. N. (2006). Technical aspects of biodiesel production by transesterification. Renewable & Sustainable Energy Reviews 10(3), 248–268.");
    para("• EN 14214; ASTM D6751; ISO 15380; OECD 301B.");

    doc.save(`Informe_${ester.abreviatura}_${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/15 p-2 text-primary">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Plataforma Oleoquímica</h1>
              <p className="text-xs text-muted-foreground">
                Producción y análisis de ésteres monoalquílicos desde aceite residual
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark((d) => !d)}
              className="rounded-md border border-border p-2 hover:bg-accent"
              aria-label="Cambiar tema"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={generarPDF}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-4 w-4" /> Informe PDF
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("isLoggedIn");
                localStorage.removeItem("authUser");
                navigate({ to: "/login" });
              }}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="materia"><Droplets className="mr-1 h-4 w-4" />Materia prima</TabsTrigger>
            <TabsTrigger value="reactivos"><Beaker className="mr-1 h-4 w-4" />Reactivos</TabsTrigger>
            <TabsTrigger value="proceso"><Settings2 className="mr-1 h-4 w-4" />Proceso</TabsTrigger>
            <TabsTrigger value="analisis"><Atom className="mr-1 h-4 w-4" />Análisis</TabsTrigger>
            <TabsTrigger value="comparacion"><TrendingUp className="mr-1 h-4 w-4" />Comparación</TabsTrigger>
            <TabsTrigger value="mercado"><Target className="mr-1 h-4 w-4" />Mercado</TabsTrigger>
            <TabsTrigger value="informe"><ScrollText className="mr-1 h-4 w-4" />Informe</TabsTrigger>
          </TabsList>

          {/* ============ Materia prima ============ */}
          <TabsContent value="materia" className="mt-6 space-y-6">
            <Section title="1.1 Aceite residual de cocina" icon={Droplets}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tipo de aceite" value={p.tipoAceite} onChange={set("tipoAceite")} placeholder="Ej: Mezcla soya/palma" />
                <Field label="Origen" value={p.origenAceite} onChange={set("origenAceite")} placeholder="Restaurante, hogar, industrial..." />
                <Field label="Índice de acidez" unit="mg KOH/g" type="number" value={p.acidez} onChange={set("acidez")} />
                <Field label="Densidad" unit="g/mL" type="number" value={p.densidadAceite} onChange={set("densidadAceite")} />
                <Field label="Humedad" unit="%" type="number" value={p.humedadAceite} onChange={set("humedadAceite")} />
                <Field label="Índice de saponificación" unit="mg KOH/g" type="number" value={p.saponificacion} onChange={set("saponificacion")} />
                <Field label="Índice de yodo" unit="g I₂/100 g" type="number" value={p.yodo} onChange={set("yodo")} />
                <Field label="Perfil de ácidos grasos" type="textarea" value={p.perfilAG} onChange={set("perfilAG")} placeholder="C16:0 ~12%, C18:1 ~45%, C18:2 ~35%..." />
              </div>
            </Section>
          </TabsContent>

          {/* ============ Reactivos ============ */}
          <TabsContent value="reactivos" className="mt-6 space-y-6">
            <Section title="2.1 Alcohol" icon={Beaker}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre químico" value={p.alcoholNombre} onChange={set("alcoholNombre")} placeholder="Metanol / Etanol / Isopropanol..." />
                <Field label="Fórmula química" value={p.alcoholFormula} onChange={set("alcoholFormula")} placeholder="CH₃OH" />
                <Field label="Pureza" unit="%" type="number" value={p.alcoholPureza} onChange={set("alcoholPureza")} />
                <Field label="Relación molar aceite:alcohol" value={p.relacionMolar} onChange={set("relacionMolar")} placeholder="1:6" />
                <Field label="Función dentro del producto final" type="textarea" value={p.funcionAlcohol} onChange={set("funcionAlcohol")} />
              </div>
            </Section>

            <Section title="2.2 Catalizador básico (transesterificación)" icon={FlaskConical}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre químico" value={p.catBasicoNombre} onChange={set("catBasicoNombre")} placeholder="NaOH / KOH / CH₃ONa" />
                <Field label="Concentración" unit="%" value={p.catBasicoConcentracion} onChange={set("catBasicoConcentracion")} />
                <Field label="Cantidad utilizada" value={p.catBasicoCantidad} onChange={set("catBasicoCantidad")} placeholder="Ej: 1% p/p del aceite" />
                <Field label="Justificación de selección" type="textarea" value={p.catBasicoJustificacion} onChange={set("catBasicoJustificacion")} />
              </div>
            </Section>

            <Section title="2.3 Catalizador ácido (esterificación previa, si aplica)" icon={FlaskConical}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre químico" value={p.catAcidoNombre} onChange={set("catAcidoNombre")} placeholder="H₂SO₄ / HCl / p-TSA" />
                <Field label="Concentración" unit="%" value={p.catAcidoConcentracion} onChange={set("catAcidoConcentracion")} />
                <Field label="Cantidad utilizada" value={p.catAcidoCantidad} onChange={set("catAcidoCantidad")} />
                <Field label="Justificación de selección" type="textarea" value={p.catAcidoJustificacion} onChange={set("catAcidoJustificacion")} />
              </div>
            </Section>
          </TabsContent>

          {/* ============ Proceso ============ */}
          <TabsContent value="proceso" className="mt-6 space-y-6">
            <Section title="3.1 Metodología" icon={ClipboardList}>
              <div className="grid gap-4">
                <Field label="Caracterización de materia prima" type="textarea" value={p.metCaracterizacion} onChange={set("metCaracterizacion")} />
                <Field label="Esterificación ácida (si aplica)" type="textarea" value={p.metEsterificacion} onChange={set("metEsterificacion")} />
                <Field label="Transesterificación" type="textarea" value={p.metTransesterificacion} onChange={set("metTransesterificacion")} />
                <Field label="Lavado" type="textarea" value={p.metLavado} onChange={set("metLavado")} />
                <Field label="Secado" type="textarea" value={p.metSecado} onChange={set("metSecado")} />
                <Field label="Purificación" type="textarea" value={p.metPurificacion} onChange={set("metPurificacion")} />
                <Field label="Caracterización del producto final" type="textarea" value={p.metProductoFinal} onChange={set("metProductoFinal")} />
              </div>
            </Section>

            <Section title="3.2 Condiciones operacionales" icon={Settings2}>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Temperatura" unit="°C" type="number" value={p.temperatura} onChange={set("temperatura")} />
                <Field label="Tiempo de reacción" unit="min" type="number" value={p.tiempoReaccion} onChange={set("tiempoReaccion")} />
                <Field label="Velocidad de agitación" unit="rpm" type="number" value={p.agitacion} onChange={set("agitacion")} />
                <Field label="Presión" value={p.presion} onChange={set("presion")} placeholder="atm / kPa" />
                <Field label="Rendimiento obtenido" unit="%" type="number" value={p.rendimiento} onChange={set("rendimiento")} />
                <Field label="Conversión estimada" unit="%" type="number" value={p.conversion} onChange={set("conversion")} />
              </div>
            </Section>
          </TabsContent>

          {/* ============ Análisis (FASE 2 + 3) ============ */}
          <TabsContent value="analisis" className="mt-6 space-y-6">
            <Section title="FASE 2 — Identificación del éster obtenido" icon={Atom}>
              <div className="grid gap-3 text-sm">
                <p><Badge tone="info">{ester.abreviatura}</Badge> <strong>{ester.tipo}</strong></p>
                <p><strong>Familia:</strong> {ester.familia}</p>
                <p><strong>Estructura:</strong> {ester.estructura}</p>
                <p><strong>Mecanismo predominante:</strong> {ester.mecanismo}</p>
                <p><strong>Influencia del alcohol:</strong> {ester.influenciaAlcohol}</p>
                <p><strong>Influencia del catalizador:</strong> {ester.influenciaCatalizador}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h3 className="mb-1 font-semibold text-emerald-500">Ventajas</h3>
                    <ul className="list-disc space-y-1 pl-5">{ester.ventajas.map((v) => <li key={v}>{v}</li>)}</ul>
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-amber-500">Limitaciones</h3>
                    <ul className="list-disc space-y-1 pl-5">{ester.limitaciones.map((v) => <li key={v}>{v}</li>)}</ul>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="FASE 3 — Caracterización técnica estimada" icon={Factory}>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-semibold">Propiedades físicas</h3>
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-muted-foreground"><th className="py-1">Propiedad</th><th>Valor</th><th>Método</th></tr></thead>
                    <tbody>{carac.fisicas.map((f) => (
                      <tr key={f.propiedad} className="border-t border-border">
                        <td className="py-1 pr-2">{f.propiedad}</td><td className="pr-2">{f.valor}</td><td className="text-muted-foreground">{f.metodo}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">Propiedades químicas</h3>
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-muted-foreground"><th className="py-1">Propiedad</th><th>Valor</th><th>Método</th></tr></thead>
                    <tbody>{carac.quimicas.map((q) => (
                      <tr key={q.propiedad} className="border-t border-border">
                        <td className="py-1 pr-2">{q.propiedad}</td><td className="pr-2">{q.valor}</td><td className="text-muted-foreground">{q.metodo}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={dataRadar}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="eje" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="Perfil técnico" dataKey="v" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </TabsContent>

          {/* ============ Comparación (FASE 4) ============ */}
          <TabsContent value="comparacion" className="mt-6 space-y-6">
            <Section title="FASE 4 — Comparación contra biodiésel convencional (FAME-NaOH)" icon={TrendingUp}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-2">Propiedad</th>
                      <th className="pr-2">Producto</th>
                      <th className="pr-2">Biodiésel</th>
                      <th className="pr-2">Juicio</th>
                      <th>Motivo técnico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparativa.map((c) => (
                      <tr key={c.propiedad} className="border-t border-border align-top">
                        <td className="py-1.5 pr-2 font-medium">{c.propiedad}</td>
                        <td className="pr-2">{c.productoValor}</td>
                        <td className="pr-2">{c.biodieselValor}</td>
                        <td className="pr-2">
                          <Badge tone={c.juicio === "Mejor" ? "ok" : c.juicio === "Similar" ? "info" : "bad"}>{c.juicio}</Badge>
                        </td>
                        <td className="text-muted-foreground">{c.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataComparacion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="propiedad" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="score" name="Desempeño vs biodiésel" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </TabsContent>

          {/* ============ Mercado (FASE 5) ============ */}
          <TabsContent value="mercado" className="mt-6 space-y-6">
            <Section title="FASE 5 — Identificación de oportunidades de mercado" icon={Target}>
              <div className="grid gap-3 md:grid-cols-2">
                {nichos.map((n) => (
                  <div key={n.nombre} className="rounded-lg border border-border p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="font-semibold">{n.nombre}</h3>
                      <Badge tone={n.potencial === "Alto" ? "ok" : n.potencial === "Medio" ? "warn" : "bad"}>
                        {n.potencial} · {n.score}/100
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{n.justificacion}</p>
                    <p className="mt-1"><strong className="text-emerald-500">Ventajas:</strong> {n.ventajas}</p>
                    <p><strong className="text-amber-500">Limitaciones:</strong> {n.limitaciones}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataNichos}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="score" name="Score de mercado" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
                <h3 className="mb-1 font-semibold text-primary">Nicho recomendado: {recomendado.nombre}</h3>
                <p>{recomendado.justificacion}</p>
                <p className="mt-1"><strong>Por qué es la mejor alternativa:</strong> combina el potencial técnico del producto con las ventajas competitivas frente al biodiésel convencional, ofreciendo mayor margen y diferenciación en el mercado oleoquímico.</p>
              </div>
            </Section>
          </TabsContent>

          {/* ============ Informe (FASE 6) ============ */}
          <TabsContent value="informe" className="mt-6 space-y-6">
            <Section title="FASE 6 — Generación del informe técnico" icon={FileText}>
              <p className="mb-4 text-sm text-muted-foreground">
                Genera un informe profesional estructurado (resumen ejecutivo, introducción, objetivos, metodología,
                fundamento químico, caracterización, comparación con biodiésel, ventajas/desventajas, nichos de mercado,
                propuesta comercial, conclusiones, recomendaciones y referencias) basado en todas las variables ingresadas.
              </p>
              <button
                onClick={generarPDF}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Download className="h-4 w-4" /> Descargar informe PDF
              </button>
            </Section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
