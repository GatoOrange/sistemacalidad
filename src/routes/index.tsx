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

function estimarCaracterizacion(p: Proyecto, e: EsterInfo): Caracterizacion {
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
  // Referencia al éster para silenciar warning de variable no usada.
  void e;
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
      ventajas: "Biodegradabilidad reduce impacto ambiental en c