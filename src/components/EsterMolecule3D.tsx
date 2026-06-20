import { useMemo } from "react";

type EsterMolProps = {
  alcoholName: string;
  oilName: string;
  abreviature: string;
};

function grad(id: string, light: string, dark: string) {
  return (
    <radialGradient key={id} id={id} cx="32%" cy="28%" r="72%">
      <stop offset="0%" stopColor={light} />
      <stop offset="100%" stopColor={dark} />
    </radialGradient>
  );
}

function atom(cx: number, cy: number, r: number, g: string) {
  return <circle cx={cx} cy={cy} r={r} fill={`url(#${g})`} />;
}

function bnd(
  x1: number, y1: number, x2: number, y2: number,
  color: string, w = 3, double = false,
) {
  if (Math.abs(x2 - x1) < 0.1 && Math.abs(y2 - y1) < 0.1) return null;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = (-dy / len) * 2.2;
  const ny = (dx / len) * 2.2;
  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={w} strokeLinecap="round" />
      {double && (
        <line x1={x1 + nx} y1={y1 + ny} x2={x2 + nx} y2={y2 + ny} stroke={color} strokeWidth={w * 0.7} strokeLinecap="round" />
      )}
    </>
  );
}

function chain(
  sx: number, sy: number, angleRad: number, count: number,
  cGrad: string, hGrad: string, bClr: string, bhClr: string,
) {
  const spacing = 14;
  const items: React.ReactNode[] = [];
  let px = sx, py = sy;

  for (let i = 0; i < count; i++) {
    const off = i % 2 === 0 ? 0.5 : -0.5;
    const nx = px + Math.cos(angleRad + off) * spacing;
    const ny = py + Math.sin(angleRad + off) * spacing;
    items.push(
      <line key={`b${i}`} x1={px} y1={py} x2={nx} y2={ny} stroke={bClr} strokeWidth={3} strokeLinecap="round" />,
    );
    items.push(atom(nx, ny, 4.5, cGrad));
    px = nx; py = ny;
  }

  if (count === 0) { px = sx; py = sy; }

  const tx = px + Math.cos(angleRad) * 10;
  const ty = py + Math.sin(angleRad) * 10;
  items.push(
    <line key="tm0" x1={px} y1={py} x2={tx} y2={ty} stroke={bhClr} strokeWidth={1.8} strokeLinecap="round" />,
  );
  for (let j = 0; j < 3; j++) {
    const ha = angleRad + (j - 1) * 2.0;
    const hx = tx + Math.cos(ha) * 8;
    const hy = ty + Math.sin(ha) * 8;
    items.push(
      <line key={`th${j}`} x1={tx} y1={ty} x2={hx} y2={hy} stroke={bhClr} strokeWidth={1.4} strokeLinecap="round" />,
    );
    items.push(atom(hx, hy, 2.8, hGrad));
  }
  return items;
}

