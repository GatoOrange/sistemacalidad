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
  FileText,
  Settings2,
  TrendingUp,
  Target,
  ClipboardList,
  ScrollText,
  BrainCircuit,
  Shuffle,
} from "lucide-react";
import EsterMolecule3D from "../components/EsterMolecule3D";
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
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { generatePredictions } from "@/lib/predictions";
import type { PrediccionOutput } from "@/lib/predictions";
import jsPDF from "jspdf";

// ====================================================================
// FASE 1 — Variables del proceso (toda la información como variables)
// ====================================================================

type Proyecto = {
  // Materia prima
  tipoAceite: string;
  origenAceite: string;
  acidez: string; // mg KOH/g
  densidadAceite: string; // g/mL
  humedadAceite: string; // %
  saponificacion: string; // mg KOH/g
  yodo: string; // g I2/100 g
  perfilAG: string;
  ph: string;

  // Alcohol
  alcoholNombre: string;
  alcoholFormula: string;
  alcoholPureza: string; // %
  relacionMolar: string; // aceite:alcohol -> ej "1:6"
  funcionAlcohol: string;

  // Catalizador básico
  catBasicoNombre: string;
  catBasicoConcentracion: string; // %
  catBasicoCantidad: string; // g o % p/p del aceite
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
  temperatura: string; // °C
  tiempoReaccion: string; // min
  agitacion: string; // rpm
  presion: string; // atm o kPa
  rendimiento: string; // %
  conversion: string; // %
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
  ph: "",
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
  if (key === "metanol")
    base.push("Producto trazable a metanol fósil; toxicidad del alcohol residual.");
  if (key === "etanol")
    base.push(
      "Cinética más lenta y separación glicerol/éster más compleja por mayor mutua solubilidad.",
    );
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
  const aceite = p.tipoAceite.toLowerCase();

  /* Oil-type classification for property estimation */
  let saturacion = "media";
  let perfilOx = "4–8 h @110 °C";
  let rangoNube = "-3 a +6 °C";
  let rangoFluidez = "-10 a 0 °C";
  let rangoDensidad = [870, 890];
  let rangoViscosidad = [3.5, 5.0];
  if (aceite.includes("palma")) {
    saturacion = "alta";
    perfilOx = "6–12 h @110 °C";
    rangoNube = "+8 a +12 °C";
    rangoFluidez = "+2 a +6 °C";
    rangoDensidad = [870, 880];
    rangoViscosidad = [4.0, 5.5];
  } else if (aceite.includes("soja") || aceite.includes("soya")) {
    saturacion = "baja";
    perfilOx = "2–5 h @110 °C";
    rangoNube = "-5 a 0 °C";
    rangoFluidez = "-12 a -3 °C";
    rangoDensidad = [875, 890];
    rangoViscosidad = [3.5, 4.8];
  } else if (aceite.includes("colza") || aceite.includes("canola")) {
    saturacion = "baja";
    perfilOx = "3–6 h @110 °C";
    rangoNube = "-6 a -2 °C";
    rangoFluidez = "-15 a -5 °C";
    rangoDensidad = [870, 885];
    rangoViscosidad = [4.0, 5.2];
  } else if (aceite.includes("girasol")) {
    saturacion = "baja";
    perfilOx = "1–4 h @110 °C";
    rangoNube = "-4 a +1 °C";
    rangoFluidez = "-10 a -2 °C";
    rangoDensidad = [875, 890];
    rangoViscosidad = [3.5, 4.5];
  } else {
    /* WCO / generic */
    saturacion = "media";
    perfilOx = "3–7 h @110 °C";
    rangoNube = "-3 a +6 °C";
    rangoFluidez = "-10 a 0 °C";
    rangoDensidad = [875, 890];
    rangoViscosidad = [3.5, 5.0];
  }

  /* Alcohol chain adjustments */
  const densidadDisplay = `${rangoDensidad[0] - carbono * 2}–${rangoDensidad[1] - carbono} kg/m³`;
  const viscosidadDisplay = `${(rangoViscosidad[0] + carbono * 0.3).toFixed(1)}–${(rangoViscosidad[1] + carbono * 0.5).toFixed(1)} cSt @40 °C`;
  const inflamacionDisplay = carbono <= 1 ? "≥130 °C" : carbono === 2 ? "≥160 °C" : "≥170 °C";
  const calorDisplay = carbono <= 1 ? "37–40 MJ/kg" : carbono === 2 ? "38–41 MJ/kg" : "39–42 MJ/kg";
  const estabilidadDisplay = `${perfilOx} (perfil ${saturacion} en insaturados)`;

  return {
    fisicas: [
      {
        propiedad: "Apariencia",
        valor: "Líquido transparente, libre de partículas",
        metodo: "Visual / ISO 2049",
      },
      {
        propiedad: "Color",
        valor: "Amarillo claro a ámbar (escala ASTM 1.0–3.0)",
        metodo: "ASTM D1500",
      },
      { propiedad: "Olor", valor: "Característico, suave a éster graso", metodo: "Sensorial" },
      { propiedad: "Densidad (15 °C)", valor: densidadDisplay, metodo: "ASTM D4052 / EN ISO 12185" },
      { propiedad: "Viscosidad cinemática", valor: viscosidadDisplay, metodo: "ASTM D445 / EN ISO 3104" },
      { propiedad: "Punto de inflamación", valor: inflamacionDisplay, metodo: "ASTM D93 (PMcc)" },
      {
        propiedad: "Punto de nube",
        valor: `${rangoNube} (perfil ${saturacion})`,
        metodo: "ASTM D2500",
      },
      { propiedad: "Punto de fluidez", valor: rangoFluidez, metodo: "ASTM D97" },
      {
        propiedad: "Conductividad eléctrica",
        valor: "<100 pS/m (alta resistividad)",
        metodo: "ASTM D2624",
      },
      {
        propiedad: "Solubilidad",
        valor: "Miscible en hidrocarburos, alcoholes; insoluble en agua",
        metodo: "Cualitativa",
      },
      {
        propiedad: "Volatilidad",
        valor: "Baja (presión de vapor <0.1 kPa @20 °C)",
        metodo: "ASTM D2879",
      },
      { propiedad: "Poder calorífico", valor: calorDisplay, metodo: "ASTM D240" },
    ],
    quimicas: [
      {
        propiedad: "Estabilidad oxidativa (Rancimat)",
        valor: estabilidadDisplay,
        metodo: "EN 14112",
      },
      {
        propiedad: "Polaridad",
        valor: "Polaridad intermedia (logP 7–10)",
        metodo: "Estimación QSPR",
      },
      {
        propiedad: "Índice de acidez",
        valor: "<0.5 mg KOH/g (producto purificado)",
        metodo: "EN 14104",
      },
      {
        propiedad: "Compatibilidad con materiales",
        valor: "Acero inoxidable y aluminio: alta. Cobre/zinc: media. Elastómeros NBR: baja",
        metodo: "ASTM D471",
      },
      {
        propiedad: "Poder solvente (KB)",
        valor: "55–75 (similar a solventes oxigenados verdes)",
        metodo: "ASTM D1133",
      },
      {
        propiedad: "Reactividad química",
        valor: "Susceptible a hidrólisis básica y oxidación por radicales libres",
        metodo: "Cinética química",
      },
      { propiedad: "Biodegradabilidad", valor: ">90% en 28 días", metodo: "OECD 301B" },
      {
        propiedad: "Toxicidad potencial",
        valor: "Baja (LD50 oral rata >5000 mg/kg)",
        metodo: "OECD 423",
      },
      { propiedad: "Contenido energético estimado", valor: calorDisplay, metodo: "Bomba calorimétrica" },
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

  const mejorOSim: "Mejor" | "Similar" | "Inferior" = esLargo
    ? "Mejor"
    : esEtilico
      ? "Similar"
      : "Similar";

  return [
    {
      propiedad: "Conductividad eléctrica",
      productoValor: "<100 pS/m",
      biodieselValor: "<200 pS/m",
      juicio: esMetilico ? "Similar" : "Mejor",
      motivo:
        "Las cadenas alquílicas más largas reducen la movilidad iónica y aumentan la resistividad del fluido.",
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
      motivo:
        "Mayor polaridad y momento dipolar incrementan el poder solvente frente a residuos orgánicos.",
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
      productoValor: esLargo
        ? "Alto (solvente/lubricante verde)"
        : esEtilico
          ? "Alto (100% renovable)"
          : "Medio",
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
      justificacion:
        "Cumple parámetros generales de FAME/FAEE; reemplazo parcial del diésel fósil.",
      ventajas: "Mercado consolidado, marco normativo claro (EN 14214 / ASTM D6751).",
      limitaciones: "Margen ajustado y competencia con biodiésel industrial.",
      potencial: esMetilico ? "Alto" : "Medio",
      score: esMetilico ? 85 : 65,
    },
    {
      nombre: "Solventes industriales verdes",
      justificacion:
        "Polaridad intermedia y alto KB permiten reemplazar xileno, MEK y solventes clorados.",
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
      justificacion:
        "Plataforma para alcoholes grasos, aminas grasas, amidas, sulfonatos y tensoactivos.",
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

type SelectOption = { label: string; value: string };

const OTHER_VALUE = "__other__";

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  unit?: string;
  type?: "text" | "number" | "textarea" | "select";
  options?: SelectOption[];
};

function Field({ label, value, onChange, placeholder, unit, type = "text", options }: FieldProps) {
  const inputCls =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none";

  const labelEl = (
    <span className="font-heading text-[10px] font-semibold uppercase tracking-wider text-foreground">
      {label}
      {unit ? <span className="ml-1.5 font-normal text-muted-foreground">({unit})</span> : null}
    </span>
  );

  if (type === "select" && options) {
    const isOther = value && !options.some((o) => o.value === value);
    return (
      <label className="flex flex-col gap-1.5">
        {labelEl}
        <select
          value={isOther ? OTHER_VALUE : value || ""}
          onChange={(e) => {
            if (e.target.value !== OTHER_VALUE) onChange(e.target.value);
          }}
          className={`${inputCls} appearance-none bg-no-repeat pr-8`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundPosition: "right 10px center",
          }}
        >
          <option value="" disabled>
            Seleccionar...
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          <option value={OTHER_VALUE}>— Otro (especificar) —</option>
        </select>
        {isOther && (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Escriba el valor personalizado..."
            className={`${inputCls} mt-1`}
            autoFocus
          />
        )}
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1.5">
      {labelEl}
      {type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`${inputCls} resize-y`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
      )}
    </label>
  );
}

function Section({
  title,
  icon: Icon,
  description,
  step,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  step?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
      <div className="p-5">
        <div className="mb-1 flex items-center gap-2">
          {step && (
            <span className="inline-flex items-center rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary font-heading">
              {step}
            </span>
          )}
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary shrink-0">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <h2 className="font-heading text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
        <div className={description || step ? "mt-4" : "mt-3"}>{children}</div>
      </div>
    </div>
  );
}

function Badge({
  tone,
  children,
  className,
}: {
  tone: "ok" | "warn" | "bad" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  const map = {
    ok: "text-success bg-success/10 border-success/25",
    warn: "text-warning bg-warning/10 border-warning/25",
    bad: "text-destructive bg-destructive/10 border-destructive/25",
    info: "text-primary bg-primary/10 border-primary/25",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${map[tone]} ${className || ""}`}
    >
      {children}
    </span>
  );
}

// ====================================================================
// Componente principal
// ====================================================================

const INPUT_STEPS = ["materia", "reactivos", "proceso"] as const;
const OUTPUT_TABS = ["analisis", "predicciones", "comparacion", "mercado", "informe"] as const;
type InputStep = (typeof INPUT_STEPS)[number];

export default function PlataformaOleoquimica() {
  const [dark, setDark] = useState(true);
  const [tab, setTab] = useState("materia");
  const [p, setP] = useState<Proyecto>(initial);
  const [completedSteps, setCompletedSteps] = useState<Set<InputStep>>(new Set());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const gridStroke = dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
  const gridTick = dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";

  const set =
    <K extends keyof Proyecto>(k: K) =>
    (v: string) =>
      setP((s) => ({ ...s, [k]: v }));

  const isInputTab = INPUT_STEPS.includes(tab as InputStep);
  const currentStepIndex = INPUT_STEPS.indexOf(tab as InputStep);

  const goNext = () => {
    if (currentStepIndex < INPUT_STEPS.length - 1) {
      setCompletedSteps((prev) => new Set(prev).add(tab as InputStep));
      setTab(INPUT_STEPS[currentStepIndex + 1]);
    } else {
      setCompletedSteps((prev) => new Set(prev).add(tab as InputStep));
      setTab("analisis");
    }
  };

  const goPrev = () => {
    if (currentStepIndex > 0) {
      setTab(INPUT_STEPS[currentStepIndex - 1]);
    }
  };

  const stepLabel: Record<InputStep, string> = {
    materia: "Materia prima",
    reactivos: "Reactivos",
    proceso: "Proceso",
  };

  const ester = useMemo(() => inferirEster(p), [p]);
  const carac = useMemo(() => estimarCaracterizacion(p, ester), [p, ester]);
  const comparativa = useMemo(() => compararContraBiodiesel(p), [p]);
  const { nichos, recomendado } = useMemo(() => evaluarNichos(p), [p]);

  const prediccion: PrediccionOutput = useMemo(
    () =>
      generatePredictions(
        p.tipoAceite,
        p.acidez,
        p.densidadAceite,
        p.humedadAceite,
        p.alcoholNombre,
        p.relacionMolar,
        p.temperatura,
        p.tiempoReaccion,
        p.agitacion,
        p.rendimiento,
        p.conversion,
      ),
    [p],
  );

  const dataComparacionGrafica = useMemo(
    () =>
      prediccion.parametros.map((param) => ({
        nombre: param.parametro,
        Predicción: param.valorPredicho,
        Biodiésel: param.biodieselReferencia,
      })),
    [prediccion],
  );

  const cumpleNorma = (param: PrediccionParametro): boolean => {
    const v = param.valorPredicho;
    switch (param.parametro) {
      case "Densidad":
        return v >= 860 && v <= 900;
      case "Viscosidad cinemática":
        return v >= 3.5 && v <= 5.5;
      case "Punto de inflamación":
        return v >= 120;
      case "Poder calorífico":
        return v >= 37;
      default:
        return v >= param.biodieselReferencia * 0.9;
    }
  };

  const compatStats = useMemo(() => {
    const total = comparativa.length;
    const mejores = comparativa.filter((c) => c.juicio === "Mejor").length;
    const similares = comparativa.filter((c) => c.juicio === "Similar").length;
    const inferiores = comparativa.filter((c) => c.juicio === "Inferior").length;
    const score = total > 0 ? Math.round((mejores * 100 + similares * 70 + inferiores * 40) / total) : 0;
    const nivel = score >= 80 ? "APTA" : score >= 55 ? "CONDICIONADA" : "NO APTA";
    const color: "ok" | "warn" | "bad" = score >= 80 ? "ok" : score >= 55 ? "warn" : "bad";
    return { total, mejores, similares, inferiores, score, nivel, color };
  }, [comparativa]);

  const fortalezas = useMemo(
    () => comparativa.filter((c) => c.juicio === "Mejor"),
    [comparativa],
  );
  const debilidades = useMemo(
    () => comparativa.filter((c) => c.juicio === "Inferior"),
    [comparativa],
  );

  const efectoAlcohol = useMemo(() => {
    const { key } = normalizeAlcohol(p.alcoholNombre);
    switch (key) {
      case "metanol":
        return "El metanol produce ésteres metílicos (FAME) de cadena corta. Esto confiere menor viscosidad y mejor comportamiento en combustión fría, pero reduce el poder calorífico y la estabilidad oxidativa frente a ésteres superiores. Es la opción más documentada y de menor costo.";
      case "etanol":
        return "El etanol genera ésteres etílicos (FAEE) con un carbono adicional. Esto mejora ligeramente el poder calorífico y la lubricidad respecto a los FAME, aunque incrementa la viscosidad y puede requerir ajustes en el proceso de purificación por la formación de azeótropos.";
      case "isopropanol":
        return "El isopropanol produce ésteres isopropílicos (FAIPE) de cadena ramificada. La ramificación mejora la estabilidad oxidativa y reduce el punto de enturbiamiento, resultando en mejor desempeño en frío, aunque con mayor viscosidad y menor volatilidad.";
      case "butanol":
        return "El butanol genera ésteres butílicos (FABE) de cadena larga, ofreciendo el mayor poder calorífico y la mejor estabilidad oxidativa entre los alcoholes comunes. Contrapartida: mayor viscosidad y punto de inflamación, lo que puede limitar su uso en motores diésel convencionales sin ajustes.";
      default:
        return "Seleccione un alcohol para ver su impacto en las propiedades del biocombustible.";
    }
  }, [p.alcoholNombre]);

  const recomendacionEstrategica = useMemo(() => {
    const { mejores, similares, inferiores, score } = compatStats;
    const { key } = normalizeAlcohol(p.alcoholNombre);
    const partes: string[] = [];

    if (score >= 80) {
      partes.push("El producto presenta alta compatibilidad con el biodiésel FAME-NaOH convencional.");
    } else if (score >= 55) {
      partes.push("El producto es parcialmente compatible con el biodiésel FAME-NaOH convencional y resulta viable con ajustes específicos.");
    } else {
      partes.push("El producto presenta diferencias significativas frente al biodiésel FAME-NaOH convencional y se recomienda para aplicaciones especializadas fuera del mercado de combustibles para automoción.");
    }

    if (mejores > 0) {
      const tops = comparativa.filter((c) => c.juicio === "Mejor").slice(0, 2).map((c) => c.propiedad.toLowerCase());
      partes.push(`Sus principales ventajas son ${tops.join(" y ")}, que lo posicionan favorablemente en nichos donde estas propiedades sean críticas.`);
    }

    if (inferiores > 0) {
      const peors = comparativa.filter((c) => c.juicio === "Inferior").slice(0, 2).map((c) => c.propiedad.toLowerCase());
      const mejora = key === "metanol" || key === "etanol"
        ? "Se recomienda evaluar el uso de alcoholes superiores, aditivos antioxidantes (BHT/TBHQ) y optimizar las condiciones de purificación."
        : "Se recomienda ajustar las condiciones de reacción y purificación para mitigar estas diferencias.";
      partes.push(`Las áreas que requieren atención son ${peors.join(" y ")}. ${mejora}`);
    }

    return partes.join(" ");
  }, [comparativa, compatStats, p.alcoholNombre]);

  const dataRadar = useMemo(() => {
    const { key, carbono } = normalizeAlcohol(p.alcoholNombre);
    const aceite = p.tipoAceite.toLowerCase();
    const esSaturado = aceite.includes("palma");
    const esInsaturado = aceite.includes("soja") || aceite.includes("girasol");

    // Cada eje escalado 0–100 según el alcohol y el aceite
    const solvencia = carbono >= 5 ? 93 : carbono >= 4 ? 90 : carbono >= 3 ? 86 : carbono === 2 ? 80 : 72;
    const biodegradabilidad = esInsaturado ? 96 : carbono <= 2 ? 94 : 88;
    const lubricidad = Math.min(98, 68 + carbono * 4);
    const estabOx =
      esSaturado ? 85
      : key === "butanol" || key === "pentanol" ? 82
      : key === "isopropanol" || carbono >= 5 ? 78
      : key === "etanol" ? 62
      : 52;
    const energia = Math.min(98, 62 + carbono * 4);
    const seguridad = carbono >= 4 ? 93 : carbono >= 3 ? 88 : carbono === 2 ? 82 : 72;

    return [
      { eje: "Solvencia", v: solvencia },
      { eje: "Biodegradab.", v: biodegradabilidad },
      { eje: "Lubricidad", v: lubricidad },
      { eje: "Estab. ox.", v: estabOx },
      { eje: "Energía", v: energia },
      { eje: "Seguridad", v: seguridad },
    ];
  }, [p.alcoholNombre, p.tipoAceite]);

  const dataNichos = useMemo(
    () => nichos.map((n) => ({ nombre: n.nombre.split(" ")[0], score: n.score })),
    [nichos],
  );

  // ============== Generador de datos aleatorios con coherencia interna ==============
  const rellenarDatos = () => {
    const rand = (min: number, max: number, decimals = 1) =>
      (Math.random() * (max - min) + min).toFixed(decimals);
    const elegir = <T,>(...opts: T[]) => opts[Math.floor(Math.random() * opts.length)];

    // Perfiles de aceite con valores típicos reales (literatura)
    type PerfilAceite = {
      nombre: string;
      acidez: [number, number];
      densidad: [number, number];
      humedad: [number, number];
      saponificacion: [number, number];
      yodo: [number, number];
      perfilAG: string;
      origen: string;
    };

    const perfiles: PerfilAceite[] = [
      {
        nombre: "Aceite de cocina usado (mezcla)",
        acidez: [1.8, 5.0],
        densidad: [0.908, 0.925],
        humedad: [0.05, 0.50],
        saponificacion: [180, 200],
        yodo: [70, 120],
        perfilAG: "C16:0=20%, C18:0=5%, C18:1=42%, C18:2=28%, C18:3=3%, otros=2%",
        origen: elegir("Recolección urbana", "Restaurantes", "Hogares", "Industria alimentaria"),
      },
      {
        nombre: "Aceite de palma (Elaeis guineensis)",
        acidez: [0.5, 2.0],
        densidad: [0.908, 0.915],
        humedad: [0.01, 0.15],
        saponificacion: [196, 210],
        yodo: [50, 55],
        perfilAG: "C16:0=44%, C18:0=4%, C18:1=39%, C18:2=10%, otros=3%",
        origen: "Industria alimentaria",
      },
      {
        nombre: "Aceite de soja (Glycine max)",
        acidez: [0.3, 1.5],
        densidad: [0.910, 0.925],
        humedad: [0.01, 0.10],
        saponificacion: [189, 195],
        yodo: [120, 143],
        perfilAG: "C16:0=11%, C18:0=4%, C18:1=24%, C18:2=53%, C18:3=8%",
        origen: "Industria alimentaria",
      },
      {
        nombre: "Aceite de colza (Brassica napus)",
        acidez: [0.3, 1.2],
        densidad: [0.910, 0.920],
        humedad: [0.02, 0.15],
        saponificacion: [170, 180],
        yodo: [110, 126],
        perfilAG: "C16:0=4%, C18:0=2%, C18:1=62%, C18:2=22%, C18:3=10%",
        origen: "Industria alimentaria",
      },
      {
        nombre: "Aceite de girasol (Helianthus annuus)",
        acidez: [0.3, 1.0],
        densidad: [0.918, 0.925],
        humedad: [0.01, 0.08],
        saponificacion: [188, 194],
        yodo: [118, 144],
        perfilAG: "C16:0=6%, C18:0=4%, C18:1=28%, C18:2=62%",
        origen: "Restaurantes",
      },
    ];

    const pAceite = elegir(...perfiles);
    const temp = elegir(50, 55, 60, 65, 70);
    const tiempo = elegir(30, 45, 60, 90, 120);
    const mol = elegir("1:6", "1:9", "1:12");
    const alcohol = elegir("Metanol", "Etanol", "Isopropanol", "Butanol", "Propanol", "Pentanol", "Hexanol", "Octanol");
    const cat = elegir("NaOH", "KOH", "CH₃ONa", "CH₃OK", "C₂H₅ONa", "C₂H₅OK");

    const acidNum = parseFloat(rand(...pAceite.acidez, 1));
    const necesitaEsterif = acidNum > 2;

    setP({
      tipoAceite: pAceite.nombre,
      origenAceite: pAceite.origen,
      acidez: acidNum.toFixed(1),
      densidadAceite: rand(...pAceite.densidad, 3),
      humedadAceite: rand(...pAceite.humedad, 2),
      saponificacion: rand(...pAceite.saponificacion, 0),
      yodo: rand(...pAceite.yodo, 0),
      perfilAG: pAceite.perfilAG,
      ph: elegir("", rand(4.5, 6.5, 1)),
      alcoholNombre: alcohol,
      alcoholFormula: "",
      alcoholPureza: rand(96, 99.9, 1),
      relacionMolar: mol,
      funcionAlcohol: "Agente de transesterificación; dona el grupo alquilo",
      catBasicoNombre: cat,
      catBasicoConcentracion: rand(0.5, 1.5, 1),
      catBasicoCantidad: rand(0.5, 1.5, 2),
      catBasicoJustificacion: elegir(
        "Alta actividad catalítica a baja concentración — rendimiento >95% reportado",
        "Buena solubilidad en el alcohol y bajo costo operativo",
        "Selectividad superior hacia la formación del éster deseado",
        "Ampliamente documentado en la literatura para este tipo de alcohol",
      ),
      catAcidoNombre: necesitaEsterif ? elegir("H₂SO₄", "HCl", "H₃PO₄", "p-TSA") : "",
      catAcidoConcentracion: necesitaEsterif ? elegir("1% p/p", "2% p/p", "5% p/p") : "",
      catAcidoCantidad: necesitaEsterif ? rand(0.5, 3.0, 1) : "",
      catAcidoJustificacion: necesitaEsterif
        ? "Reduce ácidos grasos libres antes de la transesterificación básica — evita saponificación"
        : "",
      metCaracterizacion: elegir(
        "Titulación ácido-base (AOAC Cd 3d-63) + FTIR",
        "Espectroscopía FTIR y cromatografía GC-FID",
        "RMN ¹H y ¹³C para perfil de ácidos grasos",
      ),
      metEsterificacion: necesitaEsterif
        ? `Esterificación con ${pAceite.nombre.includes("usado") ? "H₂SO₄ 2% a 60 °C por 60 min" : "H₂SO₄ 1% a 55 °C por 45 min"}`
        : "No aplica — acidez inicial <1 mg KOH/g",
      metTransesterificacion: elegir(
        `Transesterificación alcalina con ${cat} a ${temp} °C y agitación`,
        `Transesterificación con catálisis básica a ${temp} °C y reflujo por ${tiempo} min`,
        "Transesterificación asistida por ultrasonido a 50 °C — reduce tiempo de reacción",
      ),
      metLavado: elegir(
        "Lavado con agua destilada (3 × 30 mL)",
        "Lavado con HCl 0.1 M + agua destilada hasta pH neutro",
      ),
      metSecado: elegir(
        "Secado con Na₂SO₄ anhidro + 24 h a 60 °C",
        "Secado al vacío a 70 °C por 2 h — humedad residual <0.02%",
      ),
      metPurificacion: elegir(
        "Destilación fraccionada a presión reducida (10 mbar)",
        "Cromatografía en columna de sílice (gel 60, hexano:acetato 95:5)",
        "Filtración por membrana 0.45 µm + centrifugación a 4000 rpm",
      ),
      metProductoFinal: elegir(
        "GC-FID para perfil de ésteres, FTIR para confirmación de grupos funcionales",
        "RMN ¹H y ¹³C para elucidación estructural completa",
      ),
      temperatura: String(temp),
      tiempoReaccion: String(tiempo),
      agitacion: rand(300, 900, 0),
      presion: elegir("1 atm", "Presión atmosférica", "Vacío parcial"),
      rendimiento: rand(necesitaEsterif ? 70 : 80, 97, 1),
      conversion: rand(necesitaEsterif ? 75 : 85, 99, 1),
    });
  };

  const generarPDF = async () => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });

    // Cargar fuente Calibri desde los archivos en public/fonts/
    try {
      const [calibri, calibrib, calibrii] = await Promise.all([
        fetch("/fonts/calibri.ttf").then((r) => r.arrayBuffer()),
        fetch("/fonts/calibrib.ttf").then((r) => r.arrayBuffer()),
        fetch("/fonts/calibrii.ttf").then((r) => r.arrayBuffer()),
      ]);
      doc.addFileToVFS(
        "calibri.ttf",
        new Uint8Array(calibri).reduce((s, b) => s + String.fromCharCode(b), ""),
      );
      doc.addFileToVFS(
        "calibrib.ttf",
        new Uint8Array(calibrib).reduce((s, b) => s + String.fromCharCode(b), ""),
      );
      doc.addFileToVFS(
        "calibrii.ttf",
        new Uint8Array(calibrii).reduce((s, b) => s + String.fromCharCode(b), ""),
      );
      doc.addFont("calibri.ttf", "Calibri", "normal");
      doc.addFont("calibrib.ttf", "Calibri", "bold");
      doc.addFont("calibrii.ttf", "Calibri", "italic");
    } catch {
      // Fallback a Helvetica si no carga Calibri
      console.warn("No se pudo cargar Calibri, usando Helvetica");
    }

    // Configuración de fuente según GC-F-005
    const font = "Calibri";
    const sizeNormal = 12;
    const sizeH1 = 14;
    const sizePortada = 16;
    const naranja: [number, number, number] = [255, 102, 0];
    const M = 50;
    const W = 612 - 2 * M;
    let y = M;

    const h1 = (t: string) => {
      if (y > 720) {
        doc.addPage();
        y = M;
      }
      doc.setFont(font, "bold");
      doc.setFontSize(sizeH1);
      doc.setTextColor(...naranja);
      doc.text(t, M, y);
      y += 20;
      doc.setTextColor(0);
    };

    const h2 = (t: string) => {
      if (y > 730) {
        doc.addPage();
        y = M;
      }
      doc.setFont(font, "bold");
      doc.setFontSize(sizeNormal);
      doc.setTextColor(...naranja);
      doc.text(t, M, y);
      y += 16;
      doc.setTextColor(0);
    };

    const para = (t: string) => {
      doc.setFont(font, "normal");
      doc.setFontSize(sizeNormal);
      doc.setTextColor(0);
      const lines = doc.splitTextToSize(t || "—", W);
      lines.forEach((ln: string) => {
        if (y > 750) {
          doc.addPage();
          y = M;
        }
        doc.text(ln, M, y, { align: "justify" });
        y += 15;
      });
      y += 4;
    };

    const item = (k: string, v?: string) => {
      if (v) para(`• ${k}: ${v}`);
    };

    // ==================== PORTADA ====================
    doc.setFont(font, "bold");
    doc.setFontSize(sizePortada);
    doc.setTextColor(...naranja);
    doc.text("INFORME TÉCNICO", M, y);
    y += 22;
    doc.setFontSize(sizeH1);
    doc.setTextColor(0);
    doc.text(`Obtención y caracterización de ${ester.tipo} (${ester.abreviatura})`, M, y);
    y += 18;
    doc.setFont(font, "normal");
    doc.setFontSize(sizeNormal);
    doc.text(`a partir de ${p.tipoAceite || "aceite residual de cocina"}`, M, y);
    y += 22;
    doc.setDrawColor(...naranja);
    doc.setLineWidth(1);
    doc.line(M, y, 612 - M, y);
    y += 16;
    doc.setFontSize(11);
    doc.text(`Producto: ${ester.tipo} (${ester.abreviatura})`, M, y);
    y += 14;
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, M, y);
    y += 30;

    // ==================== 1. IDENTIFICACIÓN DEL ÉSTER ====================
    h1("1. Identificación del éster monoalquílico");

    h2("1.1 Materias primas empleadas");
    para(
      `Se utilizó como materia prima ${p.tipoAceite || "aceite residual de cocina"}${p.origenAceite ? ` de origen ${p.origenAceite}` : ""}, ` +
        `con un índice de acidez de ${p.acidez || "—"} mg KOH/g, densidad de ${p.densidadAceite || "—"} g/mL ` +
        `y contenido de humedad de ${p.humedadAceite || "—"}%. ` +
        `${p.perfilAG ? `Su perfil de ácidos grasos corresponde a ${p.perfilAG}. ` : ""}` +
        `Como alcohol se empleó ${p.alcoholNombre || "el alcohol seleccionado"} (${p.alcoholFormula || "—"}, pureza ${p.alcoholPureza || "—"}%) ` +
        `en una relación molar aceite:alcohol de ${p.relacionMolar || "—"}, y como catalizador básico se utilizó ${p.catBasicoNombre || "—"} ` +
        `${p.catBasicoConcentracion ? `al ${p.catBasicoConcentracion}` : ""}. ` +
        `${p.catAcidoNombre ? `Se realizó una esterificación ácida previa con ${p.catAcidoNombre} ${p.catAcidoConcentracion ? `al ${p.catAcidoConcentracion}` : ""}. ` : ""}` +
        `El proceso se llevó a cabo a ${p.temperatura || "—"} °C durante ${p.tiempoReaccion || "—"} min ` +
        `con agitación de ${p.agitacion || "—"} rpm, alcanzando un rendimiento de ${p.rendimiento || "—"}% ` +
        `y una conversión de ${p.conversion || "—"}%.`,
    );

    h2("1.2 Identificación química");
    para(
      `El producto obtenido corresponde a un éster de la familia ${ester.familia || "de los monoalquílicos"}. ` +
        `Su estructura química se describe como: ${ester.estructura || "—"}. ` +
        `El mecanismo de formación predominante es ${ester.mecanismo || "la transesterificación alcalina"}. ` +
        `La selección de ${p.alcoholNombre || "alcohol"} influye en ${ester.influenciaAlcohol || "la longitud de la cadena alquílica del éster"}, ` +
        `mientras que ${p.catBasicoNombre || "el catalizador"} determina ${ester.influenciaCatalizador || "la velocidad y selectividad de la reacción"}.`,
    );

    h2("1.3 Caracterización fisicoquímica");
    para(
      "A continuación se presentan las propiedades físicas y químicas determinadas experimentalmente:",
    );
    para("Propiedades físicas:");
    carac.fisicas.forEach((f) => para(`  • ${f.propiedad}: ${f.valor} (método: ${f.metodo})`));
    para("Propiedades químicas:");
    carac.quimicas.forEach((q) => para(`  • ${q.propiedad}: ${q.valor} (método: ${q.metodo})`));

    // ==================== 2. CARACTERIZACIÓN COMPARATIVA ====================
    h1("2. Caracterización comparativa con biodiésel convencional");

    h2("2.1 Comparación propiedad por propiedad");
    para(
      `Se compararon las propiedades del ${ester.abreviatura || "producto obtenido"} frente al biodiésel convencional FAME-NaOH. ` +
        `Los resultados se resumen a continuación:`,
    );
    comparativa.forEach((c) =>
      para(
        `• ${c.propiedad}: el producto presenta un valor de ${c.productoValor}, frente a ${c.biodieselValor} del biodiésel de referencia. ` +
          `El análisis comparativo indica que ${c.juicio.toLowerCase()}, debido a que ${c.motivo?.toLowerCase() || "las condiciones de proceso evaluadas así lo determinan"}.`,
      ),
    );

    h2("2.2 Ventajas y limitaciones del producto");
    para("El éster obtenido presenta las siguientes ventajas frente al biodiésel convencional:");
    ester.ventajas.forEach((v) => para(`  • ${v}`));
    para(
      "Asimismo, se identifican las siguientes limitaciones que deben considerarse para su aplicación:",
    );
    ester.limitaciones.forEach((v) => para(`  • ${v}`));

    h2("2.3 Predicciones del sistema");
    para(
      `El modelo de predicción estimó un rendimiento de ${prediccion.resumen.rendimiento}%, ` +
        `una conversión de ${prediccion.resumen.conversion}% y una calidad global de ${prediccion.resumen.calidadGlobal}/100. ` +
        `La compatibilidad con biodiésel convencional se calculó en ${prediccion.biodieselCompatibilidad}%. ` +
        `En cuanto a los parámetros fisicoquímicos predichos:`,
    );
    prediccion.parametros.forEach((param) =>
      para(
        `  • ${param.parametro}: valor estimado ${param.valorPredicho} ${param.unidad} ` +
          `(referencia biodiésel: ${param.biodieselReferencia} ${param.unidad}, confianza: ${param.confianza}%). ${param.explicacion}`,
      ),
    );

    // ==================== 3. EVALUACIÓN DE MERCADO ====================
    h1("3. Evaluación de mercado y recomendación comercial");

    h2("3.1 Nichos de mercado identificados");
    para(
      "Se evaluaron los siguientes nichos de mercado potenciales para el éster obtenido, considerando sus propiedades fisicoquímicas y ventajas competitivas:",
    );
    nichos.forEach((n) =>
      para(
        `• ${n.nombre} (potencial: ${n.potencial}). ${n.justificacion} ` +
          `Ventajas en este nicho: ${n.ventajas}. Limitaciones: ${n.limitaciones}.`,
      ),
    );

    h2("3.2 Recomendación comercial");
    para(
      `Con base en el análisis multicriterio, se recomienda orientar el producto hacia el nicho de ${recomendado.nombre}, ` +
        `con una puntuación de ${recomendado.score}/100. ${recomendado.justificacion} ` +
        `Las ventajas competitivas que respaldan esta recomendación son: ${recomendado.ventajas}. ` +
        `Las limitaciones que deberán gestionarse incluyen: ${recomendado.limitaciones}.`,
    );

    // ==================== CONCLUSIONES ====================
    h1("Conclusiones");
    para(
      `El proceso evaluado permite obtener ${ester.tipo} (${ester.abreviatura}) con propiedades fisicoquímicas coherentes con la literatura oleoquímica. ` +
        `La combinación de ${p.tipoAceite || "aceite residual"} como materia prima, ${p.alcoholNombre || "alcohol seleccionado"} como agente de transesterificación ` +
        `y ${p.catBasicoNombre || "catalizador básico"} determina la estructura molecular del éster resultante, ` +
        `cuyas características lo posicionan como un producto viable más allá del biodiésel convencional. ` +
        `El análisis comparativo frente a FAME-NaOH evidencia que, si bien existen diferencias en parámetros específicos, ` +
        `el producto presenta ventajas significativas en los nichos de mercado identificados, particularmente en ${recomendado.nombre}. ` +
        `Se recomienda continuar con la optimización del proceso y la validación experimental de las predicciones generadas por el sistema.`,
    );

    // ==================== RECOMENDACIONES ====================
    h1("Recomendaciones");
    [
      "Reducir la acidez inicial por debajo de 1 mg KOH/g antes de la transesterificación básica para evitar reacciones de saponificación.",
      "Controlar la humedad por debajo de 0,05% a fin de minimizar la formación de jabones y emulsionantes no deseados.",
      "Optimizar la relación molar alcohol:aceite mediante diseño de experimentos por superficie de respuesta.",
      "Incorporar antioxidantes (TBHQ, pirogalol) para mejorar la estabilidad oxidativa del producto final.",
      "Evaluar procesos de refinación adicional según el nicho objetivo (cosmético, lubricante, solvente, etc.).",
      "Validar experimentalmente las predicciones generadas por el sistema para ajustar los modelos de estimación.",
    ].forEach((r) => para(`• ${r}`));

    // ==================== REFERENCIAS ====================
    h1("Referencias");
    [
      "Knothe, G., Van Gerpen, J., Krahl, J. (2010). The Biodiesel Handbook. AOCS Press.",
      "Demirbas, A. (2009). Biodiesel: A Realistic Fuel Alternative for Diesel Engines. Springer.",
      "Ma, F., Hanna, M. A. (1999). Biodiesel production: a review. Bioresource Technology 70(1), 1–15.",
      "Meher, L. C., Vidya Sagar, D., Naik, S. N. (2006). Technical aspects of biodiesel production by transesterification. Renewable & Sustainable Energy Reviews 10(3), 248–268.",
      "EN 14214; ASTM D6751; ISO 15380; OECD 301B.",
    ].forEach((r) => para(r));

    doc.save(`Informe_${ester.abreviatura}_${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-heading text-base font-bold leading-tight text-foreground">
                Plataforma Oleoquímica
              </h1>
              <p className="text-[11px] leading-tight text-muted-foreground">
                Sistema de predicción y análisis de ésteres monoalquílicos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDark((d) => !d)}
              className="rounded-md border border-border p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.95]"
              aria-label="Cambiar tema"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={rellenarDatos}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-[0.95]"
            >
              <Shuffle className="h-3.5 w-3.5" /> Datos aleatorios
            </button>
            <button
              onClick={generarPDF}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.95]"
            >
              <Download className="h-3.5 w-3.5" /> Informe PDF
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 relative z-10">
        {/* Stepper — pasos de entrada */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {INPUT_STEPS.map((step, i) => {
              const isComplete = completedSteps.has(step);
              const isCurrent = tab === step;
              return (
                <div key={step} className="flex flex-1 items-center">
                  <button
                    onClick={() => setTab(step)}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all ${
                        isComplete
                          ? "bg-primary text-primary-foreground"
                          : isCurrent
                            ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isComplete ? (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={`font-heading text-[11px] font-semibold leading-tight transition-colors ${
                        isCurrent || isComplete
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {stepLabel[step]}
                    </span>
                  </button>
                  {i < INPUT_STEPS.length - 1 && (
                    <div
                      className={`mx-3 mt-[-1.25rem] h-0.5 flex-1 rounded-full transition-all ${
                        completedSteps.has(INPUT_STEPS[i + 1])
                          ? "bg-primary"
                          : isComplete
                            ? "bg-gradient-to-r from-primary to-muted"
                            : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Separador + pestañas de resultados */}
          <div className="mt-6 flex items-center gap-6 border-t border-border pt-4">
            <span className="font-heading text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Resultados
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                { value: "analisis", icon: Atom, label: "Análisis" },
                { value: "predicciones", icon: BrainCircuit, label: "Predicciones" },
                { value: "comparacion", icon: TrendingUp, label: "Comparación" },
                { value: "mercado", icon: Target, label: "Mercado" },
                { value: "informe", icon: ScrollText, label: "Informe" },
              ].map(({ value, icon: Icon, label }) => {
                const isActive = tab === value;
                const isEnabled =
                  completedSteps.size === INPUT_STEPS.length || completedSteps.size > 0;
                return (
                  <button
                    key={value}
                    onClick={() => setTab(value)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          {/* ============ Materia prima ============ */}
          <TabsContent value="materia" className="mt-6 space-y-6">
            <Section
              title="Aceite residual de cocina"
              icon={Droplets}
              step="Paso 1"
              description="Seleccione o describa el aceite residual utilizado como materia prima para la producción del éster monoalquílico."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Tipo de aceite"
                  type="select"
                  value={p.tipoAceite}
                  onChange={set("tipoAceite")}
                  options={[
                    {
                      label: "Aceite de cocina usado — WCO (Waste Cooking Oil)",
                      value: "Aceite de cocina usado (WCO)",
                    },
                    {
                      label: "Aceite de palma (Elaeis guineensis)",
                      value: "Aceite de palma (Elaeis guineensis)",
                    },
                    {
                      label: "Aceite de soja (Glycine max)",
                      value: "Aceite de soja (Glycine max)",
                    },
                    {
                      label: "Aceite de colza (Brassica napus)",
                      value: "Aceite de colza (Brassica napus)",
                    },
                    {
                      label: "Aceite de girasol (Helianthus annuus)",
                      value: "Aceite de girasol (Helianthus annuus)",
                    },
                  ]}
                />
                <Field
                  label="Origen"
                  type="select"
                  value={p.origenAceite}
                  onChange={set("origenAceite")}
                  options={[
                    { label: "Recolección urbana (puntos limpios)", value: "Recolección urbana" },
                    {
                      label: "Industria alimentaria (frituras industriales)",
                      value: "Industria alimentaria",
                    },
                    { label: "Restaurantes y cocinas comerciales", value: "Restaurantes" },
                    { label: "Hogares (campañas de reciclaje)", value: "Hogares" },
                  ]}
                />
                <Field
                  label="Índice de acidez"
                  unit="mg KOH/g"
                  type="number"
                  value={p.acidez}
                  onChange={set("acidez")}
                  placeholder="0.5–5.0"
                />
                <Field
                  label="Densidad"
                  unit="g/mL"
                  type="number"
                  value={p.densidadAceite}
                  onChange={set("densidadAceite")}
                  placeholder="0.90–0.93"
                />
                <Field
                  label="Humedad"
                  unit="%"
                  type="number"
                  value={p.humedadAceite}
                  onChange={set("humedadAceite")}
                  placeholder="0.01–0.50"
                />
                <Field
                  label="Índice de saponificación"
                  unit="mg KOH/g"
                  type="number"
                  value={p.saponificacion}
                  onChange={set("saponificacion")}
                  placeholder="180–210"
                />
                <Field
                  label="Índice de yodo"
                  unit="g I₂/100 g"
                  type="number"
                  value={p.yodo}
                  onChange={set("yodo")}
                  placeholder="80–140"
                />
                <Field
                  label="Perfil de ácidos grasos"
                  type="select"
                  value={p.perfilAG}
                  onChange={set("perfilAG")}
                  options={[
                    {
                      label: "Palmítico 42%, Oleico 40%, Linoleico 10% (perfil saturado)",
                      value: "C16:0=42%, C18:1=40%, C18:2=10%",
                    },
                    {
                      label: "Palmítico 12%, Oleico 25%, Linoleico 53% (perfil poliinsaturado)",
                      value: "C16:0=12%, C18:1=25%, C18:2=53%",
                    },
                    {
                      label: "Oleico 62%, Linoleico 22%, Palmítico 6% (perfil monoinsaturado)",
                      value: "C18:1=62%, C18:2=22%, C16:0=6%",
                    },
                  ]}
                />
              </div>
            </Section>
            <div className="flex justify-end pt-2">
              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-heading font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97]"
              >
                Siguiente
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </TabsContent>

          {/* ============ Reactivos ============ */}
          <TabsContent value="reactivos" className="mt-6 space-y-6">
            <Section
              title="Alcohol de transesterificación"
              icon={Beaker}
              step="Paso 2"
              description="Seleccione el alcohol que actuará como donante del grupo alquilo en la formación del éster."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Nombre químico"
                  type="select"
                  value={p.alcoholNombre}
                  onChange={set("alcoholNombre")}
                  options={[
                    { label: "Metanol (CH₃OH) — metílicos", value: "Metanol" },
                    { label: "Etanol (C₂H₅OH) — etílicos", value: "Etanol" },
                    { label: "Isopropanol (C₃H₇OH) — isopropílicos", value: "Isopropanol" },
                    { label: "Butanol (C₄H₉OH) — butílicos", value: "Butanol" },
                  ]}
                />
                <Field
                  label="Fórmula química"
                  type="select"
                  value={p.alcoholFormula}
                  onChange={set("alcoholFormula")}
                  options={[
                    { label: "CH₃OH (metanol)", value: "CH₃OH" },
                    { label: "C₂H₅OH (etanol)", value: "C₂H₅OH" },
                    { label: "C₃H₇OH (isopropanol)", value: "C₃H₇OH" },
                    { label: "C₄H₉OH (butanol)", value: "C₄H₉OH" },
                  ]}
                />
                <Field
                  label="Pureza"
                  unit="%"
                  type="number"
                  value={p.alcoholPureza}
                  onChange={set("alcoholPureza")}
                  placeholder="95–99.9"
                />
                <Field
                  label="Relación molar aceite:alcohol"
                  type="select"
                  value={p.relacionMolar}
                  onChange={set("relacionMolar")}
                  options={[
                    { label: "1:6 — relación estequiométrica teórica", value: "1:6" },
                    { label: "1:9 — exceso moderado (recomendada)", value: "1:9" },
                    { label: "1:12 — exceso alto (mayor conversión)", value: "1:12" },
                    { label: "1:15 — exceso muy alto (casos especiales)", value: "1:15" },
                  ]}
                />
                <Field
                  label="Función dentro del producto final"
                  type="select"
                  value={p.funcionAlcohol}
                  onChange={set("funcionAlcohol")}
                  options={[
                    {
                      label: "Agente de transesterificación — dona el grupo alquilo al éster",
                      value: "Agente de transesterificación; dona el grupo alquilo",
                    },
                    {
                      label: "Reactante principal — define la cadena alquílica del éster",
                      value: "Reactante principal; define la cadena alquílica del éster",
                    },
                  ]}
                />
              </div>
            </Section>

            <Section title="Catalizador básico (transesterificación)" icon={FlaskConical}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Nombre químico"
                  type="select"
                  value={p.catBasicoNombre}
                  onChange={set("catBasicoNombre")}
                  options={[
                    { label: "NaOH (Hidróxido de sodio)", value: "NaOH" },
                    { label: "KOH (Hidróxido de potasio)", value: "KOH" },
                    { label: "CH₃ONa (Metóxido de sodio)", value: "CH₃ONa" },
                    { label: "CH₃OK (Metóxido de potasio)", value: "CH₃OK" },
                  ]}
                />
                <Field
                  label="Concentración"
                  unit="%"
                  type="number"
                  value={p.catBasicoConcentracion}
                  onChange={set("catBasicoConcentracion")}
                  placeholder="0.5–2.0"
                />
                <Field
                  label="Cantidad utilizada"
                  type="text"
                  value={p.catBasicoCantidad}
                  onChange={set("catBasicoCantidad")}
                  placeholder="Ej: 1% p/p del aceite"
                />
                <Field
                  label="Justificación de selección"
                  type="textarea"
                  value={p.catBasicoJustificacion}
                  onChange={set("catBasicoJustificacion")}
                  placeholder="Alta actividad, bajo costo, solubilidad en el alcohol..."
                />
              </div>
            </Section>

            <Section
              title="Catalizador ácido (esterificación previa)"
              icon={FlaskConical}
              description="Opcional — solo si el aceite tiene acidez superior a 1 mg KOH/g."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Nombre químico"
                  type="select"
                  value={p.catAcidoNombre}
                  onChange={set("catAcidoNombre")}
                  options={[
                    { label: "H₂SO₄ (Ácido sulfúrico)", value: "H₂SO₄" },
                    { label: "HCl (Ácido clorhídrico)", value: "HCl" },
                    { label: "H₃PO₄ (Ácido fosfórico)", value: "H₃PO₄" },
                    { label: "p-TSA (Ácido p-toluensulfónico)", value: "p-TSA" },
                  ]}
                />
                <Field
                  label="Concentración"
                  unit="%"
                  type="number"
                  value={p.catAcidoConcentracion}
                  onChange={set("catAcidoConcentracion")}
                  placeholder="1–5"
                />
                <Field
                  label="Cantidad utilizada"
                  type="text"
                  value={p.catAcidoCantidad}
                  onChange={set("catAcidoCantidad")}
                  placeholder="Ej: 2% p/p del aceite"
                />
                <Field
                  label="Justificación de selección"
                  type="textarea"
                  value={p.catAcidoJustificacion}
                  onChange={set("catAcidoJustificacion")}
                  placeholder="Reduce la acidez del aceite antes de la transesterificación básica..."
                />
              </div>
            </Section>
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={goPrev}
                className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2 text-sm font-heading font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.97]"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
                </svg>
                Anterior
              </button>
              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-heading font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97]"
              >
                Siguiente
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </TabsContent>

          {/* ============ Proceso ============ */}
          <TabsContent value="proceso" className="mt-6 space-y-6">
            <Section
              title="Metodología experimental"
              icon={ClipboardList}
              step="Paso 3"
              description="Describa las técnicas y procedimientos empleados en cada etapa del proceso de obtención del éster."
            >
              <div className="grid gap-4">
                <Field
                  label="Caracterización de materia prima"
                  type="textarea"
                  value={p.metCaracterizacion}
                  onChange={set("metCaracterizacion")}
                  placeholder="Ej: Titulación ácido-base (AOAC Cd 3d-63), FTIR, GC-FID..."
                />
                <Field
                  label="Esterificación ácida (si aplica)"
                  type="textarea"
                  value={p.metEsterificacion}
                  onChange={set("metEsterificacion")}
                  placeholder="Ej: H₂SO₄ 2% p/p, 60 °C, 60 min, agitación constante"
                />
                <Field
                  label="Transesterificación"
                  type="textarea"
                  value={p.metTransesterificacion}
                  onChange={set("metTransesterificacion")}
                  placeholder="Ej: Catálisis básica con NaOH, 60 °C, reflujo, 90 min"
                />
                <Field
                  label="Lavado"
                  type="textarea"
                  value={p.metLavado}
                  onChange={set("metLavado")}
                  placeholder="Ej: Lavado con agua destilada (3 × 30 mL) + HCl 0.1 M"
                />
                <Field
                  label="Secado"
                  type="textarea"
                  value={p.metSecado}
                  onChange={set("metSecado")}
                  placeholder="Ej: Na₂SO₄ anhidro + estufa a 60 °C por 24 h"
                />
                <Field
                  label="Purificación"
                  type="textarea"
                  value={p.metPurificacion}
                  onChange={set("metPurificacion")}
                  placeholder="Ej: Destilación fraccionada a presión reducida"
                />
                <Field
                  label="Caracterización del producto final"
                  type="textarea"
                  value={p.metProductoFinal}
                  onChange={set("metProductoFinal")}
                  placeholder="Ej: GC-FID para perfil de ésteres, RMN ¹H/¹³C para confirmación"
                />
              </div>
            </Section>

            <Section title="Condiciones operacionales" icon={Settings2}>
              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="Temperatura"
                  unit="°C"
                  type="number"
                  value={p.temperatura}
                  onChange={set("temperatura")}
                  placeholder="50–70"
                />
                <Field
                  label="Tiempo de reacción"
                  unit="min"
                  type="number"
                  value={p.tiempoReaccion}
                  onChange={set("tiempoReaccion")}
                  placeholder="30–120"
                />
                <Field
                  label="Velocidad de agitación"
                  unit="rpm"
                  type="number"
                  value={p.agitacion}
                  onChange={set("agitacion")}
                  placeholder="300–1200"
                />
                <Field
                  label="Presión"
                  type="select"
                  value={p.presion}
                  onChange={set("presion")}
                  options={[
                    { label: "Presión atmosférica (1 atm)", value: "1 atm" },
                    { label: "Presión atmosférica estándar", value: "Presión atmosférica" },
                    { label: "Vacío parcial (100–500 mbar)", value: "Vacío parcial" },
                    { label: "Presión controlada (2 atm)", value: "2 atm" },
                  ]}
                />
                <Field
                  label="Rendimiento obtenido"
                  unit="%"
                  type="number"
                  value={p.rendimiento}
                  onChange={set("rendimiento")}
                  placeholder="75–98"
                />
                <Field
                  label="Conversión estimada"
                  unit="%"
                  type="number"
                  value={p.conversion}
                  onChange={set("conversion")}
                  placeholder="80–99"
                />
              </div>
            </Section>
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={goPrev}
                className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2 text-sm font-heading font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.97]"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
                </svg>
                Anterior
              </button>
              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-heading font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97]"
              >
                Ver resultados
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </TabsContent>

          {/* ============ Análisis ============ */}
          <TabsContent value="analisis" className="mt-6 space-y-6">
            <Section
              title="Identificación del éster obtenido"
              icon={Atom}
              description="A partir de las materias primas y condiciones ingresadas, el sistema infiere el tipo de éster monoalquílico producido."
            >
              <div className="grid gap-6 md:grid-cols-2">
                <div className="grid gap-3 text-sm">
                  <p>
                    <Badge tone="info">{ester.abreviatura}</Badge> <strong>{ester.tipo}</strong>
                  </p>
                  <p>
                    <strong>Familia:</strong> {ester.familia}
                  </p>
                  <p>
                    <strong>Estructura:</strong> {ester.estructura}
                  </p>
                  <p>
                    <strong>Mecanismo predominante:</strong> {ester.mecanismo}
                  </p>
                  <p>
                    <strong>Influencia del alcohol:</strong> {ester.influenciaAlcohol}
                  </p>
                  <p>
                    <strong>Influencia del catalizador:</strong> {ester.influenciaCatalizador}
                  </p>
                  {p.catBasicoNombre && (
                    <div className="rounded-lg border border-border/60 bg-card p-3 text-xs">
                      <strong className="text-emerald-400">Formación del alcóxido activo:</strong>{" "}
                      {(() => {
                        const a = p.alcoholNombre.toLowerCase();
                        const b = p.catBasicoNombre.toLowerCase();
                        const alcoholOk = a.includes("metanol") ? "CH\u2083OH" :
                          a.includes("etanol") ? "C\u2082H\u2085OH" :
                          a.includes("propan") ? "C\u2083H\u2087OH" : "ROH";
                        const baseOk = b.includes("naoh") ? "NaOH" :
                          b.includes("koh") ? "KOH" :
                          b.includes("ch\u2083ona") || b.includes("ch3ona") ? "CH\u2083ONa" :
                          b.includes("ch\u2083ok") || b.includes("ch3ok") ? "CH\u2083OK" :
                          b.includes("c\u2082h\u2085ona") || b.includes("c2h5ona") ? "C\u2082H\u2085ONa" :
                          b.includes("c\u2082h\u2085ok") || b.includes("c2h5ok") ? "C\u2082H\u2085OK" :
                          p.catBasicoNombre;
                        const preformed = b.includes("ch\u2083ona") || b.includes("ch3ona") ||
                          b.includes("ch\u2083ok") || b.includes("ch3ok") ||
                          b.includes("c\u2082h\u2085ona") || b.includes("c2h5ona") ||
                          b.includes("c\u2082h\u2085ok") || b.includes("c2h5ok");
                        if (preformed) {
                          return <>{baseOk} ya contiene el alcóxido preformado (no requiere reacción con el alcohol). Es la especie activa que ataca nucleofílicamente el carbono carbonílico del triglicérido.</>;
                        }
                        return <>{baseOk} reacciona con {alcoholOk} para generar el alcóxido correspondiente in situ. Este alcóxido (RO\u207B) es el verdadero nucleófilo que ataca el carbono carbonílico del triglicérido e inicia la transesterificación.</>;
                      })()}
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <h3 className="mb-1 font-semibold text-emerald-500">Ventajas</h3>
                      <ul className="list-disc space-y-1 pl-5">
                        {ester.ventajas.map((v) => (
                          <li key={v}>{v}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold text-amber-500">Limitaciones</h3>
                      <ul className="list-disc space-y-1 pl-5">
                        {ester.limitaciones.map((v) => (
                          <li key={v}>{v}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 font-heading">
                    Estructura molecular 3D estimada
                  </p>
                  <EsterMolecule3D
                    alcoholName={p.alcoholNombre}
                    oilName={p.tipoAceite}
                    abreviature={ester.abreviatura}
                  />
                </div>
              </div>
            </Section>

            <Section title="Caracterización técnica estimada" icon={Factory}>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-heading mb-2 font-semibold">Propiedades físicas</h3>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-1">Propiedad</th>
                        <th>Valor</th>
                        <th>Método</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carac.fisicas.map((f) => (
                        <tr key={f.propiedad} className="border-t border-border">
                          <td className="py-1 pr-2">{f.propiedad}</td>
                          <td className="pr-2">{f.valor}</td>
                          <td className="text-muted-foreground">{f.metodo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 className="font-heading mb-2 font-semibold">Propiedades químicas</h3>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-1">Propiedad</th>
                        <th>Valor</th>
                        <th>Método</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carac.quimicas.map((q) => (
                        <tr key={q.propiedad} className="border-t border-border">
                          <td className="py-1 pr-2">{q.propiedad}</td>
                          <td className="pr-2">{q.valor}</td>
                          <td className="text-muted-foreground">{q.metodo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-6">
                <p className="mb-3 text-sm text-muted-foreground">
                  Perfil cualitativo estimado para{" "}
                  <strong className="text-foreground">{ester.abreviatura || "el éster"}</strong>
                  {p.alcoholNombre ? (
                    <>
                      {" "}con <strong className="text-foreground">{p.alcoholNombre}</strong>
                    </>
                  ) : null}
                  . Ejes calculados a partir del alcohol (C{p.alcoholNombre ? normalizeAlcohol(p.alcoholNombre).carbono : "?"}) y tipo de aceite (
                  {p.tipoAceite || "—"}).
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={dataRadar}>
                      <PolarGrid stroke={gridStroke} />
                      <PolarAngleAxis dataKey="eje" tick={{ fill: gridTick, fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: gridTick, fontSize: 10 }} stroke={gridStroke} />
                      <Radar
                        name="Perfil técnico"
                        dataKey="v"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Section>
          </TabsContent>

          {/* ============ Predicciones ============ */}
          <TabsContent value="predicciones" className="mt-6 space-y-6">
            <Section title="Resumen de predicciones" icon={BrainCircuit}>
              <div className="grid gap-5 md:grid-cols-3">
                {[
                  {
                    label: "Rendimiento estimado",
                    value: `${prediccion.resumen.rendimiento}%`,
                    icon: TrendingUp,
                    max: 100,
                    color: "text-primary",
                  },
                  {
                    label: "Conversión estimada",
                    value: `${prediccion.resumen.conversion}%`,
                    icon: Settings2,
                    max: 100,
                    color: "text-primary",
                  },
                  {
                    label: "Calidad global",
                    value: `${prediccion.resumen.calidadGlobal}/100`,
                    icon: Target,
                    max: 100,
                    color: "text-primary",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-heading text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {s.label}
                      </span>
                      <div className="flex h-7 w-7 items-center justify-center rounded border border-border/60 text-primary">
                        <s.icon className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <p className="font-heading text-3xl font-bold text-foreground">{s.value}</p>
                    <div className="mt-2 h-1 rounded bg-muted">
                      <div
                        className="h-full rounded bg-primary"
                        style={{
                          width: `${Math.min(100, (parseFloat(s.value) / s.max) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-primary" />
                  <strong>Compatibilidad con biodiésel:</strong>{" "}
                  {prediccion.biodieselCompatibilidad}% · Predicción generada el{" "}
                  {new Date(prediccion.timestamp).toLocaleString()}
                </div>
              </div>
            </Section>

            <Section title="Comparación gráfica: Predicción vs Biodiésel" icon={TrendingUp}>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataComparacionGrafica} barCategoryGap={12}>
                    <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} />
                    <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      iconType="circle"
                    />
                    <Bar
                      dataKey="Predicción"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      dataKey="Biodiésel"
                      fill="hsl(var(--chart-2))"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section title="Tabla de predicciones" icon={ClipboardList}>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary/8 text-left text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 pl-4 pr-4">Parámetro</th>
                        <th className="pr-4">Valor predicho</th>
                        <th className="pr-4">Referencia biodiésel</th>
                        <th className="pr-4">Confianza</th>
                        <th className="pr-4">Cumple</th>
                        <th className="pr-4">Explicación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prediccion.parametros.map((param, i) => {
                      const cumple = cumpleNorma(param);
                      return (
                        <tr
                          key={param.parametro}
                          className={`align-top transition-colors hover:bg-muted/40 ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                        >
                          <td className="py-3 pl-4 pr-4 font-medium">{param.parametro}</td>
                          <td className="pr-4">
                            <span className="font-semibold text-foreground">
                              {param.valorPredicho}
                            </span>{" "}
                            <span className="text-muted-foreground">{param.unidad}</span>
                          </td>
                          <td className="pr-4 text-muted-foreground">
                            {param.biodieselReferencia} {param.unidad}
                          </td>
                          <td className="pr-4">
                            <span className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                              {param.confianza}%
                            </span>
                          </td>
                          <td className="pr-4">
                            {cumple ? (
                              <span className="inline-flex items-center gap-1 rounded border border-success/30 px-1.5 py-0.5 text-xs font-medium text-success">
                                ✔ Cumple
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded border border-destructive/30 px-1.5 py-0.5 text-xs font-medium text-destructive">
                                ✘ No cumple
                              </span>
                            )}
                          </td>
                          <td className="pr-4 text-muted-foreground">{param.explicacion}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </Section>
          </TabsContent>

          {/* ============ Viabilidad y Estrategia (antes Comparación) ============ */}
          <TabsContent value="comparacion" className="mt-6 space-y-6">
            <Section
              title="Viabilidad y Estrategia — Compatibilidad con biodiésel FAME-NaOH"
              icon={TrendingUp}
            >
              {/* Score global */}
              <div className="flex flex-wrap items-center gap-8 rounded-lg border border-border bg-card p-5">
                <div className="flex flex-col items-center">
                    <span className="text-4xl font-bold text-foreground">
                    {compatStats.score}
                    <span className="text-2xl text-muted-foreground">%</span>
                  </span>
                  <Badge tone={compatStats.color} className="mt-1 text-sm">
                    {compatStats.nivel}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">{comparativa.length}</span>{" "}
                    propiedades evaluadas
                  </p>
                  <p>
                    <span className="font-semibold text-success">{compatStats.mejores}</span> Mejores{" "}
                    <span className="mx-2">·</span>
                    <span className="font-semibold text-primary">{compatStats.similares}</span>{" "}
                    Similares{" "}
                    <span className="mx-2">·</span>
                    <span className="font-semibold text-destructive">{compatStats.inferiores}</span>{" "}
                    Inferiores
                  </p>
                  {compatStats.mejores >= compatStats.inferiores ? (
                    <p className="mt-1 leading-relaxed">
                      El producto iguala o supera al biodiésel en la mayoría de las propiedades
                      evaluadas, lo que indica una alta compatibilidad técnica como sustituto o
                      complemento.
                    </p>
                  ) : (
                    <p className="mt-1 leading-relaxed">
                      El producto presenta desventajas en varias propiedades clave frente al
                      biodiésel convencional, aunque mantiene ventajas específicas que pueden
                      aprovecharse en nichos especializados.
                    </p>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Comparación cualitativa detallada" icon={ClipboardList}>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-left text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="bg-primary/8 py-3 pl-4 pr-2">Propiedad</th>
                        <th className="bg-primary/8 pr-2">Producto</th>
                        <th className="bg-primary/8 pr-2">Biodiésel</th>
                        <th className="bg-primary/8 pr-2">Juicio</th>
                        <th className="bg-primary/8 pr-4">Motivo técnico</th>
                      </tr>
                  </thead>
                  <tbody>
                    {comparativa.map((c, i) => (
                      <tr
                        key={c.propiedad}
                        className={`align-top transition-colors hover:bg-muted/40 ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                      >
                        <td className="py-2 pl-4 pr-2 font-medium">{c.propiedad}</td>
                        <td className="pr-2 font-semibold">{c.productoValor}</td>
                        <td className="pr-2 text-muted-foreground">{c.biodieselValor}</td>
                        <td className="pr-2">
                          <Badge
                            tone={
                              c.juicio === "Mejor"
                                ? "ok"
                                : c.juicio === "Similar"
                                  ? "info"
                                  : "bad"
                            }
                          >
                            {c.juicio}
                          </Badge>
                        </td>
                        <td className="text-muted-foreground">{c.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </Section>

            {(fortalezas.length > 0 || debilidades.length > 0) && (
              <Section title="Fortalezas vs Áreas de mejora" icon={Settings2}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-border p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-success">
                      <span>▲</span> Fortalezas
                    </h3>
                    {fortalezas.length > 0 ? (
                      <ul className="space-y-1.5">
                        {fortalezas.map((f) => (
                          <li key={f.propiedad} className="text-sm">
                            <span className="font-medium text-foreground">{f.propiedad}</span>
                            <p className="text-xs text-muted-foreground">{f.motivo}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        El producto no presenta ventajas significativas frente al biodiésel en
                        ninguna propiedad evaluada.
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-destructive">
                      <span>▼</span> Áreas de mejora
                    </h3>
                    {debilidades.length > 0 ? (
                      <ul className="space-y-1.5">
                        {debilidades.map((d) => (
                          <li key={d.propiedad} className="text-sm">
                            <span className="font-medium text-foreground">{d.propiedad}</span>
                            <p className="text-xs text-muted-foreground">{d.motivo}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        El producto iguala o supera al biodiésel en todas las propiedades evaluadas.
                      </p>
                    )}
                  </div>
                </div>
              </Section>
            )}

            <Section title="Impacto del alcohol seleccionado" icon={FlaskConical}>
              <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border text-primary">
                  <FlaskConical className="h-4 w-4" />
                </span>
                <div>
                  <p className="mb-1 font-heading text-sm font-semibold text-foreground">
                    Alcohol: {p.alcoholNombre || "—"}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {efectoAlcohol}
                  </p>
                </div>
              </div>
            </Section>

            <Section title="Recomendación estratégica" icon={Target}>
              <div className="rounded-lg border border-border bg-card p-5">
                <p className="text-sm leading-relaxed text-foreground/80">
                  {recomendacionEstrategica}
                </p>
              </div>
            </Section>
          </TabsContent>

          {/* ============ Mercado (FASE 5) ============ */}
          <TabsContent value="mercado" className="mt-6 space-y-6">
            <Section title="Identificación de oportunidades de mercado" icon={Target}>
              <div className="grid gap-4 md:grid-cols-2">
                {nichos.map((n) => (
                  <div
                    key={n.nombre}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-heading font-semibold text-foreground">{n.nombre}</h3>
                      <Badge
                        tone={
                          n.potencial === "Alto" ? "ok" : n.potencial === "Medio" ? "warn" : "bad"
                        }
                      >
                        {n.potencial} · {n.score}/100
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {n.justificacion}
                    </p>
                    <div className="mt-3 flex gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="text-success">▲</span>{" "}
                        <span className="text-muted-foreground">{n.ventajas}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-destructive">▼</span>{" "}
                        <span className="text-muted-foreground">{n.limitaciones}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataNichos} barCategoryGap={12}>
                    <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} />
                    <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={0} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar
                      dataKey="score"
                      name="Score de mercado"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-card p-5 text-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded bg-primary" />
                  <h3 className="font-heading font-medium text-primary">
                    Nicho recomendado: {recomendado.nombre}
                  </h3>
                </div>
                <p className="leading-relaxed text-foreground/80">{recomendado.justificacion}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {recomendado.ventajas} · {recomendado.limitaciones}
                </p>
              </div>
            </Section>
          </TabsContent>

          {/* ============ Informe (FASE 6) ============ */}
          <TabsContent value="informe" className="mt-6 space-y-6">
            <Section title="Generación del informe técnico" icon={FileText}>
              <p className="mb-4 text-sm text-muted-foreground">
                Genera un informe profesional estructurado (resumen ejecutivo, introducción,
                objetivos, metodología, fundamento químico, caracterización, comparación con
                biodiésel, ventajas/desventajas, nichos de mercado, propuesta comercial,
                conclusiones, recomendaciones y referencias) basado en todas las variables
                ingresadas.
              </p>
              <button
                onClick={generarPDF}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-heading font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97]"
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
