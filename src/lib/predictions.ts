function normalizeAlcoholKey(name: string): string {
  const n = name.trim().toLowerCase();
  if (!n) return "";
  if (n.includes("metanol") || n === "ch3oh") return "metanol";
  if (n.includes("etanol") || n === "c2h5oh") return "etanol";
  if (n.includes("isoprop")) return "isopropanol";
  if (n.includes("propan")) return "propanol";
  if (n.includes("butan")) return "butanol";
  if (n.includes("pentan") || n === "c5h11oh") return "pentanol";
  if (n.includes("hexan") || n === "c6h13oh") return "hexanol";
  if (n.includes("octan") || n === "c8h17oh") return "octanol";
  return "";
}

function toNum(v: string): number {
  const parsed = parseFloat(v);
  return isNaN(parsed) ? 0 : parsed;
}

export type PrediccionParametro = {
  parametro: string;
  unidad: string;
  valorPredicho: number;
  biodieselReferencia: number;
  confianza: number;
  explicacion: string;
};

export type PrediccionOutput = {
  resumen: {
    rendimiento: number;
    conversion: number;
    calidadGlobal: number;
  };
  parametros: PrediccionParametro[];
  biodieselCompatibilidad: number;
  timestamp: string;
};

export function generatePredictions(
  tipoAceite: string,
  acidez: string,
  densidadAceite: string,
  humedad: string,
  alcoholNombre: string,
  catNombre: string,
  relacionMolar: string,
  temperatura: string,
  tiempoReaccion: string,
  agitacion: string,
): PrediccionOutput {
  const alcohol = normalizeAlcoholKey(alcoholNombre);
  const temp = toNum(temperatura);
  const time = toNum(tiempoReaccion);
  const agi = toNum(agitacion);
  const acid = toNum(acidez);
  const hum = toNum(humedad);
  const molRatio = toNum(relacionMolar.split(":")[1]) || toNum(relacionMolar);

  const factTemp = Math.min(1, Math.max(0.3, temp / 65));
  const factTime = Math.min(1, Math.max(0.3, time / 90));
  const factAgit = Math.min(1, Math.max(0.3, agi / 600));
  const factRatio = Math.min(1, Math.max(0.3, molRatio / 6));
  const factAcid = Math.max(0, 1 - acid / 5);
  const factHum = Math.max(0, 1 - hum / 0.5);

  const pHumedadPenalizacion = hum > 0.1 ? 0.85 : 1;
  const pAcidezPenalizacion = acid > 2 ? 0.8 : acid > 1 ? 0.9 : 1;
  const pAlcoholFactor =
    alcohol === "metanol"
      ? 1
      : alcohol === "etanol"
        ? 0.95
        : alcohol === "isopropanol"
          ? 0.88
          : 0.85;

  const catName = catNombre.trim().toLowerCase();
  const pCatalizadorFactor =
    catName.includes("naoh") || catName.includes("koh")
      ? 1.0
      : catName.includes("metóxido") || catName === "ch3ona" || catName === "ch3ok"
        ? 1.05
        : catName.includes("etóxido") || catName === "c2h5ona" || catName === "c2h5ok"
          ? 1.02
          : 0.9;

  const yieldEst =
    Math.round(
      (45 + 35 * factTemp + 10 * factTime + 5 * factAgit + 5 * factRatio) *
        pAcidezPenalizacion *
        pHumedadPenalizacion *
        pAlcoholFactor *
        pCatalizadorFactor *
        10,
    ) / 10;

  const convEst =
    Math.round(
      (50 + 30 * factTemp + 10 * factTime + 5 * factAgit + 5 * factRatio) *
        pAcidezPenalizacion *
        pHumedadPenalizacion *
        pAlcoholFactor *
        pCatalizadorFactor *
        10,
    ) / 10;

  const alcoholMap: Record<
    string,
    { densidad: number; viscosidad: number; inflamacion: number; calor: number }
  > = {
    metanol: { densidad: 882, viscosidad: 4.2, inflamacion: 135, calor: 38.5 },
    etanol: { densidad: 875, viscosidad: 4.8, inflamacion: 165, calor: 39.5 },
    propanol: { densidad: 870, viscosidad: 5.2, inflamacion: 170, calor: 40.0 },
    isopropanol: { densidad: 868, viscosidad: 5.5, inflamacion: 175, calor: 40.0 },
    butanol: { densidad: 865, viscosidad: 6.0, inflamacion: 180, calor: 40.5 },
    pentanol: { densidad: 862, viscosidad: 6.5, inflamacion: 185, calor: 41.0 },
    hexanol: { densidad: 860, viscosidad: 7.0, inflamacion: 190, calor: 41.5 },
    octanol: { densidad: 858, viscosidad: 8.0, inflamacion: 200, calor: 42.0 },
  };
  const alc = alcoholMap[alcohol] || alcoholMap.metanol;
  const densidadPredict = alc.densidad;
  const viscosidadPredict = alc.viscosidad;
  const inflamacionPredict = alc.inflamacion;
  const calorPredict = alc.calor;

  const calidadGlobal =
    Math.round(
      ((yieldEst / 100) * 25 +
        (convEst / 100) * 25 +
        Math.min(1, viscosidadPredict / 5) * 15 +
        Math.min(1, calorPredict / 40) * 15 +
        Math.min(1, Math.max(0, 1 - acid / 5)) * 10 +
        Math.min(1, Math.max(0, 1 - hum / 0.5)) * 10) *
        10,
    ) / 10;

  const bdCompatCount =
    (densidadPredict >= 860 && densidadPredict <= 900 ? 1 : 0) +
    (viscosidadPredict >= 3.5 && viscosidadPredict <= 5.5 ? 1 : 0) +
    (inflamacionPredict >= 120 ? 1 : 0) +
    (calorPredict >= 37 ? 1 : 0) +
    (acid < 1 ? 1 : 0) +
    (hum < 0.05 ? 1 : 0) +
    (pCatalizadorFactor >= 1 ? 1 : 0);

  const parametros: PrediccionParametro[] = [
    {
      parametro: "Rendimiento",
      unidad: "%",
      valorPredicho: yieldEst,
      biodieselReferencia: 96,
      confianza: Math.round(
        ((80 + 10 * factTemp + 10 * factTime) / (acid > 2 ? 1.2 : 1)) * pCatalizadorFactor,
      ),
      explicacion: `Estimado a partir de temperatura (${temp}°C), tiempo (${time}min), agitación (${agi}rpm), relación molar (${molRatio}:1), catalizador (${catNombre}) y calidad de materia prima.`,
    },
    {
      parametro: "Conversión",
      unidad: "%",
      valorPredicho: convEst,
      biodieselReferencia: 98,
      confianza: Math.round(
        ((75 + 15 * factTemp + 10 * factTime) / (acid > 2 ? 1.2 : 1)) * pCatalizadorFactor,
      ),
      explicacion: `Basado en condiciones de reacción, tipo de catalizador (${catNombre}) y pureza de reactivos. Correlación con rendimiento esperado.`,
    },
    {
      parametro: "Densidad",
      unidad: "kg/m³",
      valorPredicho: densidadPredict,
      biodieselReferencia: 880,
      confianza: 90,
      explicacion: `La densidad del ${alcoholNombre || "alcohol seleccionado"} determina la densidad final del éster.`,
    },
    {
      parametro: "Viscosidad cinemática",
      unidad: "cSt @40°C",
      valorPredicho: viscosidadPredict,
      biodieselReferencia: 4.5,
      confianza: 85,
      explicacion: `Viscosidad estimada según la longitud de cadena del alcohol empleado.`,
    },
    {
      parametro: "Punto de inflamación",
      unidad: "°C",
      valorPredicho: inflamacionPredict,
      biodieselReferencia: 130,
      confianza: 80,
      explicacion: `El punto de inflamación aumenta con alcoholes de cadena más larga.`,
    },
    {
      parametro: "Poder calorífico",
      unidad: "MJ/kg",
      valorPredicho: calorPredict,
      biodieselReferencia: 38,
      confianza: 85,
      explicacion: `Mayor contenido de carbono en alcoholes superiores incrementa el poder calorífico.`,
    },
    {
      parametro: "Índice de acidez estimado",
      unidad: "mg KOH/g",
      valorPredicho: Math.round((0.1 + acid * 0.08) * 10) / 10,
      biodieselReferencia: 0.5,
      confianza: 70,
      explicacion: `Estimado a partir del índice de acidez inicial (${acid} mg KOH/g).`,
    },
    {
      parametro: "Conductividad eléctrica",
      unidad: "pS/m",
      valorPredicho: alcohol === "metanol" ? 150 : alcohol === "etanol" ? 120 : 90,
      biodieselReferencia: 200,
      confianza: 75,
      explicacion: "La conductividad disminuye con alcoholes de cadena más larga.",
    },
    {
      parametro: "Estabilidad oxidativa",
      unidad: "h @110°C",
      valorPredicho:
        alcohol === "metanol" ? 6 : alcohol === "etanol" ? 7 : alcohol === "isopropanol" ? 8 : 9,
      biodieselReferencia: 6,
      confianza: 75,
      explicacion: "La estabilidad oxidativa mejora con alcoholes superiores.",
    },
  ];

  return {
    resumen: {
      rendimiento: yieldEst,
      conversion: convEst,
      calidadGlobal,
    },
    parametros,
    biodieselCompatibilidad: Math.round((bdCompatCount / 7) * 100),
    timestamp: new Date().toISOString(),
  };
}