export default function EsterMolecule3D({ alcoholName, oilName, abreviature }: EsterMolProps) {
  const molecule = useMemo(() => {
    const a = alcoholName.toLowerCase();
    let carbons = 1;
    if (a.includes("metanol")) carbons = 1;
    else if (a.includes("etanol")) carbons = 2;
    else if (a.includes("propan")) carbons = 3;
    else if (a.includes("butan")) carbons = 4;
    else if (a.includes("isoprop")) carbons = 3;
    else if (a.includes("pentan")) carbons = 5;
    else carbons = 1;

    let oilCarbons = 17;
    const o = oilName.toLowerCase();
    if (o.includes("palma")) oilCarbons = 15;
    else if (o.includes("coco")) oilCarbons = 11;
    else oilCarbons = 17;

    const visibleOil = Math.min(oilCarbons, 8);
    const visibleAlc = Math.min(carbons, 4);

    const faC = "faC", faH = "faH";
    const ohC = "ohC", ohH = "ohH";
    const esC = "esC", esO = "esO", brO = "brO";

    const grads = [
      grad(faC, "#7dd3fc", "#0284c7"),
      grad(faH, "#f0f9ff", "#93c5fd"),
      grad(ohC, "#c4b5fd", "#7c3aed"),
      grad(ohH, "#f5f3ff", "#c4b5fd"),
      grad(esC, "#fcd34d", "#d97706"),
      grad(esO, "#fca5a5", "#dc2626"),
      grad(brO, "#fecaca", "#b91c1c"),
    ];

    const els: React.ReactNode[] = [...grads];
    const cx = 140, cy = 80;

    /* Fatty acid chain */
    els.push(...chain(cx, cy, 3.0, visibleOil, faC, faH, "#38bdf8", "#7dd3fc"));

    /* Carbonyl C=O */
    els.push(bnd(cx, cy, cx + 15, cy - 5, "#f59e0b", 3.5));
    els.push(bnd(cx, cy, cx + 5, cy - 20, "#f59e0b", 3, true));
    els.push(atom(cx + 15, cy - 5, 4, esC));
    els.push(atom(cx + 5, cy - 20, 5.5, esO));
    els.push(
      <text key="eo" x={cx + 5} y={cy - 26} fontSize={7} fill="#ef4444" fontFamily="Inter,sans-serif" fontWeight={700} textAnchor="middle">O</text>,
    );

    /* Bridge O */
    els.push(bnd(cx + 15, cy - 5, cx + 30, cy - 10, "#ef4444", 3.5));
    els.push(atom(cx + 30, cy - 10, 4.5, brO));
    els.push(
      <text key="bo" x={cx + 30} y={cy - 17} fontSize={7} fill="#ef4444" fontFamily="Inter,sans-serif" fontWeight={700} textAnchor="middle">O</text>,
    );

    /* Alcohol chain */
    els.push(...chain(cx + 30, cy - 10, 0.8, visibleAlc, ohC, ohH, "#a78bfa", "#c4b5fd"));

    /* Top text: abbreviation + alcohol/oil */
    els.push(
      <text key="abrev" x={10} y={20} fontSize={13} fill="var(--primary)" fontFamily="Outfit,sans-serif" fontWeight={700}>
        {abreviature}
      </text>,
      <text key="desc" x={10} y={34} fontSize={7} fill="#888" fontFamily="Inter,sans-serif">
        Alcohol: {alcoholName}  Aceite: {oilName}
      </text>,
    );

    /* Color legend — left side, below the molecule */
    const legend: { gid: string; label: string }[] = [
      { gid: faC, label: "Cadena grasa (R)" },
      { gid: ohC, label: "Cadena alcoh\u00F3lica (R')" },
      { gid: esC, label: "Grupo carbonilo (C=O)" },
      { gid: brO, label: "Puente \u00E9ster (O)" },
      { gid: faH, label: "Hidr\u00F3genos" },
    ];

    const ly = 140;
    legend.forEach(({ gid, label }, i) => {
      const yy = ly + i * 12;
      els.push(
        <circle key={`ld${i}`} cx={14} cy={yy + 2} r={3.5} fill={`url(#${gid})`} />,
        <text key={`lt${i}`} x={24} y={yy + 5} fontSize={6.5} fill="#aaa" fontFamily="Inter,sans-serif">{label}</text>,
      );
    });

    return { els, vb: "0 0 310 210" };
  }, [alcoholName, oilName, abreviature]);

  return (
    <div className="rounded-lg border border-border bg-card p-3" style={{ minHeight: 215 }}>
      <svg viewBox={molecule.vb} className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="ms" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx={1.5} dy={2.5} stdDeviation={3.5} floodColor="#000" floodOpacity={0.4} />
          </filter>
        </defs>
        <g filter="url(#ms)">
          {molecule.els}
        </g>
      </svg>
    </div>
  );
}
